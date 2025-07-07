import express from 'express';
import autoMessageScheduler from '../services/autoMessageScheduler.service.js';
import queueManager from '../services/queueManager.service.js';
import messageConsumer from '../services/messageConsumer.service.js';
import rabbitmqService from '../services/rabbitmq.service.js';
import auth from '../middleware/auth.middleware.js';

const router = express.Router();

// Tüm otomatik mesaj sistemini başlat
router.post('/start-system', auth, async (req, res) => {
  try {
    await rabbitmqService.connect();
    
    autoMessageScheduler.startScheduler();
    queueManager.startScheduler();
    
    await messageConsumer.startConsumer();
    
    res.json({
      success: true,  
      message: 'Otomatik mesaj sistemi başarıyla başlatıldı',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sistem başlatma hatası',
      error: error.message
    });
  }
});

// Tüm otomatik mesaj sistemini durdur
router.post('/stop-system', auth, async (req, res) => {
  try {
    autoMessageScheduler.stopScheduler();
    queueManager.stopScheduler();
    
    await messageConsumer.stopConsumer();
    
    res.json({
      success: true,
      message: 'Otomatik mesaj sistemi durduruldu',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sistem durdurma hatası',
      error: error.message
    });
  }
});

// Sistem durumunu kontrol et
router.get('/status', auth, async (req, res) => {
  try {
    const [planningStatus, queueStatus, consumerStatus, queueInfo] = await Promise.all([
      autoMessageScheduler.getPlanningStatus(),
      queueManager.getQueueStatus(),
      messageConsumer.getConsumerStatus(),
      messageConsumer.getQueueInfo()
    ]);

    res.json({
      success: true,
      data: {
        planning: planningStatus,
        queue: queueStatus,
        consumer: consumerStatus,
        rabbitmq: {
          isConnected: rabbitmqService.isConnected(),
          queueInfo: queueInfo
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Durum kontrolü hatası',
      error: error.message
    });
  }
});

// Manuel planlama tetikle
router.post('/trigger-planning', auth, async (req, res) => {
  try {
    await autoMessageScheduler.triggerManualPlanning();
    
    res.json({
      success: true,
      message: 'Manuel planlama başlatıldı',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Manuel planlama hatası',
      error: error.message
    });
  }
});

// Manuel kuyruk işleme tetikle
router.post('/trigger-queue-processing', auth, async (req, res) => {
  try {
    await queueManager.triggerManualProcessing();
    
    res.json({
      success: true,
      message: 'Manuel kuyruk işleme başlatıldı',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Manuel kuyruk işleme hatası',
      error: error.message
    });
  }
});

// Belirli bir mesajı manuel olarak kuyruğa ekle
router.post('/queue-message/:autoMessageId', auth, async (req, res) => {
  try {
    const { autoMessageId } = req.params;
    await queueManager.queueSpecificMessage(autoMessageId);
    
    res.json({
      success: true,
      message: 'Mesaj kuyruğa eklendi',
      autoMessageId: autoMessageId,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mesaj kuyruğa ekleme hatası',
      error: error.message
    });
  }
});

// Belirli bir mesajı manuel olarak işle
router.post('/process-message/:autoMessageId', auth, async (req, res) => {
  try {
    const { autoMessageId } = req.params;
    await messageConsumer.processSpecificMessage(autoMessageId);
    
    res.json({
      success: true,
      message: 'Mesaj işlendi',
      autoMessageId: autoMessageId,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mesaj işleme hatası',
      error: error.message
    });
  }
});

// Test mesajı gönder
router.post('/send-test-message', auth, async (req, res) => {
  try {
    await messageConsumer.sendTestMessage();
    
    res.json({
      success: true,
      message: 'Test mesajı kuyruğa eklendi',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test mesajı gönderme hatası',
      error: error.message
    });
  }
});

// İstatistikler
router.get('/statistics', auth, async (req, res) => {
  try {
    const statistics = await messageConsumer.getStatistics();
    
    res.json({
      success: true,
      data: statistics,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstatistik alma hatası',
      error: error.message
    });
  }
});

// Kuyruk temizleme (sadece admin)
router.post('/clear-queue', auth, async (req, res) => {
  try {
    // Admin kontrolü (basit implementasyon)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    await queueManager.clearQueue();
    
    res.json({
      success: true,
      message: 'Kuyruk temizlendi',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kuyruk temizleme hatası',
      error: error.message
    });
  }
});

// Batch size ayarla
router.put('/batch-size', auth, async (req, res) => {
  try {
    const { batchSize } = req.body;
    
    if (!batchSize || batchSize < 1 || batchSize > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Batch size 1-1000 arası olmalıdır'
      });
    }

    queueManager.setBatchSize(batchSize);
    
    res.json({
      success: true,
      message: 'Batch size güncellendi',
      batchSize: batchSize,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Batch size güncelleme hatası',
      error: error.message
    });
  }
});

// RabbitMQ bağlantı durumu
router.get('/rabbitmq-status', auth, async (req, res) => {
  try {
    const isConnected = rabbitmqService.isConnected();
    const queueInfo = await rabbitmqService.getQueueInfo('message_sending_queue');
    
    res.json({
      success: true,
      data: {
        isConnected,
        queueInfo,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'RabbitMQ durum kontrolü hatası',
      error: error.message
    });
  }
});

export default router; 
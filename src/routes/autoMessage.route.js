import express from 'express';
import autoMessageScheduler from '../services/autoMessageScheduler.service.js';
import queueManager from '../services/queueManager.service.js';
import messageConsumer from '../services/messageConsumer.service.js';
import rabbitmqService from '../services/rabbitmq.service.js';
import auth from '../middleware/auth.middleware.js';
import { validateAutoMessageId } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStatus:
 *       type: object
 *       properties:
 *         planning:
 *           type: object
 *           properties:
 *             isRunning:
 *               type: boolean
 *             lastRun:
 *               type: string
 *               format: date-time
 *             nextRun:
 *               type: string
 *               format: date-time
 *         queue:
 *           type: object
 *           properties:
 *             isRunning:
 *               type: boolean
 *             lastRun:
 *               type: string
 *               format: date-time
 *             nextRun:
 *               type: string
 *               format: date-time
 *         consumer:
 *           type: object
 *           properties:
 *             isRunning:
 *               type: boolean
 *             lastProcessed:
 *               type: string
 *               format: date-time
 *             processedCount:
 *               type: integer
 *         rabbitmq:
 *           type: object
 *           properties:
 *             isConnected:
 *               type: boolean
 *             queueInfo:
 *               type: object
 *         timestamp:
 *           type: string
 *           format: date-time
 *     
 *     Statistics:
 *       type: object
 *       properties:
 *         totalMessages:
 *           type: integer
 *         processedMessages:
 *           type: integer
 *         failedMessages:
 *           type: integer
 *         successRate:
 *           type: number
 *         averageProcessingTime:
 *           type: number
 *         lastProcessedAt:
 *           type: string
 *           format: date-time
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/auto-message/start-system:
 *   post:
 *     summary: Otomatik mesaj sistemini başlat
 *     description: RabbitMQ bağlantısını kurar ve tüm otomatik mesaj servislerini başlatır
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sistem başarıyla başlatıldı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Otomatik mesaj sistemi başarıyla başlatıldı"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sistem başlatma hatası
 */
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

/**
 * @swagger
 * /api/auto-message/stop-system:
 *   post:
 *     summary: Otomatik mesaj sistemini durdur
 *     description: Tüm otomatik mesaj servislerini durdurur
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sistem başarıyla durduruldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Otomatik mesaj sistemi durduruldu"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sistem durdurma hatası
 */
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

/**
 * @swagger
 * /api/auto-message/status:
 *   get:
 *     summary: Sistem durumunu kontrol et
 *     description: Otomatik mesaj sisteminin tüm bileşenlerinin durumunu gösterir
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sistem durum bilgisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SystemStatus'
 *             example:
 *               success: true
 *               data:
 *                 planning:
 *                   isRunning: true
 *                   lastRun: "2024-01-15T10:00:00.000Z"
 *                   nextRun: "2024-01-15T11:00:00.000Z"
 *                 queue:
 *                   isRunning: true
 *                   lastRun: "2024-01-15T10:05:00.000Z"
 *                   nextRun: "2024-01-15T10:10:00.000Z"
 *                 consumer:
 *                   isRunning: true
 *                   lastProcessed: "2024-01-15T10:08:00.000Z"
 *                   processedCount: 150
 *                 rabbitmq:
 *                   isConnected: true
 *                   queueInfo:
 *                     messageCount: 25
 *                     consumerCount: 1
 *                 timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Durum kontrolü hatası
 */
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

/**
 * @swagger
 * /api/auto-message/trigger-planning:
 *   post:
 *     summary: Manuel planlama tetikle
 *     description: Otomatik mesaj planlamasını manuel olarak tetikler
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manuel planlama başlatıldı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Manuel planlama başlatıldı"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Manuel planlama hatası
 */
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

/**
 * @swagger
 * /api/auto-message/trigger-queue-processing:
 *   post:
 *     summary: Manuel kuyruk işleme tetikle
 *     description: Kuyruk işleme sürecini manuel olarak tetikler
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manuel kuyruk işleme başlatıldı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Manuel kuyruk işleme başlatıldı"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Manuel kuyruk işleme hatası
 */
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

/**
 * @swagger
 * /api/auto-message/queue-message/{autoMessageId}:
 *   post:
 *     summary: Belirli bir mesajı kuyruğa ekle
 *     description: Belirli bir otomatik mesajı manuel olarak kuyruğa ekler
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: autoMessageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kuyruğa eklenecek otomatik mesajın ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Mesaj kuyruğa eklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 autoMessageId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Mesaj kuyruğa eklendi"
 *               autoMessageId: "507f1f77bcf86cd799439011"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Mesaj kuyruğa ekleme hatası
 */
// Belirli bir mesajı manuel olarak kuyruğa ekle
router.post('/queue-message/:autoMessageId', auth, validateAutoMessageId, async (req, res) => {
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

/**
 * @swagger
 * /api/auto-message/process-message/{autoMessageId}:
 *   post:
 *     summary: Belirli bir mesajı işle
 *     description: Belirli bir otomatik mesajı manuel olarak işler
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: autoMessageId
 *         required: true
 *         schema:
 *           type: string
 *         description: İşlenecek otomatik mesajın ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Mesaj işlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 autoMessageId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Mesaj işlendi"
 *               autoMessageId: "507f1f77bcf86cd799439011"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Mesaj işleme hatası
 */
// Belirli bir mesajı manuel olarak işle
router.post('/process-message/:autoMessageId', auth, validateAutoMessageId, async (req, res) => {
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

/**
 * @swagger
 * /api/auto-message/send-test-message:
 *   post:
 *     summary: Test mesajı gönder
 *     description: Test amaçlı bir mesajı kuyruğa ekler
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test mesajı kuyruğa eklendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Test mesajı kuyruğa eklendi"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Test mesajı gönderme hatası
 */
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

/**
 * @swagger
 * /api/auto-message/statistics:
 *   get:
 *     summary: Sistem istatistiklerini al
 *     description: Otomatik mesaj sisteminin performans istatistiklerini gösterir
 *     tags: [Otomatik Mesaj]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sistem istatistikleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Statistics'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               data:
 *                 totalMessages: 1000
 *                 processedMessages: 950
 *                 failedMessages: 50
 *                 successRate: 95.0
 *                 averageProcessingTime: 2.5
 *                 lastProcessedAt: "2024-01-15T10:25:00.000Z"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: İstatistik alma hatası
 */
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
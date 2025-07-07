import cron from 'cron';
import winston from 'winston';
import AutoMessage from '../models/autoMessage.model.js';
import rabbitmqService from './rabbitmq.service.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/queueManager.log' })
  ]
});

class QueueManagerService {
  constructor() {
    this.scheduler = null;
    this.isRunning = false;
    this.batchSize = 50; // işelenecek max mesaj sayısı
  }

  // mesajları kuyruğa ekle
  async processReadyMessages() {
    if (this.isRunning) {
      logger.warn('Kuyruk işleme zaten çalışıyor, atlanıyor...');
      return;
    }

    this.isRunning = true;
    logger.info('Kuyruk işleme başladı');

    try {
      const now = new Date();
      
      const readyMessages = await AutoMessage.find({
        sendDate: { $lte: now },
        isQueued: false,
        isSent: false
      })
      .populate('senderId', 'username email')
      .populate('receiverId', 'username email')
      .populate('conversationId')
      .limit(this.batchSize)
      .sort({ sendDate: 1 });

      if (readyMessages.length === 0) {
        logger.info('Kuyruğa eklenecek hazır mesaj bulunamadı');
        return;
      }

      logger.info(`${readyMessages.length} hazır mesaj bulundu`);

      let successCount = 0;
      let errorCount = 0;

      for (const autoMessage of readyMessages) {
        try {
          const queueMessage = {
            id: autoMessage._id.toString(),
            senderId: autoMessage.senderId._id.toString(),
            receiverId: autoMessage.receiverId._id.toString(),
            content: autoMessage.content,
            conversationId: autoMessage.conversationId._id.toString(),
            sendDate: autoMessage.sendDate,
            createdAt: autoMessage.createdAt,
            type: 'auto_message'
          };
          // mesajları kuyruğa gönder
          await rabbitmqService.sendToQueue('message_sending_queue', queueMessage);

          await AutoMessage.findByIdAndUpdate(autoMessage._id, {
            isQueued: true,
            updatedAt: new Date()
          });

          successCount++;
          logger.info(`Mesaj kuyruğa eklendi: ${autoMessage._id}`);

        } catch (error) {
          errorCount++;
          logger.error(`Mesaj kuyruğa ekleme hatası (${autoMessage._id}):`, error);
        }
      }

      logger.info(`Kuyruk işleme tamamlandı - Başarılı: ${successCount}, Hatalı: ${errorCount}`);

      // istatistikler
      const totalQueued = await AutoMessage.countDocuments({
        isQueued: true,
        isSent: false
      });

      const totalPending = await AutoMessage.countDocuments({
        sendDate: { $lte: now },
        isQueued: false,
        isSent: false
      });

      logger.info(`Kuyruk durumu - Kuyrukta: ${totalQueued}, Bekleyen: ${totalPending}`);

    } catch (error) {
      logger.error('Kuyruk işleme hatası:', error);
    } finally {
      this.isRunning = false;
      logger.info('Kuyruk işleme tamamlandı');
    }
  }

  // cron job başlat
  startScheduler() {
    this.scheduler = new cron.CronJob(
      '0 * * * * *', // dakikada bir
      async () => {
        logger.debug('Cron job tetiklendi - Kuyruk işleme');
        await this.processReadyMessages();
      },
      null,
      false,
      'Europe/Istanbul'
    );

    this.scheduler.start();
    logger.info('Kuyruk yöneticisi başlatıldı (Her dakika)');
  }

  // cron job durdur
  stopScheduler() {
    if (this.scheduler) {
      this.scheduler.stop();
      logger.info('Kuyruk yöneticisi durduruldu');
    }
  }

  // manuel tetikleme
  async triggerManualProcessing() {
    logger.info('Manuel kuyruk işleme tetiklendi');
    await this.processReadyMessages();
  }

  // kuyruk durumunu kontrol et
  async getQueueStatus() {
    const now = new Date();
    
    const readyToQueue = await AutoMessage.countDocuments({
      sendDate: { $lte: now },
      isQueued: false,
      isSent: false
    });

    const inQueue = await AutoMessage.countDocuments({
      isQueued: true,
      isSent: false
    });

    const sentToday = await AutoMessage.countDocuments({
      sentAt: { 
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      },
      isSent: true
    });

    const totalPlanned = await AutoMessage.countDocuments({
      sendDate: { $gte: now },
      isQueued: false
    });

    return {
      readyToQueue,
      inQueue,
      sentToday,
      totalPlanned,
      isSchedulerRunning: this.scheduler?.running || false,
      isCurrentlyRunning: this.isRunning,
      batchSize: this.batchSize
    };
  }

  // batch size'ı ayarla
  setBatchSize(size) {
    if (size > 0 && size <= 1000) {
      this.batchSize = size;
      logger.info(`Batch size güncellendi: ${size}`);
    } else {
      logger.warn('Geçersiz batch size değeri (1-1000 arası olmalı)');
    }
  }

  // bir mesajı manuel olarak kuyruğa ekle
  async queueSpecificMessage(autoMessageId) {
    try {
      const autoMessage = await AutoMessage.findById(autoMessageId)
        .populate('senderId', 'username email')
        .populate('receiverId', 'username email')
        .populate('conversationId');

      if (!autoMessage) {
        throw new Error('AutoMessage bulunamadı');
      }

      if (autoMessage.isQueued) {
        throw new Error('Mesaj zaten kuyruğa eklenmiş');
      }

      if (autoMessage.isSent) {
        throw new Error('Mesaj zaten gönderilmiş');
      }

      const queueMessage = {
        id: autoMessage._id.toString(),
        senderId: autoMessage.senderId._id.toString(),
        receiverId: autoMessage.receiverId._id.toString(),
        content: autoMessage.content,
        conversationId: autoMessage.conversationId._id.toString(),
        sendDate: autoMessage.sendDate,
        createdAt: autoMessage.createdAt,
        type: 'auto_message'
      };

      await rabbitmqService.sendToQueue('message_sending_queue', queueMessage);

      await AutoMessage.findByIdAndUpdate(autoMessage._id, {
        isQueued: true,
        updatedAt: new Date()
      });

      logger.info(`Manuel kuyruk ekleme başarılı: ${autoMessageId}`);
      return true;

    } catch (error) {
      logger.error(`Manuel kuyruk ekleme hatası (${autoMessageId}):`, error);
      throw error;
    }
  }

  // kuyruk temizleme (test)
  async clearQueue() {
    try {
      await AutoMessage.updateMany(
        { isQueued: true, isSent: false },
        { isQueued: false }
      );
      
      logger.info('Kuyruk temizlendi');
      return true;
    } catch (error) {
      logger.error('Kuyruk temizleme hatası:', error);
      throw error;
    }
  }
}

export default new QueueManagerService(); 
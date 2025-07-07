import cron from 'cron';
import winston from 'winston';
import User from '../models/user.model.js';
import AutoMessage from '../models/autoMessage.model.js';
import Conversation from '../models/conversation.model.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/autoMessageScheduler.log' })
  ]
});

class AutoMessageSchedulerService {
  constructor() {
    this.scheduler = null;
    this.isRunning = false;
  }

  // rastgele mesaj içeriği oluştur
  getRandomMessageContent() {
    const messages = [
      "Merhaba! Nasılsın?",
      "Günaydın! Bugün nasıl geçiyor?",
      "İyi akşamlar! Umarım güzel bir gün geçirmişsindir.",
      "Selam! Ne yapıyorsun?",
      "Merhaba! Bugün hava nasıl?",
      "İyi günler! Nasıl gidiyor?",
      "Selamlar! Umarım iyisindir.",
      "Merhaba! Bugün planların neler?",
      "İyi akşamlar! Nasıl geçiyor günün?",
      "Selam! Ne haber?",
      "Merhaba! Bugün neler yaptın?",
      "İyi günler! Nasıl hissediyorsun?",
      "Selamlar! Bugün keyfin yerinde mi?",
      "Merhaba! Ne düşünüyorsun?",
      "İyi akşamlar! Bugün nasıl geçti?"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // kullanıcıları karıştır
  shuffleUsers(users) {
    const shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // kullanıcı çiftleri oluştur
  createUserPairs(users) {
    const pairs = [];
    const shuffledUsers = this.shuffleUsers(users);
    
    for (let i = 0; i < shuffledUsers.length - 1; i += 2) {
      pairs.push({
        sender: shuffledUsers[i],
        receiver: shuffledUsers[i + 1]
      });
    }
    if (shuffledUsers.length % 2 === 1) {
      pairs.push({
        sender: shuffledUsers[shuffledUsers.length - 1],
        receiver: shuffledUsers[0]
      });
    }
    
    return pairs;
  }

  // rastgele gönderim zamanı oluştur
  generateRandomSendTime() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startHour = 9;
    const endHour = 23;
    const randomHour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
    const randomMinute = Math.floor(Math.random() * 60);
    
    const sendTime = new Date(today);
    sendTime.setHours(randomHour, randomMinute, 0, 0);
    
    if (sendTime <= now) {
      sendTime.setDate(sendTime.getDate() + 1);
    }
    
    return sendTime;
  }

  // conversation oluştur veya getir
  async getOrCreateConversation(senderId, receiverId) {
    try {
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, receiverId],
          lastMessage: null,
          lastMessageAt: null
        });
        await conversation.save();
        logger.info(`Yeni konuşma oluşturuldu: ${conversation._id}`);
      }

      return conversation._id;
    } catch (error) {
      logger.error('Konuşma oluşturma/bulma hatası:', error);
      throw error;
    }
  }

  // otomatik mesaj planlama
  async planAutoMessages() {
    if (this.isRunning) {
      logger.warn('Planlama işlemi zaten çalışıyor, atlanıyor...');
      return;
    }

    this.isRunning = true;
    logger.info('Otomatik mesaj planlama başladı');

    try {
      const activeUsers = await User.find({ 
        isActive: true
      }).select('_id username email');

      if (activeUsers.length < 2) {
        logger.warn('Yeterli aktif kullanıcı bulunamadı (minimum 2 gerekli)');
        return;
      }

      logger.info(`${activeUsers.length} aktif kullanıcı bulundu`);

      const userPairs = this.createUserPairs(activeUsers);
      logger.info(`${userPairs.length} kullanıcı çifti oluşturuldu`);

      const autoMessages = [];
      
      for (const pair of userPairs) {
        try {
          const sendTime = this.generateRandomSendTime();
          const content = this.getRandomMessageContent();
          const conversationId = await this.getOrCreateConversation(pair.sender._id, pair.receiver._id);

          const autoMessage = new AutoMessage({
            senderId: pair.sender._id,
            receiverId: pair.receiver._id,
            content: content,
            sendDate: sendTime,
            conversationId: conversationId,
            isQueued: false,
            isSent: false
          });

          autoMessages.push(autoMessage);
        } catch (error) {
          logger.error(`Çift oluşturma hatası (${pair.sender._id} -> ${pair.receiver._id}):`, error);
        }
      }

      if (autoMessages.length > 0) {
        await AutoMessage.insertMany(autoMessages);
        logger.info(`${autoMessages.length} otomatik mesaj planlandı`);
      }

      const totalPlanned = await AutoMessage.countDocuments({ 
        sendDate: { $gte: new Date() },
        isQueued: false 
      });
      
      logger.info(`Toplam planlanmış mesaj sayısı: ${totalPlanned}`);

    } catch (error) {
      logger.error('Otomatik mesaj planlama hatası:', error);
    } finally {
      this.isRunning = false;
      logger.info('Otomatik mesaj planlama tamamlandı');
    }
  }

  // cron job başlat
  startScheduler() {
    this.scheduler = new cron.CronJob(
      '*/10 * * * *', // Her 10 dakikada bir
      async () => {
        logger.info('Cron job tetiklendi - Otomatik mesaj planlama');
        await this.planAutoMessages();
      },
      null,
      false,
      'Europe/Istanbul'
    );

    this.scheduler.start();
    logger.info('Otomatik mesaj planlayıcı başlatıldı (Her 10 dakikada bir)');
  }

  // cron job durdur
  stopScheduler() {
    if (this.scheduler) {
      this.scheduler.stop();
      logger.info('Otomatik mesaj planlayıcı durduruldu');
    }
  }

  // manuel planlama tetikle
  async triggerManualPlanning() {
    logger.info('Manuel planlama tetiklendi');
    await this.planAutoMessages();
  }

  // planlama durumunu getir
  async getPlanningStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const plannedToday = await AutoMessage.countDocuments({
      sendDate: { $gte: today, $lt: tomorrow },
      isQueued: false
    });

    const queuedToday = await AutoMessage.countDocuments({
      sendDate: { $gte: today, $lt: tomorrow },
      isQueued: true,
      isSent: false
    });

    const sentToday = await AutoMessage.countDocuments({
      sentAt: { $gte: today, $lt: tomorrow },
      isSent: true
    });

    return {
      plannedToday,
      queuedToday,
      sentToday,
      isSchedulerRunning: this.scheduler?.running || false,
      isCurrentlyRunning: this.isRunning
    };
  }
}

export default new AutoMessageSchedulerService(); 
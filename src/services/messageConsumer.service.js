import winston from 'winston';
import AutoMessage from '../models/autoMessage.model.js';
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import rabbitmqService from './rabbitmq.service.js';
import socketService from './socket.service.js';
import elasticsearchService from './elasticsearch.service.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/messageConsumer.log' })
  ]
});

class MessageConsumerService {
  constructor() {
    this.isRunning = false;
    this.consumerTag = null;
  }

  async processMessage(messageData) {
    try {
      logger.info(`Mesaj işleniyor: ${messageData.id}`);

      const autoMessage = await AutoMessage.findById(messageData.id)
        .populate('senderId', 'username email')
        .populate('receiverId', 'username email')
        .populate('conversationId');

      if (!autoMessage) {
        throw new Error(`AutoMessage bulunamadı: ${messageData.id}`);
      }

      if (autoMessage.isSent) {
        logger.warn(`Mesaj zaten gönderilmiş: ${messageData.id}`);
        return;
      }

      const newMessage = new Message({
        senderId: autoMessage.senderId._id,
        receiverId: autoMessage.receiverId._id,
        content: autoMessage.content,
        conversationId: autoMessage.conversationId._id,
        isAutoMessage: true,
        isRead: false
      });

      await newMessage.save();
      logger.info(`Yeni mesaj oluşturuldu: ${newMessage._id}`);

      await Conversation.findByIdAndUpdate(autoMessage.conversationId._id, {
        lastMessage: newMessage._id,
        lastMessageAt: new Date()
      });

      await AutoMessage.findByIdAndUpdate(autoMessage._id, {
        isSent: true,
        sentAt: new Date(),
        messageId: newMessage._id
      });

      // Elasticsearch'e indeksle
      try {
        const messageData = {
          _id: newMessage._id,
          content: autoMessage.content,
          senderId: autoMessage.senderId._id,
          receiverId: autoMessage.receiverId._id,
          conversationId: autoMessage.conversationId._id,
          isAutoMessage: true,
          isRead: false,
          createdAt: newMessage.createdAt,
          updatedAt: newMessage.updatedAt,
          senderUsername: autoMessage.senderId.username,
          receiverUsername: autoMessage.receiverId.username
        };

        await elasticsearchService.indexMessage(messageData);
      } catch (error) {
        logger.error('Elasticsearch indeksleme hatası:', error);
      }

      const messagePayload = {
        _id: newMessage._id,
        senderId: autoMessage.senderId._id,
        receiverId: autoMessage.receiverId._id,
        content: autoMessage.content,
        conversationId: autoMessage.conversationId._id,
        isAutoMessage: true,
        isRead: false,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt
      };

      socketService.sendToUser(autoMessage.receiverId._id.toString(), 'message_received', {
        message: messagePayload,
        sender: {
          _id: autoMessage.senderId._id,
          username: autoMessage.senderId.username,
          email: autoMessage.senderId.email
        }
      });

      socketService.sendToUser(autoMessage.senderId._id.toString(), 'message_sent', {
        message: messagePayload,
        receiver: {
          _id: autoMessage.receiverId._id,
          username: autoMessage.receiverId.username,
          email: autoMessage.receiverId.email
        }
      });

      logger.info(`Mesaj başarıyla işlendi ve gönderildi: ${messageData.id}`);

    } catch (error) {
      logger.error(`Mesaj işleme hatası (${messageData.id}):`, error);
      throw error; // Retry mekanizması için hatayı yeniden fırlat
    }
  }

  async startConsumer() {
    if (this.isRunning) {
      logger.warn('Consumer zaten çalışıyor');
      return;
    }

    try {
      logger.info('Mesaj consumer başlatılıyor...');

      if (!rabbitmqService.isConnected()) {
        await rabbitmqService.connect();
      }

      await rabbitmqService.consumeQueue('message_sending_queue', async (messageData) => {
        await this.processMessage(messageData);
      });

      this.isRunning = true;
      logger.info('Mesaj consumer başarıyla başlatıldı');

    } catch (error) {
      logger.error('Consumer başlatma hatası:', error);
      throw error;
    }
  }

  async stopConsumer() {
    if (!this.isRunning) {
      logger.warn('Consumer zaten durmuş');
      return;
    }

    try {
      if (rabbitmqService.channel && this.consumerTag) {
        await rabbitmqService.channel.cancel(this.consumerTag);
      }

      this.isRunning = false;
      this.consumerTag = null;
      logger.info('Mesaj consumer durduruldu');

    } catch (error) {
      logger.error('Consumer durdurma hatası:', error);
      throw error;
    }
  }

  getConsumerStatus() {
    return {
      isRunning: this.isRunning,
      isConnected: rabbitmqService.isConnected(),
      consumerTag: this.consumerTag
    };
  }

  async sendTestMessage() {
    try {
      const testMessage = {
        id: 'test-message-' + Date.now(),
        senderId: 'test-sender',
        receiverId: 'test-receiver',
        content: 'Bu bir test mesajıdır',
        conversationId: 'test-conversation',
        sendDate: new Date(),
        createdAt: new Date(),
        type: 'test_message'
      };

      await rabbitmqService.sendToQueue('message_sending_queue', testMessage);
      logger.info('Test mesajı kuyruğa eklendi');
      return true;

    } catch (error) {
      logger.error('Test mesajı gönderme hatası:', error);
      throw error;
    }
  }

  async getQueueInfo() {
    try {
      const queueInfo = await rabbitmqService.getQueueInfo('message_sending_queue');
      return {
        queueName: 'message_sending_queue',
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        isConnected: rabbitmqService.isConnected(),
        isConsumerRunning: this.isRunning
      };
    } catch (error) {
      logger.error('Kuyruk bilgisi alma hatası:', error);
      throw error;
    }
  }

  async processSpecificMessage(autoMessageId) {
    try {
      const autoMessage = await AutoMessage.findById(autoMessageId)
        .populate('senderId', 'username email')
        .populate('receiverId', 'username email')
        .populate('conversationId');

      if (!autoMessage) {
        throw new Error('AutoMessage bulunamadı');
      }

      if (autoMessage.isSent) {
        throw new Error('Mesaj zaten gönderilmiş');
      }

      const messageData = {
        id: autoMessage._id.toString(),
        senderId: autoMessage.senderId._id.toString(),
        receiverId: autoMessage.receiverId._id.toString(),
        content: autoMessage.content,
        conversationId: autoMessage.conversationId._id.toString(),
        sendDate: autoMessage.sendDate,
        createdAt: autoMessage.createdAt,
        type: 'auto_message'
      };

      await this.processMessage(messageData);
      logger.info(`Manuel mesaj işleme başarılı: ${autoMessageId}`);
      return true;

    } catch (error) {
      logger.error(`Manuel mesaj işleme hatası (${autoMessageId}):`, error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sentToday = await AutoMessage.countDocuments({
        sentAt: { $gte: today, $lt: tomorrow },
        isSent: true
      });

      const inQueue = await AutoMessage.countDocuments({
        isQueued: true,
        isSent: false
      });

      const pending = await AutoMessage.countDocuments({
        sendDate: { $lte: new Date() },
        isQueued: false,
        isSent: false
      });

      const totalAutoMessages = await AutoMessage.countDocuments();

      return {
        sentToday,
        inQueue,
        pending,
        totalAutoMessages,
        isConsumerRunning: this.isRunning,
        isConnected: rabbitmqService.isConnected()
      };

    } catch (error) {
      logger.error('İstatistik alma hatası:', error);
      throw error;
    }
  }
}

export default new MessageConsumerService(); 
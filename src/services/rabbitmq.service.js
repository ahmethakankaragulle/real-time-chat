import amqp from 'amqplib';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/rabbitmq.log' })
  ]
});

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; 
  }

  async connect() {
    try {
      let rabbitmqUrl = process.env.RABBITMQ_URL;
      
      if (!rabbitmqUrl) {
        console.log(`RabbitMQ url env de bulunamadı: ${rabbitmqUrl}`);
        rabbitmqUrl = 'amqp://admin:admin123@localhost:8080';
      }
      
      console.log(`RabbitMQ bağlantısı deneniyor: ${rabbitmqUrl}`);
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      await this.channel.assertQueue('message_sending_queue', {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, 
          'x-dead-letter-exchange': 'message_dlx',
          'x-dead-letter-routing-key': 'message_retry'
        }
      });

      await this.channel.assertExchange('message_dlx', 'direct', { durable: true });
      await this.channel.assertQueue('message_retry_queue', { durable: true });
      await this.channel.bindQueue('message_retry_queue', 'message_dlx', 'message_retry');

      logger.info('RabbitMQ bağlantısı başarılı');
      this.retryCount = 0;
    } catch (error) {
      logger.error('RabbitMQ bağlantı hatası:', error);
      await this.handleConnectionError();
    }
  }

  async handleConnectionError() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.info(`RabbitMQ yeniden bağlanma denemesi ${this.retryCount}/${this.maxRetries}`);
      
      setTimeout(async () => {
        await this.connect();
      }, this.retryDelay * this.retryCount);
    } else {
      logger.error('Maksimum yeniden bağlanma denemesi aşıldı');
      throw new Error('RabbitMQ bağlantısı kurulamadı');
    }
  }

  async sendToQueue(queueName, message) {
    try {
      if (!this.channel || !this.isConnected()) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('RabbitMQ channel oluşturulamadı');
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      const result = await this.channel.sendToQueue(queueName, messageBuffer, {
        persistent: true,
        headers: {
          'x-retry-count': 0
        }
      });

      logger.info(`Mesaj kuyruğa eklendi: ${queueName}`, {
        messageId: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId
      });

      return result;
    } catch (error) {
      logger.error('Kuyruğa mesaj gönderme hatası:', error);
      throw error;
    }
  }

  async consumeQueue(queueName, callback) {
    try {
      if (!this.channel || !this.isConnected()) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('RabbitMQ channel oluşturulamadı');
      }

      await this.channel.consume(queueName, async (msg) => {
        if (msg) {
          try {
            const message = JSON.parse(msg.content.toString());
            logger.info(`Kuyruktan mesaj alındı: ${queueName}`, {
              messageId: message.id,
              senderId: message.senderId,
              receiverId: message.receiverId
            });

            await callback(message);
            this.channel.ack(msg);
            
            logger.info(`Mesaj başarıyla işlendi: ${message.id}`);
          } catch (error) {
            logger.error('Mesaj işleme hatası:', error);
            
            const retryCount = (msg.properties.headers['x-retry-count'] || 0) + 1;
            
            if (retryCount < 3) {
              const retryMessage = {
                ...JSON.parse(msg.content.toString()),
                retryCount
              };
              
              await this.channel.sendToQueue('message_retry_queue', Buffer.from(JSON.stringify(retryMessage)), {
                persistent: true,
                headers: {
                  'x-retry-count': retryCount
                }
              });
              
              this.channel.ack(msg);
              logger.info(`Mesaj retry kuyruğuna gönderildi (deneme ${retryCount}/3)`);
            } else {
              this.channel.nack(msg, false, false);
              logger.error(`Mesaj maksimum retry sayısını aştı: ${message.id}`);
            }
          }
        }
      });

      logger.info(`Kuyruk dinlemeye başlandı: ${queueName}`);
    } catch (error) {
      logger.error('Kuyruk dinleme hatası:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ bağlantısı kapatıldı');
    } catch (error) {
      logger.error('RabbitMQ bağlantısı kapatma hatası:', error);
    }
  }

  isConnected() {
    return this.connection && this.channel && !this.connection.closed;
  }

  async getQueueInfo(queueName) {
    try {
      if (!this.channel) {
        await this.connect();
      }
      
      const queueInfo = await this.channel.checkQueue(queueName);
      return queueInfo;
    } catch (error) {
      logger.error('Kuyruk bilgisi alma hatası:', error);
      throw error;
    }
  }
}

export default new RabbitMQService(); 
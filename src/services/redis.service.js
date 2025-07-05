import redis from 'redis';
import winston from 'winston';

class RedisService {
  constructor() {
    this.client = null;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()]
    });
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.info('Redis bağlantısı başarılı');
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('Redis bağlantı hatası:', error);
      throw error;
    }
  }

  async addOnlineUser(userId) {
    try {
      await this.client.sAdd('online_users', userId.toString());
      this.logger.info(`Kullanıcı online: ${userId}`);
    } catch (error) {
      this.logger.error('Online kullanıcı ekleme hatası:', error);
    }
  }

  async removeOnlineUser(userId) {
    try {
      await this.client.sRem('online_users', userId.toString());
      this.logger.info(`Kullanıcı offline: ${userId}`);
    } catch (error) {
      this.logger.error('Online kullanıcı silme hatası:', error);
    }
  }

  async isUserOnline(userId) {
    try {
      return await this.client.sIsMember('online_users', userId.toString());
    } catch (error) {
      this.logger.error('Kullanıcı online durumu kontrol hatası:', error);
      return false;
    }
  }

  async getOnlineUsers() {
    try {
      return await this.client.sMembers('online_users');
    } catch (error) {
      this.logger.error('Online kullanıcı listesi alma hatası:', error);
      return [];
    }
  }

  async getOnlineUserCount() {
    try {
      return await this.client.sCard('online_users');
    } catch (error) {
      this.logger.error('Online kullanıcı sayısı alma hatası:', error);
      return 0;
    }
  }

  async setCache(key, value, ttl = 3600) {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error('Cache set hatası:', error);
    }
  }

  async getCache(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error('Cache get hatası:', error);
      return null;
    }
  }

  async deleteCache(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Cache delete hatası:', error);
    }
  }

  async setSession(sessionId, userData, ttl = 86400) {
    try {
      await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(userData));
    } catch (error) {
      this.logger.error('Session set hatası:', error);
    }
  }

  async getSession(sessionId) {
    try {
      const value = await this.client.get(`session:${sessionId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error('Session get hatası:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      this.logger.error('Session delete hatası:', error);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis bağlantısı kapatıldı');
    }
  }
}

export default new RedisService(); 
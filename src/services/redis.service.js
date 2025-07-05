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

  async setUserOnline(userId, socketId) {
    try {
      const userKey = `user:${userId}`;
      const userData = {
        userId: userId.toString(),
        socketId: socketId,
        onlineAt: new Date().toISOString(),
        isOnline: true
      };
      
      await this.client.setEx(userKey, 3600, JSON.stringify(userData));

      await this.addOnlineUser(userId);
      
      this.logger.info(`Kullanıcı online: ${userId} - Socket: ${socketId}`);
    } catch (error) {
      this.logger.error('Kullanıcı online set hatası:', error);
    }
  }

  async setUserOffline(userId) {
    try {
      const userKey = `user:${userId}`;
      await this.client.del(userKey);

      await this.removeOnlineUser(userId);
      
      this.logger.info(`Kullanıcı offline: ${userId}`);
    } catch (error) {
      this.logger.error('Kullanıcı offline set hatası:', error);
    }
  }

  async getUserSocketId(userId) {
    try {
      const userKey = `user:${userId}`;
      const userData = await this.client.get(userKey);
      
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.socketId;
      }
      
      return null;
    } catch (error) {
      this.logger.error('Kullanıcı socket ID alma hatası:', error);
      return null;
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

  async addToBlacklist(token, expiresIn) {
    try { 
      const ttl = Math.ceil(expiresIn / 1000);
      await this.client.setEx(`blacklist:${token}`, ttl, '1');
      this.logger.info(`Token blacklist'e eklendi: ${token.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error('Token blacklist ekleme hatası:', error);
    }
  }

  async isTokenBlacklisted(token) {
    try {
      const exists = await this.client.exists(`blacklist:${token}`);
      return exists === 1;
    } catch (error) {
      this.logger.error('Token blacklist kontrol hatası:', error);
      return false;
    }
  }

  async removeFromBlacklist(token) {
    try {
      await this.client.del(`blacklist:${token}`);
      this.logger.info(`Token blacklist'ten kaldırıldı: ${token.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error('Token blacklist silme hatası:', error);
    }
  }

  async clearExpiredBlacklist() {
    try {
      this.logger.info('Blacklist temizlik işlemi tamamlandı');
    } catch (error) {
      this.logger.error('Blacklist temizlik hatası:', error);
    }
  }

  async getBlacklistCount() {
    try {
      const keys = await this.client.keys('blacklist:*');
      return keys.length;
    } catch (error) {
      this.logger.error('Blacklist sayısı alma hatası:', error);
      return 0;
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
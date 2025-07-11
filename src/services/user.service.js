import User from '../models/user.model.js';
import redisService from './redis.service.js';
import elasticsearchService from './elasticsearch.service.js';

class UserService {
  // kullanıcıları listele
  async getUsersList(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const users = await User.find({ isActive: true })
      .select('username email lastSeen')
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ isActive: true });

    const usersWithOnlineStatus = await Promise.all(
      users.map(async (user) => {
        const isOnline = await redisService.isUserOnline(user._id);
        return {
          ...user.toObject(),
          isOnline
        };
      })
    );

    return {
      users: usersWithOnlineStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // online kullanıcıları getir
  async getOnlineUsers() {
    const onlineUserIds = await redisService.getOnlineUsers();
    const onlineCount = await redisService.getOnlineUserCount();

    const onlineUsers = await Promise.all(
      onlineUserIds.map(async (userId) => {
        const user = await User.findById(userId).select('username email lastSeen');
        return user ? user.toObject() : null;
      })
    );

    const validOnlineUsers = onlineUsers.filter(user => user !== null);

    return {
      onlineUsers: validOnlineUsers,
      onlineCount
    };
  }

  // online kullanıcıları aktiviteye göre getir
  async getOnlineUsersWithActivity(userId) {
    await this.updateUserLastSeen(userId);
    
    return await this.getOnlineUsers();
  }

  // kullanıcıları listele
  async getUsersListWithActivity(userId, page = 1, limit = 20) {
    await this.updateUserLastSeen(userId);
    
    return await this.getUsersList(page, limit);
  }

  // kullanıcının son görünüm zamanını güncelle
  async updateUserLastSeen(userId) {
    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date()
    });
  }

  // kullanıcının aktivitesini güncelle
  async updateUserActivity(userId) {
    await redisService.addOnlineUser(userId);
    
    await this.updateUserLastSeen(userId);
  }

  // kullanıcı profilini güncelle
  async updateUserProfile(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // elasticsearch
    try {
      await elasticsearchService.updateUser(userId.toString(), updateData);
    } catch (error) {
      console.error('Elasticsearch kullanıcı güncelleme hatası:', error);
    }

    return user;
  }
}

export default new UserService();

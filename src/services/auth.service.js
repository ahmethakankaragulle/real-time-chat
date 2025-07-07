import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import redisService from './redis.service.js';

class AuthService {

  async registerUser(username, email, password) {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      throw new Error('Bu email veya kullanıcı adı zaten kullanımda');
    }

    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      accessToken,
      refreshToken
    };
  }

  async loginUser(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Geçersiz email veya şifre');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Geçersiz email veya şifre');
    }

    if (!user.isActive) {
      throw new Error('Hesabınız devre dışı');
    }

    user.lastSeen = new Date();
    await user.save();

    await redisService.addOnlineUser(user._id);

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      accessToken,
      refreshToken
    };
  }

  async refreshToken(refreshToken, oldAccessToken = null) {
    const isBlacklisted = await redisService.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new Error('Geçersiz refresh token');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('Geçersiz refresh token');
    }


    if (oldAccessToken) {
      try {
        const decodedAccess = jwt.decode(oldAccessToken);
        if (decodedAccess && decodedAccess.exp) {
          const expiresIn = (decodedAccess.exp * 1000) - Date.now();
          if (expiresIn > 0) {
            await redisService.addToBlacklist(oldAccessToken, expiresIn);
          }
        }
      } catch (error) {
        console.error('Eski access token blacklist ekleme hatası:', error);
      }
    }

    // Eski refresh token'ı da blacklist'e ekle
    try {
      const decodedRefresh = jwt.decode(refreshToken);
      if (decodedRefresh && decodedRefresh.exp) {
        const expiresIn = (decodedRefresh.exp * 1000) - Date.now();
        if (expiresIn > 0) {
          await redisService.addToBlacklist(refreshToken, expiresIn);
        }
      }
    } catch (error) {
      console.error('Eski refresh token blacklist ekleme hatası:', error);
    }

    // Yeni token'ları oluştur
    const newAccessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  async logoutUser(userId, accessToken, refreshToken = null) {
    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date()
    });
    
    await redisService.removeOnlineUser(userId);

    // Access token'ı blacklist'e ekle
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.exp) {
          const expiresIn = (decoded.exp * 1000) - Date.now();
          if (expiresIn > 0) {
            await redisService.addToBlacklist(accessToken, expiresIn);
          }
        }
      } catch (error) {
        console.error('Access token blacklist ekleme hatası:', error);
      }
    }

    // Refresh token'ı da blacklist'e ekle (eğer varsa)
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded && decoded.exp) {
          const expiresIn = (decoded.exp * 1000) - Date.now();
          if (expiresIn > 0) {
            await redisService.addToBlacklist(refreshToken, expiresIn);
          }
        }
      } catch (error) {
        console.error('Refresh token blacklist ekleme hatası:', error);
      }
    }
  }

  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    return user;
  }

  validatePassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalı');
    }
  }

  validateLoginData(email, password) {
    if (!email || !password) {
      throw new Error('Email ve şifre gerekli');
    }
  }

  validateRegisterData(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('Tüm alanlar gerekli');
    }
    this.validatePassword(password);
  }
}

export default new AuthService();

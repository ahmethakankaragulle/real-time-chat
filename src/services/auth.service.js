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

  async refreshToken(refreshToken) {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('Geçersiz refresh token');
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return {
      accessToken: newAccessToken
    };
  }

  async logoutUser(userId) {
    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date()
    });
    
    await redisService.removeOnlineUser(userId);
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

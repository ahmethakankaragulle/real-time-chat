import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import userService from '../services/user.service.js';
import redisService from '../services/redis.service.js';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token gerekli' 
      });
    }

    const token = authHeader.substring(7);
    
    const isBlacklisted = await redisService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token geçersiz' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Geçersiz token' 
      });
    }

    await userService.updateUserActivity(user._id);

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Geçersiz token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token süresi dolmuş' 
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası' 
    });
  }
};

export default auth; 
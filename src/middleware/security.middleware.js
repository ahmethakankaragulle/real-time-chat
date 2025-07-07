import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';

// Rate limiting konfigürasyonu
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Auth endpoint'leri için özel rate limit
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 istek
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Register endpoint'i için daha sıkı rate limit
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // 3 istek
  message: {
    success: false,
    message: 'Çok fazla kayıt denemesi. Lütfen 1 saat sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API endpoint'leri için rate limit
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 1000, // 1000 istek
  message: {
    success: false,
    message: 'API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Helmet konfigürasyonu
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// CORS konfigürasyonu
export const corsConfig = cors({
  origin: function (origin, callback) {
    // Geliştirme ortamında tüm origin'lere izin ver
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Üretim ortamında sadece belirli domain'lere izin ver
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 saat
});

// XSS koruması
export const xssProtection = xss();

// HTTP Parameter Pollution koruması
export const hppProtection = hpp({
  whitelist: [
    'filter',
    'sort',
    'page',
    'limit',
    'fields'
  ]
});

// Güvenlik middleware'lerini birleştiren fonksiyon
export const setupSecurityMiddleware = (app) => {
  // Helmet
  app.use(helmetConfig);
  
  // CORS
  app.use(corsConfig);
  
  // XSS koruması
  app.use(xssProtection);
  
  // HPP koruması
  app.use(hppProtection);
  
  // Genel rate limiting
  app.use('/api/', apiRateLimit);
  
  // Auth endpoint'leri için özel rate limiting
  app.use('/api/v1/auth/login', authRateLimit);
  app.use('/api/v1/auth/register', registerRateLimit);
  
  // Güvenlik başlıkları
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
};

export default {
  createRateLimit,
  authRateLimit,
  registerRateLimit,
  apiRateLimit,
  helmetConfig,
  corsConfig,
  xssProtection,
  hppProtection,
  setupSecurityMiddleware
}; 
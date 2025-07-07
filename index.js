import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import redisService from './src/services/redis.service.js';
import socketService from './src/services/socket.service.js';
import userRoute from './src/routes/user.route.js';
import authRoute from './src/routes/auth.route.js';
import conversationRoute from './src/routes/conversation.route.js';
import messageRoute from './src/routes/message.route.js';
import autoMessageRoute from './src/routes/autoMessage.route.js';
import searchRoute from './src/routes/search.route.js';
import authMiddleware from './src/middleware/auth.middleware.js';
import { setupSecurityMiddleware } from './src/middleware/security.middleware.js';
import { sanitizeInput, sqlInjectionProtection } from './src/middleware/validation.middleware.js';
import swaggerSpec from './src/config/swagger.config.js';
import autoMessageScheduler from './src/services/autoMessageScheduler.service.js';
import queueManager from './src/services/queueManager.service.js';
import messageConsumer from './src/services/messageConsumer.service.js';
import rabbitmqService from './src/services/rabbitmq.service.js';
import elasticsearchService from './src/services/elasticsearch.service.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO'yu başlat
socketService.initialize(server);

// Güvenlik middleware'lerini kur
setupSecurityMiddleware(app);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization ve SQL injection koruması
app.use(sanitizeInput);
app.use(sqlInjectionProtection);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/user', authMiddleware, userRoute);
app.use('/api/v1/conversations', authMiddleware, conversationRoute);
app.use('/api/v1/messages', authMiddleware, messageRoute);
app.use('/api/v1/auto-messages', autoMessageRoute);
app.use('/api/v1/search', searchRoute);

app.get('/healthcheck', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    connectedUsers: socketService.getConnectedUsersCount()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  
  // Validation hatası
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation hatası',
      errors: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  // MongoDB duplicate key hatası
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} zaten kullanımda`
    });
  }
  
  // JWT hatası
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
  
  // JWT süresi dolmuş
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token süresi dolmuş'
    });
  }
  
  // CORS hatası
  if (error.message === 'CORS policy violation') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  // Genel hata
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Sunucu hatası' : error.message
  });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/live-chat')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

redisService.connect()
  .then(() => console.log('Redis bağlantısı başarılı'))
  .catch(err => console.error('Redis bağlantı hatası:', err));

// Elasticsearch bağlantısını kur
elasticsearchService.connect()
  .then(() => console.log('Elasticsearch bağlantısı başarılı'))
  .catch(err => console.warn('Elasticsearch bağlantı hatası (opsiyonel):', err.message));

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
  console.log(`Socket.IO sunucusu başlatıldı`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  
  // Otomatik mesaj sistemini başlat
  try {
    console.log('Otomatik mesaj sistemi başlatılıyor...');
    
    // Cron job'ları başlat (RabbitMQ'dan bağımsız)
    autoMessageScheduler.startScheduler();
    queueManager.startScheduler();
    console.log('Cron job\'lar başlatıldı');
    
    // RabbitMQ bağlantısını kur ve consumer'ı başlat
    try {
      await rabbitmqService.connect();
      console.log('RabbitMQ bağlantısı kuruldu');
      
      await messageConsumer.startConsumer();
      console.log('Mesaj consumer başlatıldı');
      
      console.log('✅ Otomatik mesaj sistemi tam olarak başlatıldı');
    } catch (rabbitmqError) {
      console.warn('⚠️ RabbitMQ bağlantısı kurulamadı, sistem kısmi olarak çalışacak');
      console.warn('RabbitMQ bağlantısı kurulduğunda sistem otomatik olarak tamamlanacak');
      console.warn(rabbitmqError.message);
    }
  } catch (error) {
    console.error('❌ Otomatik mesaj sistemi başlatma hatası:', error);
  }
});

export default app; 
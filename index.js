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
import authMiddleware from './src/middleware/auth.middleware.js';
import swaggerSpec from './src/config/swagger.config.js';
import autoMessageScheduler from './src/services/autoMessageScheduler.service.js';
import queueManager from './src/services/queueManager.service.js';
import messageConsumer from './src/services/messageConsumer.service.js';
import rabbitmqService from './src/services/rabbitmq.service.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO'yu başlat
socketService.initialize(server);

// CORS ayarları - tüm isteklere izin ver
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/user', authMiddleware, userRoute);
app.use('/api/v1/conversations', authMiddleware, conversationRoute);
app.use('/api/v1/messages', authMiddleware, messageRoute);
app.use('/api/v1/auto-messages', autoMessageRoute);

app.get('/healthcheck', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    connectedUsers: socketService.getConnectedUsersCount()
  });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/live-chat')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

redisService.connect()
  .then(() => console.log('Redis bağlantısı başarılı'))
  .catch(err => console.error('Redis bağlantı hatası:', err));

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
  console.log(`Socket.IO sunucusu başlatıldı`);
  
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
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import redisService from './src/services/redis.service.js';
import userRoute from './src/routes/user.route.js';
import authRoute from './src/routes/auth.route.js';
import authMiddleware from './src/middleware/auth.middleware.js';
import swaggerSpec from './src/config/swagger.config.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoute);
app.use('/api/user', authMiddleware, userRoute);

app.get('/healthcheck', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/live-chat')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

redisService.connect()
  .then(() => console.log('Redis bağlantısı başarılı'))
  .catch(err => console.error('Redis bağlantı hatası:', err));


const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});

export default app; 
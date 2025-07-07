# 🚀 Real-Time Chat Uygulaması

Modern, ölçeklenebilir ve güvenli gerçek zamanlı sohbet uygulaması. Socket.IO, MongoDB, Redis, RabbitMQ ve Elasticsearch teknolojilerini kullanarak geliştirilmiştir.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknolojiler](#-teknolojiler)
- [Kurulum](#-kurulum)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Socket.IO Events](#-socketio-events)
- [Otomatik Mesaj Sistemi](#-otomatik-mesaj-sistemi)
- [Arama Sistemi](#-arama-sistemi)
- [Güvenlik](#-güvenlik)
- [Test](#-test)
- [Docker](#-docker)
- [Katkıda Bulunma](#-katkıda-bulunma)

## ✨ Özellikler

### 🔐 Kimlik Doğrulama ve Yetkilendirme
- **JWT tabanlı kimlik doğrulama** - Güvenli token sistemi
- **Refresh token desteği** - Otomatik token yenileme
- **Rol tabanlı yetkilendirme** - Admin ve kullanıcı rolleri
- **Şifre hashleme** - bcryptjs ile güvenli şifre saklama
- **Rate limiting** - API koruma sistemi

### 💬 Gerçek Zamanlı Mesajlaşma
- **Socket.IO entegrasyonu** - Anlık mesaj gönderimi
- **Oda tabanlı sohbet** - Conversation odaları
- **Typing indicators** - Yazıyor göstergeleri
- **Online/offline durumu** - Kullanıcı durumu takibi
- **Mesaj okundu bildirimi** - Read receipts
- **Mesaj bildirimleri** - Anlık bildirimler

### 🤖 Otomatik Mesaj Sistemi
- **Cron job tabanlı planlama** - Otomatik mesaj zamanlaması
- **RabbitMQ kuyruk sistemi** - Asenkron mesaj işleme
- **Rastgele mesaj içerikleri** - Çeşitli mesaj şablonları
- **Kullanıcı çifti oluşturma** - Akıllı eşleştirme
- **Sistem durumu izleme** - Real-time monitoring

### 🔍 Gelişmiş Arama Sistemi
- **Elasticsearch entegrasyonu** - Tam metin araması
- **Türkçe dil desteği** - Türkçe analyzer
- **Fuzzy matching** - Yazım hatası toleransı
- **Highlighting** - Eşleşen kelimeleri vurgulama
- **Filtreleme seçenekleri** - Tarih, kullanıcı, konuşma bazlı
- **Pagination** - Sayfalama desteği

### 📊 Veri Yönetimi
- **MongoDB** - NoSQL veritabanı
- **Redis cache** - Hızlı veri erişimi
- **Mongoose ODM** - Veri modelleme
- **Indexing** - Performans optimizasyonu
- **Data validation** - Veri doğrulama

### 🛡️ Güvenlik Özellikleri
- **Helmet.js** - Güvenlik başlıkları
- **CORS yapılandırması** - Cross-origin koruması
- **Input sanitization** - XSS koruması
- **SQL injection koruması** - Veritabanı güvenliği
- **Rate limiting** - DDoS koruması
- **HPP koruması** - HTTP Parameter Pollution

### 📈 Monitoring ve Logging
- **Winston logger** - Kapsamlı loglama
- **Health check endpoint** - Sistem durumu kontrolü
- **Performance monitoring** - Performans izleme
- **Error handling** - Hata yönetimi
- **Swagger dokümantasyonu** - API dokümantasyonu

## 🛠️ Teknolojiler

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time iletişim
- **MongoDB** - NoSQL veritabanı
- **Redis** - Cache ve session store
- **RabbitMQ** - Message queue
- **Elasticsearch** - Arama motoru

### Güvenlik
- **JWT** - JSON Web Tokens
- **bcryptjs** - Şifre hashleme
- **Helmet** - Güvenlik middleware
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation

### Monitoring
- **Winston** - Logging
- **Morgan** - HTTP request logging
- **Swagger** - API dokümantasyonu

### Development
- **Nodemon** - Development server
- **Docker** - Containerization
- **Docker Compose** - Multi-container setup

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- Docker ve Docker Compose
- MongoDB
- Redis
- RabbitMQ
- Elasticsearch

### 1. Repository'yi Klonlayın
```bash
git clone https://github.com/ahmethakankaragulle/real-time-chat.git
cd real-time-chat
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Environment Variables
`.env` dosyası oluşturun:
```env
# Server
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/live-chat

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Docker ile Çalıştırın
```bash
# Tüm servisleri başlat
docker-compose up -d mongo redis rabbitmq elasticsearch

# Logları izle
docker-compose logs -f app

# uygulamayı başlat
npm run dev
```

### 5. Manuel Kurulum
```bash
# MongoDB başlat
mongod

# Redis başlat
redis-server

# RabbitMQ başlat
rabbitmq-server

# Elasticsearch başlat
elasticsearch

# Uygulamayı başlat
npm run dev
```

## 📚 API Dokümantasyonu

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
```http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Users
```http
GET /user/profile
PUT /user/profile
GET /user/users
GET /user/:id
```

### Conversations
```http
GET /conversations
POST /conversations
GET /conversations/:id
PUT /conversations/:id
DELETE /conversations/:id
```

### Messages
```http
GET /messages/:conversationId
POST /messages
PUT /messages/:id
DELETE /messages/:id
```

### Search
```http
GET /search/messages?q=query
GET /search/users?q=query
GET /search/global?q=query
GET /search/status
```

### Auto Messages
```http
POST /auto-messages/start-system
POST /auto-messages/stop-system
GET /auto-messages/status
POST /auto-messages/trigger-planning
```

## 🔌 Socket.IO Events

### Client to Server
```javascript
// Odaya katıl
socket.emit('join_room', { conversationId: 'conv123' });

// Mesaj gönder
socket.emit('send_message', {
  conversationId: 'conv123',
  content: 'Merhaba!',
  receiverId: 'user123'
});

// Mesaj okundu
socket.emit('message_received', { messageId: 'msg123' });

// Yazmaya başladı
socket.emit('typing_start', { conversationId: 'conv123' });

// Yazmayı durdurdu
socket.emit('typing_stop', { conversationId: 'conv123' });
```

### Server to Client
```javascript
// Yeni mesaj
socket.on('new_message', (data) => {
  console.log('Yeni mesaj:', data.message);
});

// Mesaj bildirimi
socket.on('message_notification', (data) => {
  console.log('Mesaj bildirimi:', data);
});

// Mesaj okundu
socket.on('message_read', (data) => {
  console.log('Mesaj okundu:', data);
});

// Kullanıcı online
socket.on('user_online', (data) => {
  console.log('Kullanıcı online:', data);
});

// Kullanıcı offline
socket.on('user_offline', (data) => {
  console.log('Kullanıcı offline:', data);
});

// Yazıyor göstergesi
socket.on('user_typing_start', (data) => {
  console.log('Kullanıcı yazıyor:', data);
});

socket.on('user_typing_stop', (data) => {
  console.log('Kullanıcı yazmayı durdurdu:', data);
});
```

## 🤖 Otomatik Mesaj Sistemi

### Özellikler
- **Her gece 02:00'da planlama** - Cron job ile otomatik planlama
- **Rastgele mesaj içerikleri** - 15 farklı mesaj şablonu
- **Akıllı kullanıcı eşleştirme** - Rastgele çift oluşturma
- **RabbitMQ kuyruk sistemi** - Asenkron mesaj gönderimi
- **Real-time monitoring** - Sistem durumu izleme

### Mesaj İçerikleri
```javascript
const messages = [
  "Merhaba! Nasılsın?",
  "Günaydın! Bugün nasıl geçiyor?",
  "İyi akşamlar! Umarım güzel bir gün geçirmişsindir.",
  "Selam! Ne yapıyorsun?",
  "Merhaba! Bugün hava nasıl?",
  // ... 10 tane daha
];
```

### Sistem Durumu
```javascript
// Sistem durumunu kontrol et
GET /api/v1/auto-messages/status

// Yanıt örneği
{
  "planning": {
    "plannedToday": 25,
    "queuedToday": 10,
    "sentToday": 15,
    "isSchedulerRunning": true
  },
  "queue": {
    "readyToQueue": 5,
    "inQueue": 8,
    "sentToday": 15,
    "isSchedulerRunning": true
  },
  "consumer": {
    "isRunning": true,
    "processedCount": 150,
    "lastProcessed": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔍 Arama Sistemi

### Elasticsearch Özellikleri
- **Türkçe analyzer** - Kelime kökleri ve stop words
- **Fuzzy matching** - Yazım hatalarını tolere eder
- **Highlighting** - Eşleşen kelimeleri vurgular
- **Gelişmiş filtreleme** - Tarih, kullanıcı, konuşma bazlı
- **Pagination** - Sayfalama desteği

### Arama Örnekleri
```javascript
// Mesaj arama
GET /api/v1/search/messages?q=merhaba&page=1&limit=20

// Kullanıcı arama
GET /api/v1/search/users?q=ahmet&isActive=true

// Genel arama
GET /api/v1/search/global?q=proje&type=all

// Tarih aralığında arama
GET /api/v1/search/messages?q=toplantı&fromDate=2024-01-01&toDate=2024-01-31
```

### İndeks Yapısı
```json
// Messages Index
{
  "content": "text",           // Türkçe analyzer
  "senderId": "keyword",
  "receiverId": "keyword",
  "conversationId": "keyword",
  "isRead": "boolean",
  "createdAt": "date",
  "senderUsername": "text",
  "receiverUsername": "text"
}

// Users Index
{
  "username": "text",          // Türkçe analyzer
  "email": "keyword",
  "firstName": "text",
  "lastName": "text",
  "isActive": "boolean",
  "lastSeen": "date"
}
```

## 🛡️ Güvenlik

### Güvenlik Middleware'leri
```javascript
// Helmet - Güvenlik başlıkları
app.use(helmet());

// CORS - Cross-origin koruması
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Rate Limiting - DDoS koruması
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // IP başına maksimum istek
}));

// Input Sanitization - XSS koruması
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
```

### JWT Güvenliği
```javascript
// Token doğrulama
const token = jwt.verify(token, process.env.JWT_SECRET);

// Refresh token
const refreshToken = jwt.sign(
  { userId: user._id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### Şifre Güvenliği
```javascript
// Şifre hashleme
const hashedPassword = await bcrypt.hash(password, 12);

// Şifre doğrulama
const isValid = await bcrypt.compare(password, hashedPassword);
```

## 🧪 Test

### Test Dosyaları
```bash
# Socket.IO testleri
node test-socket.js

# Elasticsearch testleri
node test-elasticsearch.js

# Otomatik mesaj sistemi testleri
node test-auto-message-system.js
```

### Test Özellikleri
- **Socket.IO bağlantı testleri**
- **Mesaj gönderme/alma testleri**
- **Elasticsearch arama testleri**
- **Otomatik mesaj sistemi testleri**
- **API endpoint testleri**

### Manuel Test
```bash
# Health check
curl http://localhost:3001/healthcheck

# API dokümantasyonu
http://localhost:3001/api-docs

# RabbitMQ yönetim paneli
http://localhost:15672
# Kullanıcı: admin, Şifre: admin123

# Elasticsearch
curl http://localhost:9200/_cluster/health
```

## 🐳 Docker

### Docker Compose Servisleri
```yaml
services:
  app:          # Node.js uygulaması
  mongo:        # MongoDB veritabanı
  redis:        # Redis cache
  rabbitmq:     # RabbitMQ message queue
  elasticsearch: # Elasticsearch arama motoru
```

### Docker Komutları
```bash
# Tüm servisleri başlat
docker-compose up -d

# Belirli servisi başlat
docker-compose up -d app

# Logları izle
docker-compose logs -f

# Servisleri durdur
docker-compose down

# Volume'ları temizle
docker-compose down -v
```

### Environment Variables (Docker)
```env
MONGODB_URI=mongodb://mongo:27017/live-chat
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq:5672
ELASTICSEARCH_URL=http://elasticsearch:9200
```

## 📊 Monitoring

### Health Check
```http
GET /healthcheck

Response:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "connectedUsers": 5
}
```

### Logging
```javascript
// Winston logger yapılandırması
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});
```

### Log Dosyaları
```
logs/
├── app.log                    # Genel uygulama logları
├── socket.log                 # Socket.IO logları
├── elasticsearch.log          # Elasticsearch logları
├── autoMessageScheduler.log   # Otomatik mesaj logları
├── queueManager.log           # Kuyruk yöneticisi logları
└── messageConsumer.log        # Mesaj consumer logları
```

## 🚀 Performance

### Optimizasyonlar
- **Redis caching** - Sık erişilen veriler için cache
- **Database indexing** - MongoDB indeksleri
- **Connection pooling** - Veritabanı bağlantı havuzu
- **Rate limiting** - API koruma
- **Compression** - Response sıkıştırma

### Monitoring
- **Real-time user count** - Bağlı kullanıcı sayısı
- **Message processing time** - Mesaj işleme süresi
- **Queue status** - Kuyruk durumu
- **System health** - Sistem sağlığı

## 🤝 Katkıda Bulunma

### Geliştirme Ortamı
```bash
# Repository'yi fork edin
git clone https://github.com/your-username/real-time-chat.git

# Branch oluşturun
git checkout -b feature/new-feature

# Değişiklikleri commit edin
git commit -m "Add new feature"

# Pull request oluşturun
git push origin feature/new-feature
```

### Kod Standartları
- **ES6+ syntax** kullanın
- **Async/await** tercih edin
- **Error handling** ekleyin
- **JSDoc** yorumları yazın
- **Test** yazın

### Commit Mesajları
```
feat: yeni özellik eklendi
fix: hata düzeltildi
docs: dokümantasyon güncellendi
style: kod formatı düzeltildi
refactor: kod yeniden düzenlendi
test: test eklendi
chore: yapılandırma değişikliği
```

## 📄 Lisans

Bu proje [ISC License](LICENSE) altında lisanslanmıştır.

## 👨‍💻 Geliştirici

**Ahmet Hakan Karagülle**
- GitHub: [@ahmethakankaragulle](https://github.com/ahmethakankaragulle)
- Email: [email protected]

## 🙏 Teşekkürler

Bu projede kullanılan teknolojilerin geliştiricilerine teşekkürler:
- [Socket.IO](https://socket.io/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)
- [RabbitMQ](https://www.rabbitmq.com/)
- [Elasticsearch](https://www.elastic.co/)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!

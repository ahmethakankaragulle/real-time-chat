import express from 'express';
import elasticsearchService from '../services/elasticsearch.service.js';
import auth from '../middleware/auth.middleware.js';
import { validateSearch, validateMessageId, validateUserId } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchOptions:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: Kullanıcı ID'si ile filtreleme
 *         conversationId:
 *           type: string
 *           description: Konuşma ID'si ile filtreleme
 *         fromDate:
 *           type: string
 *           format: date-time
 *           description: Başlangıç tarihi (ISO 8601 format)
 *         toDate:
 *           type: string
 *           format: date-time
 *           description: Bitiş tarihi (ISO 8601 format)
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           description: Sayfa numarası
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *           description: Sayfa başına sonuç sayısı
 *         sortBy:
 *           type: string
 *           enum: [createdAt, content, senderUsername]
 *           default: createdAt
 *           description: Sıralama kriteri
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *           description: Sıralama yönü
 *     
 *     MessageSearchResult:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Mesaj ID'si
 *         content:
 *           type: string
 *           description: Mesaj içeriği
 *         senderId:
 *           type: string
 *           description: Gönderen kullanıcı ID'si
 *         receiverId:
 *           type: string
 *           description: Alıcı kullanıcı ID'si
 *         conversationId:
 *           type: string
 *           description: Konuşma ID'si
 *         isRead:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         senderUsername:
 *           type: string
 *         receiverUsername:
 *           type: string
 *         score:
 *           type: number
 *           description: Elasticsearch arama skoru
 *     
 *     UserSearchResult:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Kullanıcı ID'si
 *         username:
 *           type: string
 *           description: Kullanıcı adı
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         isActive:
 *           type: boolean
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         score:
 *           type: number
 *           description: Elasticsearch arama skoru
 *     
 *     SearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             hits:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MessageSearchResult'
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 *         timestamp:
 *           type: string
 *           format: date-time
 *     
 *     GlobalSearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             messages:
 *               $ref: '#/components/schemas/SearchResponse'
 *             users:
 *               $ref: '#/components/schemas/SearchResponse'
 *             total:
 *               type: integer
 *         timestamp:
 *           type: string
 *           format: date-time
 *     
 *     ElasticsearchStats:
 *       type: object
 *       properties:
 *         clusterHealth:
 *           type: object
 *         indices:
 *           type: object
 *         messageIndex:
 *           type: object
 *         userIndex:
 *           type: object
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/search/messages:
 *   get:
 *     summary: Mesajlarda arama yap
 *     description: Elasticsearch kullanarak mesajlarda tam metin araması yapar
 *     tags: [Arama - Elasticsearch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Arama sorgusu
 *         example: "merhaba"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Kullanıcı ID'si ile filtreleme
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Konuşma ID'si ile filtreleme
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Başlangıç tarihi (ISO 8601 format)
 *         example: "2024-01-01T00:00:00.000Z"
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Bitiş tarihi (ISO 8601 format)
 *         example: "2024-12-31T23:59:59.999Z"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına sonuç sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, content, senderUsername]
 *           default: createdAt
 *         description: Sıralama kriteri
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sıralama yönü
 *     responses:
 *       200:
 *         description: Başarılı arama sonucu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             example:
 *               success: true
 *               data:
 *                 hits:
 *                   - _id: "507f1f77bcf86cd799439011"
 *                     content: "Merhaba, nasılsın?"
 *                     senderId: "507f1f77bcf86cd799439012"
 *                     receiverId: "507f1f77bcf86cd799439013"
 *                     conversationId: "507f1f77bcf86cd799439014" 
 *                     isRead: true
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *                     updatedAt: "2024-01-15T10:30:00.000Z"
 *                     senderUsername: "ahmet"
 *                     receiverUsername: "mehmet"
 *                     score: 0.8
 *                 total: 1
 *                 page: 1
 *                 limit: 20
 *                 totalPages: 1
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Geçersiz arama sorgusu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Arama sorgusu gerekli"
 *       401:
 *         description: Yetkilendirme hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Mesaj ara
router.get('/messages', auth, validateSearch, async (req, res) => {
  try {
    const { 
      q, 
      userId, 
      conversationId, 
      fromDate, 
      toDate, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Arama sorgusu gerekli'
      });
    }

    const options = {
      userId,
      conversationId,
      fromDate: fromDate ? new Date(fromDate) : null,
      toDate: toDate ? new Date(toDate) : null,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };

    const results = await elasticsearchService.searchMessages(q.trim(), options);

    res.json({
      success: true,
      data: results,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mesaj arama hatası',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/search/users:
 *   get:
 *     summary: Kullanıcılarda arama yap
 *     description: Elasticsearch kullanarak kullanıcılarda tam metin araması yapar
 *     tags: [Arama - Elasticsearch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Arama sorgusu
 *         example: "ahmet"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Aktif kullanıcılar ile filtreleme
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına sonuç sayısı
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [username, email, firstName, lastName, createdAt]
 *           default: username
 *         description: Sıralama kriteri
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sıralama yönü
 *     responses:
 *       200:
 *         description: Başarılı arama sonucu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             example:
 *               success: true
 *               data:
 *                 hits:
 *                   - _id: "507f1f77bcf86cd799439012"
 *                     username: "ahmet"
 *                     email: "ahmet@example.com"
 *                     firstName: "Ahmet"
 *                     lastName: "Yılmaz"
 *                     isActive: true
 *                     role: "user"
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     score: 0.9
 *                 total: 1
 *                 page: 1
 *                 limit: 20
 *                 totalPages: 1
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Geçersiz arama sorgusu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// Kullanıcı ara
router.get('/users', auth, validateSearch, async (req, res) => {
  try {
    const { 
      q, 
      isActive, 
      page, 
      limit, 
      sortBy, 
      sortOrder 
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Arama sorgusu gerekli'
      });
    }

    const options = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy: sortBy || 'username',
      sortOrder: sortOrder || 'asc'
    };

    const results = await elasticsearchService.searchUsers(q.trim(), options);

    res.json({
      success: true,
      data: results,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı arama hatası',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/search/global:
 *   get:
 *     summary: Genel arama yap
 *     description: Hem mesajlarda hem de kullanıcılarda arama yapar
 *     tags: [Arama - Elasticsearch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Arama sorgusu
 *         example: "ahmet"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, messages, users]
 *           default: all
 *         description: Arama tipi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Sayfa başına sonuç sayısı
 *     responses:
 *       200:
 *         description: Başarılı genel arama sonucu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GlobalSearchResponse'
 *             example:
 *               success: true
 *               data:
 *                 messages:
 *                   hits:
 *                     - _id: "507f1f77bcf86cd799439011"
 *                       content: "Ahmet ile konuştuk"
 *                       senderUsername: "mehmet"
 *                       score: 0.7
 *                   total: 1
 *                 users:
 *                   hits:
 *                     - _id: "507f1f77bcf86cd799439012"
 *                       username: "ahmet"
 *                       firstName: "Ahmet"
 *                       score: 0.9
 *                   total: 1
 *                 total: 2
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Geçersiz arama sorgusu
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// Genel arama (hem mesaj hem kullanıcı)
router.get('/global', auth, validateSearch, async (req, res) => {
  try {
    const { 
      q, 
      type, 
      page, 
      limit 
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Arama sorgusu gerekli'
      });
    }

    const searchQuery = q.trim();
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };

    let results = {};

    // Tip belirtilmemişse veya 'all' ise her ikisini de ara
    if (!type || type === 'all') {
      const [messageResults, userResults] = await Promise.all([
        elasticsearchService.searchMessages(searchQuery, { ...options, limit: 5 }),
        elasticsearchService.searchUsers(searchQuery, { ...options, limit: 5 })
      ]);

      results = {
        messages: messageResults,
        users: userResults,
        total: messageResults.total + userResults.total
      };
    } else if (type === 'messages') {
      const messageResults = await elasticsearchService.searchMessages(searchQuery, options);
      results = {
        messages: messageResults,
        total: messageResults.total
      };
    } else if (type === 'users') {
      const userResults = await elasticsearchService.searchUsers(searchQuery, options);
      results = {
        users: userResults,
        total: userResults.total
      };
    }

    res.json({
      success: true,
      data: results,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Genel arama hatası',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/search/status:
 *   get:
 *     summary: Elasticsearch durumunu kontrol et
 *     description: Elasticsearch cluster sağlığı ve indeks durumlarını gösterir
 *     tags: [Arama - Elasticsearch]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Elasticsearch durum bilgisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ElasticsearchStats'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               data:
 *                 clusterHealth:
 *                   status: "green"
 *                   numberOfNodes: 1
 *                 indices:
 *                   total: 2
 *                 messageIndex:
 *                   documentCount: 1000
 *                   size: "10.5mb"
 *                 userIndex:
 *                   documentCount: 50
 *                   size: "2.1mb"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// Elasticsearch durumu
router.get('/status', auth, async (req, res) => {
  try {
    const stats = await elasticsearchService.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Elasticsearch durum kontrolü hatası',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/search/index-message/{messageId}:
 *   post:
 *     summary: Belirli bir mesajı indeksle
 *     description: Veritabanından bir mesajı alıp Elasticsearch'e indeksler
 *     tags: [Arama - Elasticsearch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: İndekslenecek mesajın ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Mesaj başarıyla indekslendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 messageId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Mesaj indekslendi"
 *               messageId: "507f1f77bcf86cd799439011"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Mesaj bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Belirli bir mesajı indeksle
router.post('/index-message/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Mesajı veritabanından al
    const Message = (await import('../models/message.model.js')).default;
    const message = await Message.findById(messageId)
      .populate('senderId', 'username')
      .populate('receiverId', 'username');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mesaj bulunamadı'
      });
    }

    // Elasticsearch'e indeksle
    const messageData = {
      _id: message._id,
      content: message.content,
      senderId: message.senderId._id,
      receiverId: message.receiverId._id,
      conversationId: message.conversationId,   
      isRead: message.isRead,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderUsername: message.senderId.username,
      receiverUsername: message.receiverId.username
    };

    await elasticsearchService.indexMessage(messageData);

    res.json({
      success: true,
      message: 'Mesaj indekslendi',
      messageId: messageId,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mesaj indeksleme hatası',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/search/index-user/{userId}:
 *   post:
 *     summary: Belirli bir kullanıcıyı indeksle
 *     description: Veritabanından bir kullanıcıyı alıp Elasticsearch'e indeksler
 *     tags: [Arama - Elasticsearch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: İndekslenecek kullanıcının ID'si
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla indekslendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               success: true
 *               message: "Kullanıcı indekslendi"
 *               userId: "507f1f77bcf86cd799439012"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Belirli bir kullanıcıyı indeksle
router.post('/index-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Kullanıcıyı veritabanından al
    const User = (await import('../models/user.model.js')).default;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Elasticsearch'e indeksle
    await elasticsearchService.indexUser(user);

    res.json({
      success: true,
      message: 'Kullanıcı indekslendi',
      userId: userId,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı indeksleme hatası',
      error: error.message
    });
  }
});


export default router; 
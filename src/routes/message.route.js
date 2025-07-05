import express from 'express';
import messageService from '../services/message.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Yeni mesaj gönderme
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Konuşma ID'si (conversationId veya receiverId'den biri gerekli)
 *               receiverId:
 *                 type: string
 *                 description: Alıcı kullanıcı ID'si (conversationId veya receiverId'den biri gerekli)
 *               content:
 *                 type: string
 *                 description: Mesaj içeriği
 *     responses:
 *       201:
 *         description: Mesaj başarıyla gönderildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Geçersiz istek
 *       404:
 *         description: Konuşma veya kullanıcı bulunamadı
 *       403:
 *         description: Erişim izni yok
 *       500:
 *         description: Sunucu hatası
 */
router.post('/send', async (req, res) => {
  try {
    const { conversationId, receiverId, content } = req.body;
    const senderId = req.user._id;

    const result = await messageService.sendMessage(senderId, content, conversationId, receiverId);

    res.status(201).json({
      success: true,
      message: 'Mesaj gönderildi',
      data: result
    });
  } catch (error) {
    console.error('Send message error:', error);
    
    if (error.message === 'Mesaj içeriği gerekli') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Conversation bulunamadı') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Bu conversation\'a erişim izniniz yok') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Alıcı kullanıcı bulunamadı') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Conversation ID veya alıcı ID gerekli') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/messages/{conversationId}:
 *   get:
 *     summary: Belirli konuşmanın mesajlarını listeleme
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Konuşma ID'si
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Sayfa başına öğe sayısı
 *     responses:
 *       200:
 *         description: Mesajlar başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Konuşma bulunamadı
 *       403:
 *         description: Erişim izni yok
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const result = await messageService.getMessagesByConversation(conversationId, userId, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get messages error:', error);
    
    if (error.message === 'Conversation bulunamadı') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Bu conversation\'a erişim izniniz yok') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   put:
 *     summary: Mesajı okundu olarak işaretleme
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mesaj ID'si
 *     responses:
 *       200:
 *         description: Mesaj başarıyla okundu olarak işaretlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Mesaj bulunamadı
 *       403:
 *         description: Erişim izni yok
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await messageService.markMessageAsRead(messageId, userId);

    res.json({
      success: true,
      message: 'Mesaj okundu olarak işaretlendi',
      data: { message }
    });
  } catch (error) {
    console.error('Mark read error:', error);
    
    if (error.message === 'Mesaj bulunamadı') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Bu mesaja erişim izniniz yok') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

export default router; 
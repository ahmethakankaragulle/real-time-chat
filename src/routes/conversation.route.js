import express from 'express';
import conversationService from '../services/conversation.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Kullanıcının tüm konuşmalarını listeleme
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 20
 *         description: Sayfa başına öğe sayısı
 *     responses:
 *       200:
 *         description: Konuşmalar başarıyla getirildi
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
 *                     conversations:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await conversationService.getUserConversations(userId, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/conversations/{conversationId}:
 *   get:
 *     summary: Belirli bir konuşmayı getirme
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Konuşma ID'si
 *     responses:
 *       200:
 *         description: Konuşma başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
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

    const result = await conversationService.getConversationById(conversationId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    
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
 * /api/conversations:
 *   post:
 *     summary: Yeni konuşma oluşturma
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: string
 *                 description: Katılımcı kullanıcı ID'si
 *     responses:
 *       201:
 *         description: Konuşma başarıyla oluşturuldu
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
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/', async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user._id;

    const conversation = await conversationService.createConversation(userId, participantId);

    res.status(201).json({
      success: true,
      message: 'Conversation oluşturuldu',
      data: { conversation }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    
    if (error.message === 'Katılımcı ID gerekli') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Kendinizle conversation oluşturamazsınız') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Kullanıcı bulunamadı') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Bu kullanıcı ile zaten bir conversation var') {
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
 * /api/conversations/{conversationId}:
 *   delete:
 *     summary: Konuşmayı silme (pasif yapma)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Konuşma ID'si
 *     responses:
 *       200:
 *         description: Konuşma başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Konuşma bulunamadı
 *       403:
 *         description: Erişim izni yok
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await conversationService.deleteConversation(conversationId, userId);

    res.json({
      success: true,
      message: 'Conversation silindi'
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    
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

export default router; 
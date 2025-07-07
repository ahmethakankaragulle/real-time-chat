import express from 'express';
import redisService from '../services/redis.service.js';
import userService from '../services/user.service.js';
import auth from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/user/list:
 *   get:
 *     summary: Kullanıcı listesi
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Sayfa başına kayıt sayısı
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/list', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await userService.getUsersListWithActivity(req.user._id, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('User list error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/v1/user/online:
 *   get:
 *     summary: Çevrimiçi kullanıcılar
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Çevrimiçi kullanıcı listesi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/online', auth, async (req, res) => {
  try {
    const result = await userService.getOnlineUsersWithActivity(req.user._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Online users error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/v1/user/profile:
 *   put:
 *     summary: Profil güncelleme
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (username) updateData.username = username;

    const user = await userService.updateUserProfile(userId, updateData);

    res.json({
      success: true,
      message: 'Profil güncellendi',
      data: { user }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/v1/user/online-count:
 *   get:
 *     summary: Anlık online kullanıcı sayısı
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Online kullanıcı sayısı
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/online-count', auth, async (req, res) => {
  try {
    const onlineCount = await redisService.getOnlineUserCount();

    res.json({
      success: true,
      data: {
        onlineCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Online count error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/v1/user/check-online/{userId}:
 *   get:
 *     summary: Belirli kullanıcının online durumu
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kontrol edilecek kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Kullanıcının online durumu
 *       401:
 *         description: Yetkilendirme hatası
 *       400:
 *         description: Geçersiz kullanıcı ID'si
 */
router.get('/check-online/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID\'si gerekli'
      });
    }

    const isOnline = await redisService.isUserOnline(userId);

    res.json({
      success: true,
      data: {
        userId,
        isOnline,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Check online status error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

export default router; 
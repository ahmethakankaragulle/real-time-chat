import express from 'express';
import redisService from '../services/redis.service.js';
import userService from '../services/user.service.js';
import auth from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/user/list:
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
 * /api/user/online:
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
 * /api/user/profile:
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
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (username) updateData.username = username;
    if (avatar) updateData.avatar = avatar;

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

export default router; 
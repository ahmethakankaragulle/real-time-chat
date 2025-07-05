import express from 'express';
import auth from '../middleware/auth.middleware.js';
import authService from '../services/auth.service.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Çok fazla giriş denemesi. Lütfen 15 dakika bekleyin.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, 
  message: { success: false, message: 'Çok fazla kayıt denemesi. Lütfen 1 saat bekleyin.' }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Kullanıcı kaydı
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *       400:
 *         description: Hatalı istek
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    authService.validateRegisterData(username, email, password);

    const result = await authService.registerUser(username, email, password);

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: result
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *       401:
 *         description: Geçersiz kimlik bilgileri
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    authService.validateLoginData(email, password);

    const result = await authService.loginUser(email, password);

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Token yenileme
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Mevcut refresh token
 *               accessToken:
 *                 type: string
 *                 description: Süresi dolmuş access token (blacklist'e eklenecek)
 *     responses:
 *       200:
 *         description: Token yenilendi
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
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: Yeni access token
 *                     refreshToken:
 *                       type: string
 *                       description: Yeni refresh token
 *       401:
 *         description: Geçersiz refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token gerekli'
      });
    }

    const result = await authService.refreshToken(refreshToken, accessToken);

    res.json({
      success: true,
      message: 'Token yenilendi',
      data: result
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Geçersiz refresh token'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Kullanıcı çıkışı
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: İsteğe bağlı refresh token (blacklist'e eklenecek)
 *     responses:
 *       200:
 *         description: Çıkış başarılı
 *       401:
 *         description: Yetkilendirme hatası
 */
router.post('/logout', auth, async (req, res) => {
  try {
    const accessToken = req.header('Authorization').substring(7);
    const { refreshToken } = req.body;
    
    await authService.logoutUser(req.user._id, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Çıkış başarılı'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Mevcut kullanıcı bilgileri
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 *       401:
 *         description: Yetkilendirme hatası
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

export default router; 
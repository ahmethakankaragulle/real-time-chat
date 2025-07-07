import express from 'express';
import auth from '../middleware/auth.middleware.js';
import authService from '../services/auth.service.js';
import rateLimit from 'express-rate-limit';
import { validateRegister, validateLogin, validateRefreshToken } from '../middleware/validation.middleware.js';

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
 * /api/v1/auth/register:
 *   post:
 *     summary: Kullanıcı kaydı
 *     tags: [Kimlik Doğrulama]
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
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 description: Kullanıcı adı (sadece harf, rakam ve alt çizgi)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email adresi
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'
 *                 description: Şifre (en az bir küçük harf, büyük harf ve rakam)
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
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
 *         description: Validation hatası
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *                       value:
 *                         type: string
 */
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { username, email, password } = req.body;

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
 * /api/v1/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Kimlik Doğrulama]
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
 *                 format: email
 *                 description: Email adresi
 *               password:
 *                 type: string
 *                 description: Şifre
 *     responses:
 *       200:
 *         description: Giriş başarılı
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
 *         description: Validation hatası
 *       401:
 *         description: Geçersiz kimlik bilgileri
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

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
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Token yenileme
 *     tags: [Kimlik Doğrulama]
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
 *       400:
 *         description: Validation hatası
 *       401:
 *         description: Geçersiz refresh token
 */
router.post('/refresh', validateRefreshToken, async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body;

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
 * /api/v1/auth/logout:
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
 * /api/v1/auth/me:
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
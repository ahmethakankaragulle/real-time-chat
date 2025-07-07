import { body, param, query, validationResult } from 'express-validator';
import { sanitize } from 'express-validator';

// Validation sonuçlarını kontrol eden middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation hatası',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Kullanıcı kayıt validation
export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Kullanıcı adı 3-30 karakter arasında olmalıdır')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Geçerli bir email adresi giriniz')
    .normalizeEmail()
    .escape(),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Şifre en az 6 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  
  validateRequest
];

// Kullanıcı giriş validation
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Geçerli bir email adresi giriniz')
    .normalizeEmail()
    .escape(),
  
  body('password')
    .notEmpty()
    .withMessage('Şifre gereklidir'),
  
  validateRequest
];

// Token yenileme validation
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token gereklidir')
    .isJWT()
    .withMessage('Geçerli bir JWT token giriniz'),
  
  body('accessToken')
    .optional()
    .isJWT()
    .withMessage('Geçerli bir JWT token giriniz'),
  
  validateRequest
];

// Kullanıcı güncelleme validation
export const validateUserUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Kullanıcı adı 3-30 karakter arasında olmalıdır')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir')
    .escape(),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Ad 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
    .withMessage('Ad sadece harf içerebilir')
    .escape(),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Soyad 2-50 karakter arasında olmalıdır')
    .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
    .withMessage('Soyad sadece harf içerebilir')
    .escape(),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Geçerli bir email adresi giriniz')
    .normalizeEmail()
    .escape(),
  
  validateRequest
];

// Şifre değiştirme validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mevcut şifre gereklidir'),
  
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('Yeni şifre en az 6 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Yeni şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }
      return true;
    }),
  
  validateRequest
];

// Konuşma oluşturma validation
export const validateConversationCreate = [
  body('participants')
    .isArray({ min: 1, max: 10 })
    .withMessage('En az 1, en fazla 10 katılımcı olmalıdır'),
  
  body('participants.*')
    .isMongoId()
    .withMessage('Geçerli kullanıcı ID\'leri giriniz'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Başlık 1-100 karakter arasında olmalıdır')
    .escape(),
  
  body('type')
    .optional()
    .isIn(['private', 'group'])
    .withMessage('Geçerli konuşma tipi giriniz'),
  
  validateRequest
];

// Mesaj gönderme validation
export const validateMessageSend = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Mesaj içeriği 1-5000 karakter arasında olmalıdır')
    .escape(),
  
  body('receiverId')
    .isMongoId()
    .withMessage('Geçerli alıcı ID\'si giriniz'),
  
  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Geçerli konuşma ID\'si giriniz'),
  
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'audio', 'video'])
    .withMessage('Geçerli mesaj tipi giriniz'),
  
  validateRequest
];

// Mesaj güncelleme validation
export const validateMessageUpdate = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Mesaj içeriği 1-5000 karakter arasında olmalıdır')
    .escape(),
  
  validateRequest
];

// Arama validation
export const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Arama sorgusu 1-100 karakter arasında olmalıdır')
    .escape(),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sayfa numarası 1\'den büyük olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arasında olmalıdır'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'content', 'senderUsername', 'username', 'email'])
    .withMessage('Geçerli sıralama kriteri giriniz'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Geçerli sıralama yönü giriniz'),
  
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('Geçerli tarih formatı giriniz (ISO 8601)'),
  
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('Geçerli tarih formatı giriniz (ISO 8601)'),
  
  validateRequest
];

// ID parametresi validation
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Geçerli ID formatı giriniz'),
  
  validateRequest
];

// Kullanıcı ID parametresi validation
export const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Geçerli kullanıcı ID\'si giriniz'),
  
  validateRequest
];

// Mesaj ID parametresi validation
export const validateMessageId = [
  param('messageId')
    .isMongoId()
    .withMessage('Geçerli mesaj ID\'si giriniz'),
  
  validateRequest
];

// Konuşma ID parametresi validation
export const validateConversationId = [
  param('conversationId')
    .isMongoId()
    .withMessage('Geçerli konuşma ID\'si giriniz'),
  
  validateRequest
];

// Otomatik mesaj ID parametresi validation
export const validateAutoMessageId = [
  param('autoMessageId')
    .isMongoId()
    .withMessage('Geçerli otomatik mesaj ID\'si giriniz'),
  
  validateRequest
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sayfa numarası 1\'den büyük olmalıdır'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit 1-100 arasında olmalıdır'),
  
  validateRequest
];

// Sanitization middleware'leri
export const sanitizeInput = (req, res, next) => {
  // Body sanitization
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Query sanitization
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  // Params sanitization
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = req.params[key].trim();
      }
    });
  }
  
  next();
};

// SQL Injection koruması
export const sqlInjectionProtection = (req, res, next) => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i;
  
  const checkValue = (value) => {
    if (typeof value === 'string' && sqlPattern.test(value)) {
      throw new Error('Geçersiz karakterler tespit edildi');
    }
  };
  
  // Body kontrolü
  if (req.body) {
    Object.values(req.body).forEach(checkValue);
  }
  
  // Query kontrolü
  if (req.query) {
    Object.values(req.query).forEach(checkValue);
  }
  
  // Params kontrolü
  if (req.params) {
    Object.values(req.params).forEach(checkValue);
  }
  
  next();
};

export default {
  validateRequest,
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateUserUpdate,
  validatePasswordChange,
  validateConversationCreate,
  validateMessageSend,
  validateMessageUpdate,
  validateSearch,
  validateId,
  validateUserId,
  validateMessageId,
  validateConversationId,
  validateAutoMessageId,
  validatePagination,
  sanitizeInput,
  sqlInjectionProtection
}; 
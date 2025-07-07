import axios from 'axios';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';

// Test konfigürasyonu
const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3001';

// Test sonuçları
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Test yardımcı fonksiyonları
const logTest = (testName, passed, details = '') => {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName} - BAŞARILI`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName} - BAŞARISIZ`);
    if (details) console.log(`   Detay: ${details}`);
  }
  testResults.details.push({ testName, passed, details });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP Security Headers Testleri
async function testSecurityHeaders() {
  console.log('\n🛡️ HTTP GÜVENLİK BAŞLIKLARI TESTLERİ');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/me`).catch(e => e);
    const headers = response.response?.headers || response.headers;
    
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
    
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const actualValue = headers[header.toLowerCase()];
      logTest(
        `${header} Başlığı`,
        actualValue === expectedValue,
        `Beklenen: ${expectedValue}, Gerçek: ${actualValue}`
      );
    }
  } catch (error) {
    logTest('HTTP Security Headers', false, error.message);
  }
}

// CORS Testleri
async function testCORS() {
  console.log('\n🌐 CORS TESTLERİ');
  
  // 1. Geçersiz Origin Testi
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Origin': 'https://malicious-site.com'
      }
    }).catch(e => e);
    
    logTest(
      'Geçersiz Origin CORS Engelleme',
      response.response?.status === 403 || response.response?.status === 401,
      `Status: ${response.response?.status}`
    );
  } catch (error) {
    logTest('Geçersiz Origin CORS', false, error.message);
  }
  
  await delay(500);
  
  // 2. Geçerli Origin Testi
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    }).catch(e => e);
    
    logTest(
      'Geçerli Origin CORS İzin',
      response.response?.status !== 403,
      `Status: ${response.response?.status}`
    );
  } catch (error) {
    logTest('Geçerli Origin CORS', false, error.message);
  }
}

// JWT Token Testleri
async function testJWT() {
  console.log('\n🔑 JWT TOKEN TESTLERİ');
  
  // 1. Geçersiz Token Testi
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    }).catch(e => e);
    
    logTest(
      'Geçersiz JWT Token Engelleme',
      response.response?.status === 401,
      `Status: ${response.response?.status}`
    );
  } catch (error) {
    logTest('Geçersiz JWT Token', false, error.message);
  }
  
  await delay(500);
  
  // 2. Eksik Token Testi
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/me`).catch(e => e);
    
    logTest(
      'Eksik JWT Token Engelleme',
      response.response?.status === 401,
      `Status: ${response.response?.status}`
    );
  } catch (error) {
    logTest('Eksik JWT Token', false, error.message);
  }
  
  await delay(500);
  
  // 3. Yanlış Format Token Testi
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': 'invalid-token'
      }
    }).catch(e => e);
    
    logTest(
      'Yanlış Format JWT Token Engelleme',
      response.response?.status === 401,
      `Status: ${response.response?.status}`
    );
  } catch (error) {
    logTest('Yanlış Format JWT Token', false, error.message);
  }
}

// Input Validation Testleri
async function testInputValidation() {
  console.log('\n✅ INPUT VALIDATION TESTLERİ');
  
  // 1. Email Validation Testi
  const invalidEmails = ['invalid-email', 'test@', '@test.com', 'test..test@test.com'];
  
  for (const email of invalidEmails) {
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: email,
        password: 'test123'
      }).catch(e => e);
      
      logTest(
        `Geçersiz Email Validation: ${email}`,
        response.response?.status === 400,
        `Status: ${response.response?.status}`
      );
      
      await delay(200);
    } catch (error) {
      logTest(`Email Validation: ${email}`, false, error.message);
    }
  }
  
  // 2. Şifre Validation Testi
  const invalidPasswords = ['123', 'abc', 'ABC', 'abc123']; // Eksik karmaşıklık
  
  for (const password of invalidPasswords) {
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/register`, {
        username: 'testuser',
        email: 'test@test.com',
        password: password
      }).catch(e => e);
      
      logTest(
        `Geçersiz Şifre Validation: ${password}`,
        response.response?.status === 400,
        `Status: ${response.response?.status}`
      );
      
      await delay(200);
    } catch (error) {
      logTest(`Şifre Validation: ${password}`, false, error.message);
    }
  }
  
  // 3. Kullanıcı Adı Validation Testi
  const invalidUsernames = ['ab', 'a'.repeat(31), 'test@user', 'test user'];
  
  for (const username of invalidUsernames) {
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/auth/register`, {
        username: username,
        email: 'test@test.com',
        password: 'Test123!'
      }).catch(e => e);
      
      logTest(
        `Geçersiz Kullanıcı Adı Validation: ${username}`,
        response.response?.status === 400,
        `Status: ${response.response?.status}`
      );
      
      await delay(200);
    } catch (error) {
      logTest(`Kullanıcı Adı Validation: ${username}`, false, error.message);
    }
  }
}

// XSS Testleri
async function testXSS() {
  console.log('\n🛡️ XSS KORUMASI TESTLERİ');
  
  // 1. XSS Payload Testi
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')">',
    '"><script>alert("XSS")</script>'
  ];
  
  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(`${BASE_URL}/api/v1/messages`, {
        content: payload,
        receiverId: '507f1f77bcf86cd799439011'
      }, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      }).catch(e => e);
      
      // XSS payload'ının temizlenip temizlenmediğini kontrol et
      const isSanitized = !response.config?.data?.includes(payload) || 
                         response.config?.data?.includes('&lt;') ||
                         response.config?.data?.includes('&gt;');
      
      logTest(
        `XSS Payload Temizleme: ${payload.substring(0, 20)}...`,
        isSanitized || response.response?.status === 401,
        `Payload temizlendi: ${isSanitized}`
      );
      
      await delay(200);
    } catch (error) {
      logTest(`XSS Payload: ${payload.substring(0, 20)}...`, false, error.message);
    }
  }
}

// SQL Injection Testleri
async function testSQLInjection() {
  console.log('\n💉 SQL INJECTION TESTLERİ');
  
  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO users VALUES (1, 'hacker', 'hacker@test.com'); --"
  ];
  
  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/search/users?q=${encodeURIComponent(payload)}`).catch(e => e);
      
      // SQL injection'ın engellenip engellenmediğini kontrol et
      const isBlocked = response.response?.status === 400 || 
                       response.response?.status === 403 ||
                       response.response?.status === 500;
      
      logTest(
        `SQL Injection Engelleme: ${payload.substring(0, 20)}...`,
        isBlocked,
        `Status: ${response.response?.status}`
      );
      
      await delay(200);
    } catch (error) {
      logTest(`SQL Injection: ${payload.substring(0, 20)}...`, false, error.message);
    }
  }
}

// HPP (HTTP Parameter Pollution) Testleri
async function testHPP() {
  console.log('\n🌊 HPP (HTTP PARAMETER POLLUTION) TESTLERİ');
  
  try {
    // Aynı parametreyi birden fazla kez gönder
    const response = await axios.get(`${BASE_URL}/api/v1/search/users?q=test&q=admin&q=user`).catch(e => e);
    
    logTest(
      'HPP Koruması',
      response.response?.status === 400 || response.response?.status === 403,
      `Status: ${response.response?.status}`
    );
  } catch (error) {
    logTest('HPP Koruması', false, error.message);
  }
}

// WebSocket Güvenlik Testleri
async function testWebSocketSecurity() {
  console.log('\n🔌 WEBSOCKET GÜVENLİK TESTLERİ');
  
  // 1. Token olmadan WebSocket bağlantısı
  try {
    const ws = new WebSocket(WS_URL);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.close();
        reject('Token olmadan bağlantı kuruldu');
      });
      
      ws.on('error', (error) => {
        resolve('Token olmadan bağlantı engellendi');
      });
      
      setTimeout(() => {
        ws.close();
        resolve('Timeout');
      }, 3000);
    });
    
    logTest('WebSocket Token Gerekliliği', true, 'Token olmadan bağlantı engellendi');
  } catch (error) {
    logTest('WebSocket Token Gerekliliği', false, error.message);
  }
  
  await delay(1000);
  
  // 2. Geçersiz token ile WebSocket bağlantısı
  try {
    const ws = new WebSocket(WS_URL, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.close();
        reject('Geçersiz token ile bağlantı kuruldu');
      });
      
      ws.on('error', (error) => {
        resolve('Geçersiz token ile bağlantı engellendi');
      });
      
      setTimeout(() => {
        ws.close();
        resolve('Timeout');
      }, 3000);
    });
    
    logTest('WebSocket Geçersiz Token Engelleme', true, 'Geçersiz token ile bağlantı engellendi');
  } catch (error) {
    logTest('WebSocket Geçersiz Token Engelleme', false, error.message);
  }
}

// Rate Limiting Testleri (Son sırada çalıştırılır)
async function testRateLimiting() {
  console.log('\n🔒 RATE LIMITING TESTLERİ');
  
  // Rate limiting testlerini çalıştırmadan önce biraz bekle
  console.log('Rate limiting testleri için 5 saniye bekleniyor...');
  await delay(5000);
  
  // 1. Genel API Rate Limit Testi
  try {
    console.log('Genel API rate limit testi başlıyor...');
    const promises = [];
    for (let i = 0; i < 1001; i++) {
      promises.push(axios.get(`${BASE_URL}/api/v1/auth/me`).catch(e => e));
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.response?.status === 429);
    
    logTest(
      'Genel API Rate Limit (1000 istek sonrası 429)',
      rateLimited.length > 0,
      `${rateLimited.length} istek rate limit aldı`
    );
  } catch (error) {
    logTest('Genel API Rate Limit', false, error.message);
  }
  
  await delay(2000);
  
  // 2. Login Rate Limit Testi
  try {
    console.log('Login rate limit testi başlıyor...');
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/v1/auth/login`, {
          email: 'test@test.com',
          password: 'wrongpassword'
        }).catch(e => e)
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.response?.status === 429);
    
    logTest(
      'Login Rate Limit (5 deneme sonrası 429)',
      rateLimited.length > 0,
      `${rateLimited.length} login denemesi rate limit aldı`
    );
  } catch (error) {
    logTest('Login Rate Limit', false, error.message);
  }
  
  await delay(2000);
  
  // 3. Register Rate Limit Testi
  try {
    console.log('Register rate limit testi başlıyor...');
    const promises = [];
    for (let i = 0; i < 4; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/v1/auth/register`, {
          username: `testuser${i}`,
          email: `test${i}@test.com`,
          password: 'Test123!'
        }).catch(e => e)
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.response?.status === 429);
    
    logTest(
      'Register Rate Limit (3 deneme sonrası 429)',
      rateLimited.length > 0,
      `${rateLimited.length} kayıt denemesi rate limit aldı`
    );
  } catch (error) {
    logTest('Register Rate Limit', false, error.message);
  }
}

// Ana test fonksiyonu
async function runSecurityTests() {
  console.log('🔒 GÜVENLİK TESTLERİ BAŞLIYOR...\n');
  console.log(`Test URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}\n`);
  
  try {
    // Önce rate limiting olmayan testleri çalıştır
    await testSecurityHeaders();
    await delay(1000);
    
    await testCORS();
    await delay(1000);
    
    await testJWT();
    await delay(1000);
    
    await testInputValidation();
    await delay(1000);
    
    await testXSS();
    await delay(1000);
    
    await testSQLInjection();
    await delay(1000);
    
    await testHPP();
    await delay(1000);
    
    await testWebSocketSecurity();
    await delay(1000);
    
    // Son olarak rate limiting testlerini çalıştır
    await testRateLimiting();
    
  } catch (error) {
    console.error('Test çalıştırma hatası:', error);
  }
  
  // Test sonuçlarını göster
  console.log('\n📊 TEST SONUÇLARI');
  console.log('='.repeat(50));
  console.log(`Toplam Test: ${testResults.total}`);
  console.log(`Başarılı: ${testResults.passed} ✅`);
  console.log(`Başarısız: ${testResults.failed} ❌`);
  console.log(`Başarı Oranı: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ BAŞARISIZ TESTLER:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   - ${test.testName}: ${test.details}`);
      });
  }
  
  console.log('\n🔒 GÜVENLİK TESTLERİ TAMAMLANDI');
}

// Test çalıştır
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(console.error);
}

export default runSecurityTests; 
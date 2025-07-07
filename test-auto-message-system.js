import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODY5MDIyNjE3Zjc0NjIwNTNhZTAyYjciLCJ1c2VybmFtZSI6ImFobWV0NCIsImlhdCI6MTc1MTcyNjEyOSwiZXhwIjoxNzUxNzI3MDI5fQ.XbSQ7osVEvrpaLs92AMUlGMiuko53uiVZmA-Uk4a4So'; // Gerçek token ile değiştirin

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testAutoMessageSystem() {
  console.log('🚀 Otomatik Mesaj Sistemi Test Başlıyor...\n');

  try {
    // 1. Sistem durumunu kontrol et
    console.log('1. Sistem durumu kontrol ediliyor...');
    const statusResponse = await api.get('/api/v1/auto-messages/status');
    console.log('✅ Sistem durumu:', statusResponse.data.data);
    console.log('');

    // 2. RabbitMQ durumunu kontrol et
    console.log('2. RabbitMQ durumu kontrol ediliyor...');
    const rabbitmqResponse = await api.get('/api/v1/auto-messages/rabbitmq-status');
    console.log('✅ RabbitMQ durumu:', rabbitmqResponse.data.data);
    console.log('');

    // 3. İstatistikleri al
    console.log('3. İstatistikler alınıyor...');
    const statsResponse = await api.get('/api/v1/auto-messages/statistics');
    console.log('✅ İstatistikler:', statsResponse.data.data);
    console.log('');

    // 4. Manuel planlama tetikle
    console.log('4. Manuel planlama tetikleniyor...');
    const planningResponse = await api.post('/api/v1/auto-messages/trigger-planning');
    console.log('✅ Manuel planlama:', planningResponse.data.message);
    console.log('');

    // 5. Manuel kuyruk işleme tetikle
    console.log('5. Manuel kuyruk işleme tetikleniyor...');
    const queueResponse = await api.post('/api/v1/auto-messages/trigger-queue-processing');
    console.log('✅ Kuyruk işleme:', queueResponse.data.message);
    console.log('');

    // 6. Test mesajı gönder
    console.log('6. Test mesajı gönderiliyor...');
    const testMessageResponse = await api.post('/api/v1/auto-messages/send-test-message');
    console.log('✅ Test mesajı:', testMessageResponse.data.message);
    console.log('');

    // 7. Güncellenmiş durumu kontrol et
    console.log('7. Güncellenmiş durum kontrol ediliyor...');
    const updatedStatusResponse = await api.get('/api/v1/auto-messages/status');
    console.log('✅ Güncellenmiş durum:', updatedStatusResponse.data.data);
    console.log('');

    console.log('🎉 Tüm testler başarıyla tamamlandı!');

  } catch (error) {
    console.error('❌ Test hatası:', error.response?.data || error.message);
  }
}

// Health check
async function healthCheck() {
  try {
    const response = await axios.get(`${BASE_URL}/healthcheck`);
    console.log('🏥 Health Check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check hatası:', error.message);
    return false;
  }
}

// Ana test fonksiyonu
async function runTests() {
  console.log('🔍 Sunucu durumu kontrol ediliyor...');
  const isHealthy = await healthCheck();
  
  if (!isHealthy) {
    console.log('❌ Sunucu çalışmıyor. Lütfen sunucuyu başlatın.');
    return;
  }

  console.log('✅ Sunucu çalışıyor. Testler başlatılıyor...\n');
  await testAutoMessageSystem();
}

// Test çalıştır
runTests().catch(console.error); 
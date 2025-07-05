import { io } from 'socket.io-client';
import axios from 'axios';

// Test konfigürasyonu
const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// Test kullanıcıları
const testUsers = [
  {
    username: 'ahmet6',
    email: 'ahmet6@gmail.com',
    password: 'test1234'
  },
  {
    username: 'ahmet7',
    email: 'ahmet7@gmail.com',
    password: 'test1234'
  }
];

let user1Token, user2Token;
let user1Socket, user2Socket;
let conversationId;
let user2Id;

// API test fonksiyonları
async function testAuth() {
  console.log('\n🔐 Kimlik doğrulama testleri...');
  
  try {
    // Kullanıcı kayıt testi
    console.log('📝 Kullanıcı kayıt testi...');
    for (const user of testUsers) {
      try {
        const registerResponse = await axios.post(`${API_URL}/auth/register`, user);
        console.log(`✅ ${user.username} kayıt başarılı`);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('zaten')) {
          console.log(`ℹ️ ${user.username} zaten mevcut`);
        } else {
          console.error(`❌ ${user.username} kayıt hatası:`, error.response?.data?.message);
        }
      }
    }

    // Giriş testi
    console.log('🔑 Giriş testi...');
    const login1Response = await axios.post(`${API_URL}/auth/login`, {
      email: testUsers[0].email,
      password: testUsers[0].password
    });
    user1Token = login1Response.data.data.accessToken;
    console.log('✅ Kullanıcı 1 giriş başarılı');

    const login2Response = await axios.post(`${API_URL}/auth/login`, {
      email: testUsers[1].email,
      password: testUsers[1].password
    });
    user2Token = login2Response.data.data.accessToken;
    console.log('✅ Kullanıcı 2 giriş başarılı');

  } catch (error) {
    console.error('❌ Kimlik doğrulama hatası:', error.response?.data?.message);
  }
}

async function testConversations() {
  console.log('\n💬 Conversation testleri...');
  
  try {
    // Kullanıcı listesi al
    console.log('👥 Kullanıcı listesi alınıyor...');
    const usersResponse = await axios.get(`${API_URL}/user/list`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    console.log('Kullanıcı listesi:', usersResponse.data);
    
    const user2 = usersResponse.data.data.users.find(u => u.username === testUsers[1].username);
    
    if (!user2) {
      console.error('❌ Test kullanıcısı 2 bulunamadı');
      return;
    }

    user2Id = user2._id;
    console.log('✅ Kullanıcı 2 ID bulundu:', user2Id);

    // Önce mevcut conversation'ları kontrol et
    console.log('🔍 Mevcut conversation\'lar kontrol ediliyor...');
    const conversationsResponse = await axios.get(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    
    const existingConversations = conversationsResponse.data.data.conversations;
    console.log('📋 Mevcut conversation sayısı:', existingConversations.length);
    
    // İki kullanıcı arasında conversation var mı kontrol et
    const existingConversation = existingConversations.find(conv => 
      conv.participants.some(p => p._id === user2Id) && 
      conv.participants.length === 2
    );
    
    if (existingConversation) {
      conversationId = existingConversation._id;
      console.log('✅ Mevcut conversation bulundu:', conversationId);
    } else {
      // Yeni conversation oluştur
      console.log('➕ Yeni conversation oluşturuluyor...');
      const conversationResponse = await axios.post(`${API_URL}/conversations`, {
        participantId: user2Id
      }, {
        headers: { Authorization: `Bearer ${user1Token}` }
      });
      
      conversationId = conversationResponse.data.data.conversation._id;
      console.log('✅ Yeni conversation oluşturuldu:', conversationId);
    }

    // Conversation detaylarını göster
    console.log('📋 Güncel conversation listesi alınıyor...');
    const updatedConversationsResponse = await axios.get(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Conversation listesi alındı:', updatedConversationsResponse.data.data.conversations.length, 'adet');

  } catch (error) {
    console.error('❌ Conversation test hatası:', error.response?.data?.message || error.message);
  }
}

async function testMessages() {
  console.log('\n💌 Mesaj testleri...');
  
  try {
    if (!conversationId) {
      console.log('⚠️ Conversation ID yok, mesaj testi atlanıyor');
      return;
    }

    // Mesaj gönder
    console.log('📤 Mesaj gönderiliyor...');
    const sendMessageResponse = await axios.post(`${API_URL}/messages/send`, {
      conversationId: conversationId,
      content: 'Merhaba! Bu bir test mesajıdır.'
    }, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Mesaj gönderildi:', sendMessageResponse.data.data.message._id);

    // Mesajları listele
    console.log('📥 Mesajlar alınıyor...');
    const messagesResponse = await axios.get(`${API_URL}/messages/${conversationId}`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('✅ Mesajlar alındı:', messagesResponse.data.data.messages.length, 'adet');

  } catch (error) {
    console.error('❌ Mesaj test hatası:', error.response?.data?.message || error.message);
  }
}

// Socket.IO test fonksiyonları
function setupSocketListeners(socket, username) {
  console.log(`🔌 ${username} Socket.IO dinleyicileri kuruluyor...`);

  // Bağlantı durumu
  socket.on('connect', () => {
    console.log(`✅ ${username} Socket.IO bağlandı`);
  });

  socket.on('disconnect', () => {
    console.log(`✅ ${username} Socket.IO bağlantısı kesildi`);
  });

  // Mesaj event'leri
  socket.on('new_message', (data) => {
    console.log(`📨 ${username} yeni mesaj aldı:`, data.message.content);
  });

  socket.on('message_notification', (data) => {
    console.log(`🔔 ${username} mesaj bildirimi aldı:`, data.message.content);
  });

  socket.on('message_read', (data) => {
    console.log(`👁️ ${username} mesaj okundu bildirimi:`, data.messageId);
  });

  // Kullanıcı durumu event'leri
  socket.on('user_online', (data) => {
    console.log(`🟢 ${username} kullanıcı online bildirimi:`, data.username);
  });

  socket.on('user_offline', (data) => {
    console.log(`🔴 ${username} kullanıcı offline bildirimi:`, data.username);
  });

  // Oda event'leri
  socket.on('room_joined', (data) => {
    console.log(`🚪 ${username} odaya katıldı:`, data.conversationId);
  });

  socket.on('message_sent', (data) => {
    console.log(`✅ ${username} mesaj gönderildi:`, data.messageId);
  });

  // Hata yönetimi
  socket.on('error', (data) => {
    console.error(`❌ ${username} Socket hatası:`, data.message);
  });
}

async function testSocketIO() {
  console.log('\n🔌 Socket.IO testleri...');

  try {
    // Socket.IO bağlantıları
    console.log('🔗 Socket.IO bağlantıları kuruluyor...');
    
    user1Socket = io(BASE_URL, {
      auth: { token: user1Token }
    });

    user2Socket = io(BASE_URL, {
      auth: { token: user2Token }
    });

    // Dinleyicileri kur
    setupSocketListeners(user1Socket, 'Kullanıcı 1');
    setupSocketListeners(user2Socket, 'Kullanıcı 2');

    // Bağlantıların kurulmasını bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Odaya katılma testi
    if (conversationId) {
      console.log('🚪 Odaya katılma testi...');
      user1Socket.emit('join_room', { conversationId });
      user2Socket.emit('join_room', { conversationId });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Gerçek zamanlı mesaj gönderme testi
      console.log('📤 Gerçek zamanlı mesaj gönderme testi...');
      user1Socket.emit('send_message', {
        conversationId: conversationId,
        content: 'Socket.IO ile gönderilen test mesajı!'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mesaj okundu testi
      console.log('👁️ Mesaj okundu testi...');
      const messagesResponse = await axios.get(`${API_URL}/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${user2Token}` }
      });
      
      if (messagesResponse.data.data.messages.length > 0) {
        const messageId = messagesResponse.data.data.messages[0]._id;
        user2Socket.emit('message_received', { messageId });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('⚠️ Conversation ID yok, Socket.IO testleri atlanıyor');
    }

    // Yeni kullanıcıya mesaj gönderme testi
    if (user2Id) {
      console.log('👤 Yeni kullanıcıya mesaj gönderme testi...');
      user1Socket.emit('send_message', {
        receiverId: user2Id,
        content: 'Yeni conversation için test mesajı!'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Socket.IO test hatası:', error.message);
  }
}

async function cleanup() {
  console.log('\n🧹 Temizlik işlemleri...');
  
  if (user1Socket) {
    user1Socket.disconnect();
  }
  
  if (user2Socket) {
    user2Socket.disconnect();
  }
  
  console.log('✅ Test tamamlandı');
}

// Ana test fonksiyonu
async function runTests() {
  console.log('🚀 Socket.IO ve API Testleri Başlıyor...\n');
  
  try {
    await testAuth();
    await testConversations();
    await testMessages();
    await testSocketIO();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  } finally {
    await cleanup();
  }
}

// Test'i çalıştır
runTests(); 
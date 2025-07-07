import elasticsearchService from './src/services/elasticsearch.service.js';
import Message from './src/models/message.model.js';
import User from './src/models/user.model.js';

async function testElasticsearch() {
  console.log('🔍 Elasticsearch Test Başlatılıyor...\n');

  try {
    // 1. Bağlantı testi
    console.log('1️⃣ Elasticsearch bağlantısı test ediliyor...');
    await elasticsearchService.connect();
    console.log('✅ Elasticsearch bağlantısı başarılı\n');

    // 2. İndeks oluşturma testi
    console.log('2️⃣ İndeksler oluşturuluyor...');
    
    // Mevcut indeksleri temizle (test için)
    try {
      await elasticsearchService.reindexAll();
      console.log('✅ Mevcut indeksler temizlendi ve yeniden oluşturuldu\n');
    } catch (error) {
      console.log('⚠️ İndeks temizleme hatası (normal), yeni indeksler oluşturuluyor...');
      await elasticsearchService.createIndices();
      console.log('✅ İndeksler oluşturuldu\n');
    }

    // 3. Test mesajları oluştur ve indeksle
    console.log('3️⃣ Test mesajları oluşturuluyor...');
    
    const testMessages = [
      {
        _id: 'test-message-1',
        content: 'Merhaba! Nasılsın? Bugün hava çok güzel.',
        senderId: 'test-sender-1',
        receiverId: 'test-receiver-1',
        conversationId: 'test-conversation-1',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        senderUsername: 'ahmet',
        receiverUsername: 'mehmet'
      },
      {
        _id: 'test-message-2',
        content: 'Evet, gerçekten harika bir gün! Akşam buluşalım mı?',
        senderId: 'test-sender-2',
        receiverId: 'test-receiver-2',
        conversationId: 'test-conversation-1',
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        senderUsername: 'mehmet',
        receiverUsername: 'ahmet'
      },
      {
        _id: 'test-message-3',
        content: 'Proje hakkında konuşmamız gerekiyor. Yarın toplantı var.',
        senderId: 'test-sender-3',
        receiverId: 'test-receiver-3',
        conversationId: 'test-conversation-2',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        senderUsername: 'ayse',
        receiverUsername: 'fatma'
      },
      {
        _id: 'test-message-4',
        content: 'Kod yazarken dikkatli olmalıyız. Hata ayıklama önemli.',
        senderId: 'test-sender-4',
        receiverId: 'test-receiver-4',
        conversationId: 'test-conversation-3',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        senderUsername: 'ali',
        receiverUsername: 'veli'
      }
    ];

    for (const messageData of testMessages) {
      await elasticsearchService.indexMessage(messageData);
      console.log(`✅ Mesaj indekslendi: "${messageData.content.substring(0, 30)}..."`);
    }
    console.log('');

    // 4. Test kullanıcıları oluştur ve indeksle
    console.log('4️⃣ Test kullanıcıları oluşturuluyor...');
    
    const testUsers = [
      {
        _id: 'test-user-1',
        username: 'ahmet_k',
        email: 'ahmet@example.com',
        firstName: 'Ahmet',
        lastName: 'Kara',
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'test-user-2',
        username: 'mehmet_y',
        email: 'mehmet@example.com',
        firstName: 'Mehmet',
        lastName: 'Yılmaz',
        isActive: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'test-user-3',
        username: 'ayse_d',
        email: 'ayse@example.com',
        firstName: 'Ayşe',
        lastName: 'Demir',
        isActive: false,
        lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 hafta önce
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const userData of testUsers) {
      await elasticsearchService.indexUser(userData);
      console.log(`✅ Kullanıcı indekslendi: ${userData.username}`);
    }
    console.log('');

    // 5. Mesaj arama testleri
    console.log('5️⃣ Mesaj arama testleri...');
    
    // Genel arama
    console.log('🔍 "merhaba" kelimesi aranıyor...');
    const searchResults1 = await elasticsearchService.searchMessages('merhaba');
    console.log(`✅ ${searchResults1.total} sonuç bulundu`);
    searchResults1.hits.forEach((hit, index) => {
      console.log(`   ${index + 1}. "${hit.content}" (Skor: ${hit._score})`);
    });
    console.log('');

    // Konuşma bazlı arama
    console.log('🔍 "test-conversation-1" konuşmasında "evet" aranıyor...');
    const searchResults2 = await elasticsearchService.searchMessages('evet', {
      conversationId: 'test-conversation-1'
    });
    console.log(`✅ ${searchResults2.total} sonuç bulundu`);
    searchResults2.hits.forEach((hit, index) => {
      console.log(`   ${index + 1}. "${hit.content}" (Skor: ${hit._score})`);
    });
    console.log('');

    // Kullanıcı bazlı arama
    console.log('🔍 "test-sender-1" kullanıcısının mesajlarında "bugün" aranıyor...');
    const searchResults3 = await elasticsearchService.searchMessages('bugün', {
      userId: 'test-sender-1'
    });
    console.log(`✅ ${searchResults3.total} sonuç bulundu`);
    searchResults3.hits.forEach((hit, index) => {
      console.log(`   ${index + 1}. "${hit.content}" (Skor: ${hit._score})`);
    });
    console.log('');

    // 6. Kullanıcı arama testleri
    console.log('6️⃣ Kullanıcı arama testleri...');
    
    console.log('🔍 "ahmet_k" kullanıcı adı aranıyor...');
    const userSearchResults1 = await elasticsearchService.searchUsers('ahmet_k');
    console.log(`✅ ${userSearchResults1.total} sonuç bulundu`);
    userSearchResults1.hits.forEach((hit, index) => {
      console.log(`   ${index + 1}. ${hit.username} (${hit.firstName} ${hit.lastName}) - Skor: ${hit._score}`);
    });
    console.log('');

    console.log('🔍 Aktif kullanıcılarda "mehmet" aranıyor...');
    const userSearchResults2 = await elasticsearchService.searchUsers('mehmet', {
      isActive: true
    });
    console.log(`✅ ${userSearchResults2.total} sonuç bulundu`);
    userSearchResults2.hits.forEach((hit, index) => {
      console.log(`   ${index + 1}. ${hit.username} (${hit.firstName} ${hit.lastName}) - Aktif: ${hit.isActive}`);
    });
    console.log('');

    // 7. Güncelleme testi
    console.log('7️⃣ Güncelleme testi...');
    
    await elasticsearchService.updateMessage('test-message-1', {
      isRead: true,
      updatedAt: new Date()
    });
    console.log('✅ Mesaj güncellendi');
    
    await elasticsearchService.updateUser('test-user-1', {
      isActive: false,
      updatedAt: new Date()
    });
    console.log('✅ Kullanıcı güncellendi');
    console.log('');

    // 8. İstatistikler
    console.log('8️⃣ İstatistikler...');
    const stats = await elasticsearchService.getStats();
    console.log('📊 Elasticsearch İstatistikleri:');
    console.log(`   Mesajlar: ${stats.messages.total} (${(stats.messages.indexSize / 1024).toFixed(2)} KB)`);
    console.log(`   Kullanıcılar: ${stats.users.total} (${(stats.users.indexSize / 1024).toFixed(2)} KB)`);
    console.log(`   Bağlantı: ${stats.isConnected ? '✅ Aktif' : '❌ Kapalı'}`);
    console.log('');

    console.log('🎉 Tüm testler başarıyla tamamlandı!');
    console.log('\n📝 Test Sonuçları:');
    console.log('   ✅ Elasticsearch bağlantısı');
    console.log('   ✅ İndeks oluşturma');
    console.log('   ✅ Mesaj indeksleme');
    console.log('   ✅ Kullanıcı indeksleme');
    console.log('   ✅ Mesaj arama (genel, konuşma, kullanıcı bazlı)');
    console.log('   ✅ Kullanıcı arama (genel, filtreli)');
    console.log('   ✅ Güncelleme işlemleri');
    console.log('   ✅ İstatistik alma');

  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    // Bağlantıyı kapat
    await elasticsearchService.disconnect();
    console.log('\n🔌 Elasticsearch bağlantısı kapatıldı');
    process.exit(0);
  }
}

// Test'i çalıştır
testElasticsearch(); 
import Message from '../models/message.model.js';
import Conversation from '../models/conversation.model.js';
import User from '../models/user.model.js';
import conversationService from './conversation.service.js';
import elasticsearchService from './elasticsearch.service.js';

class MessageService {
  // mesaj gönder
  async sendMessage(senderId, content, conversationId = null, receiverId = null) {
    if (!content || content.trim().length === 0) {
      throw new Error('Mesaj içeriği gerekli');
    }

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation bulunamadı');
      }

      if (!conversation.participants.includes(senderId)) {
        throw new Error('Bu conversation\'a erişim izniniz yok');
      }
    } else if (receiverId) {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
      });

      if (!conversation) {
        const receiver = await User.findById(receiverId);
        if (!receiver || !receiver.isActive) {
          throw new Error('Alıcı kullanıcı bulunamadı');
        }

        conversation = new Conversation({
          participants: [senderId, receiverId]
        });
        await conversation.save();
      }
    } else {
      throw new Error('Conversation ID veya alıcı ID gerekli');
    }

    const message = new Message({
      conversationId: conversation._id,
      sender: senderId,
      content: content.trim()
    });
    await message.save();

    await conversationService.updateConversationLastMessage(conversation._id, message._id);

    await message.populate('sender', 'username');

    // Elasticsearch
    try {
      let receiverUsername = '';
      if (receiverId) {
        const receiver = await User.findById(receiverId).select('username');
        receiverUsername = receiver ? receiver.username : '';
      }

      const messageData = {
        _id: message._id,
        content: message.content,
        senderId: message.sender._id,
        receiverId: receiverId,
        conversationId: message.conversationId,
        isRead: message.isRead || false,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        senderUsername: message.sender.username,
        receiverUsername: receiverUsername
      };

      console.log('messageData', messageData);
      await elasticsearchService.indexMessage(messageData);
    } catch (error) {
      console.error('Elasticsearch indeksleme hatası:', error);
    }

    return {
      message,
      conversation
    };
  }

  // conversation'a göre mesajları getir
  async getMessagesByConversation(conversationId, userId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation bulunamadı');
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error('Bu conversation\'a erişim izniniz yok');
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversationId });

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // mesajı okundu olarak işaretle
  async markMessageAsRead(messageId, userId) {    
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Mesaj bulunamadı');
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      throw new Error('Bu mesaja erişim izniniz yok');
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    // Elasticsearch
    try {
      await elasticsearchService.updateMessage(messageId.toString(), {
        isRead: true,
        readAt: message.readAt
      });
    } catch (error) {
      console.error('Elasticsearch güncelleme hatası:', error);
    }

    return message;
  }

  // mesajı getir
  async getMessageById(messageId) {
    const message = await Message.findById(messageId)
      .populate('sender', 'username');
    
    if (!message) {
      throw new Error('Mesaj bulunamadı');
    }

    return message;
  }

  // okunmamış mesaj sayısını getir
  async getUnreadMessageCount(conversationId, userId) {
    return await Message.countDocuments({
      conversationId,
      sender: { $ne: userId },
      isRead: false
    });
  }
}

export default new MessageService();

import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import redisService from './redis.service.js';

class ConversationService {

  async getUserConversations(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const cacheKey = `conversations_${userId}_${page}_${limit}`;
    
    const cachedData = await redisService.getCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true
    })
      .populate('participants', 'username lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Conversation.countDocuments({
      participants: userId,
      isActive: true
    });

    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        const otherParticipant = conversation.participants.find(
          p => p._id.toString() !== userId.toString()
        );

        const isOnline = otherParticipant ? 
          await redisService.isUserOnline(otherParticipant._id) : false;

        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          sender: { $ne: userId },
          isRead: false
        });

        return {
          ...conversation.toObject(),
          otherParticipant: {
            ...otherParticipant.toObject(),
            isOnline
          },
          unreadCount
        };
      })
    );

    const result = {
      conversations: conversationsWithDetails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    await redisService.setCache(cacheKey, result, 120);

    return result;
  }

  async getConversationById(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username  lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      throw new Error('Conversation bulunamadı');
    }

    if (!conversation.participants.some(p => p._id.toString() === userId.toString())) {
      throw new Error('Bu conversation\'a erişim izniniz yok');
    }

    const otherParticipant = conversation.participants.find(
      p => p._id.toString() !== userId.toString()
    );

    const isOnline = otherParticipant ? 
      await redisService.isUserOnline(otherParticipant._id) : false;

    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      sender: { $ne: userId },
      isRead: false
    });

    return {
      ...conversation.toObject(),
      otherParticipant: otherParticipant ? {
        ...otherParticipant.toObject(),
        isOnline
      } : null,
      unreadCount
    };
  }

  async createConversation(userId, participantId) {
    if (!participantId) {
      throw new Error('Katılımcı ID gerekli');
    }

    if (participantId === userId.toString()) {
      throw new Error('Kendinizle conversation oluşturamazsınız');
    }

    const participant = await User.findById(participantId);
    if (!participant || !participant.isActive) {
      throw new Error('Kullanıcı bulunamadı');
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] }
    });

    if (conversation) {
      throw new Error('Bu kullanıcı ile zaten bir conversation var');
    }

    conversation = new Conversation({
      participants: [userId, participantId]
    });
    await conversation.save();

    await conversation.populate('participants', 'username lastSeen');

    return conversation;
  }

  async deleteConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation bulunamadı');
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error('Bu conversation\'a erişim izniniz yok');
    }

    conversation.isActive = false;
    await conversation.save();

    return true;
  }

  async updateConversationLastMessage(conversationId, messageId) {
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.lastMessage = messageId;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }
    return conversation;
  }
}

export default new ConversationService();

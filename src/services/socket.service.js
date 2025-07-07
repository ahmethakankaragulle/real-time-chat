import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import redisService from './redis.service.js';
import messageService from './message.service.js';
import conversationService from './conversation.service.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3001",
        methods: ["GET", "POST"]
      }
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      console.log(`Kullanıcı bağlandı: ${socket.userId}`);

      await this.handleUserConnection(socket);

      socket.on('join_room', async (data) => {
        await this.handleJoinRoom(socket, data);
      });

      socket.on('send_message', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      socket.on('message_received', async (data) => {
        await this.handleMessageReceived(socket, data);
      });

      socket.on('typing_start', async (data) => {
        await this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', async (data) => {
        await this.handleTypingStop(socket, data);
      });

      socket.on('disconnect', async () => {
        await this.handleUserDisconnection(socket);
      });
    });
  }

  async handleUserConnection(socket) {
    try {
      await redisService.setUserOnline(socket.userId, socket.id);
      
      this.connectedUsers.set(socket.userId, socket.id);

      const conversations = await conversationService.getUserConversations(socket.userId, 1, 100);
      
      conversations.conversations.forEach(conversation => {
        if (conversation.otherParticipant) {
          const otherUserId = conversation.otherParticipant._id;
          const otherSocketId = this.connectedUsers.get(otherUserId.toString());
          
          if (otherSocketId) {
            this.io.to(otherSocketId).emit('user_online', {
              userId: socket.userId,
              username: socket.user.username,
              timestamp: new Date()
            });
          }
        }
      });

      console.log(`Kullanıcı online: ${socket.userId}`);
    } catch (error) {
      console.error('Kullanıcı bağlantı hatası:', error);
    }
  }

  async handleJoinRoom(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID gerekli' });
        return;
      }

      await conversationService.getConversationById(conversationId, socket.userId);
      
      socket.join(`conversation_${conversationId}`);
      
      console.log(`Kullanıcı ${socket.userId} conversation ${conversationId} odasına katıldı`);
      
      socket.emit('room_joined', { conversationId });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { conversationId, content, receiverId } = data;
      
      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Mesaj içeriği gerekli' });
        return;
      }

      const result = await messageService.sendMessage(
        socket.userId, 
        content, 
        conversationId, 
        receiverId
      );

      const messageData = {
        ...result.message.toObject(),
        sender: {
          _id: result.message.sender._id,
          username: result.message.sender.username,
        }
      };

      const roomName = `conversation_${result.message.conversationId}`;
      this.io.to(roomName).emit('new_message', {
        message: messageData,
        conversationId: result.message.conversationId
      });

      socket.emit('message_sent', {
        messageId: result.message._id,
        conversationId: result.message.conversationId
      });

      const conversation = await conversationService.getConversationById(
        result.message.conversationId, 
        socket.userId
      );

      if (conversation.otherParticipant) {
        const otherUserId = conversation.otherParticipant._id;
        const otherSocketId = this.connectedUsers.get(otherUserId.toString());
        
        if (otherSocketId && !this.io.sockets.adapter.rooms.get(roomName)?.has(otherSocketId)) {
          this.io.to(otherSocketId).emit('message_notification', {
            message: messageData,
            conversationId: result.message.conversationId,
            sender: {
              _id: socket.userId,
              username: socket.user.username
            }
          });
        }
      }

      console.log(`Mesaj gönderildi: ${result.message._id} - Conversation: ${result.message.conversationId}`);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      socket.emit('error', { message: error.message });
    }
  }

  async handleMessageReceived(socket, data) {
    try {
      const { messageId } = data;
      
      if (!messageId) {
        socket.emit('error', { message: 'Mesaj ID gerekli' });
        return;
      }

      const message = await messageService.markMessageAsRead(messageId, socket.userId);
      
      const senderSocketId = this.connectedUsers.get(message.sender.toString());
      if (senderSocketId) {
        this.io.to(senderSocketId).emit('message_read', {
          messageId: message._id,
          conversationId: message.conversationId,
          readBy: socket.userId,
          readAt: message.readAt
        });
      }

      console.log(`Mesaj okundu: ${messageId} - Okuyan: ${socket.userId}`);
    } catch (error) {
      console.error('Mesaj okundu işaretleme hatası:', error);
      socket.emit('error', { message: error.message });
    }
  }

  async handleTypingStart(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID gerekli' });
        return;
      }

      const conversation = await conversationService.getConversationById(conversationId, socket.userId);
      
      if (conversation.otherParticipant) {
        const otherUserId = conversation.otherParticipant._id;
        const otherSocketId = this.connectedUsers.get(otherUserId.toString());
        
        if (otherSocketId) {
          this.io.to(otherSocketId).emit('user_typing_start', {
            conversationId,
            userId: socket.userId,
            username: socket.user.username,
            timestamp: new Date()
          });
        }
      }

      console.log(`Kullanıcı yazmaya başladı: ${socket.userId} - Conversation: ${conversationId}`);
    } catch (error) {
      console.error('Typing start hatası:', error);
      socket.emit('error', { message: error.message });
    }
  }

  async handleTypingStop(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        socket.emit('error', { message: 'Conversation ID gerekli' });
        return;
      }

      const conversation = await conversationService.getConversationById(conversationId, socket.userId);
      
      if (conversation.otherParticipant) {
        const otherUserId = conversation.otherParticipant._id;
        const otherSocketId = this.connectedUsers.get(otherUserId.toString());
        
        if (otherSocketId) {
          this.io.to(otherSocketId).emit('user_typing_stop', {
            conversationId,
            userId: socket.userId,
            username: socket.user.username,
            timestamp: new Date()
          });
        }
      }

      console.log(`Kullanıcı yazmayı durdurdu: ${socket.userId} - Conversation: ${conversationId}`);
    } catch (error) {
      console.error('Typing stop hatası:', error);
      socket.emit('error', { message: error.message });
    }
  }

  async handleUserDisconnection(socket) {
    try {
      await redisService.setUserOffline(socket.userId);
      
      this.connectedUsers.delete(socket.userId);

      const conversations = await conversationService.getUserConversations(socket.userId, 1, 100);
      
      conversations.conversations.forEach(conversation => {
        if (conversation.otherParticipant) {
          const otherUserId = conversation.otherParticipant._id;
          const otherSocketId = this.connectedUsers.get(otherUserId.toString());
          
          if (otherSocketId) {
            this.io.to(otherSocketId).emit('user_offline', {
              userId: socket.userId,
              username: socket.user.username,
              timestamp: new Date()
            });
          }
        }
      });

      console.log(`Kullanıcı ayrıldı: ${socket.userId}`);
    } catch (error) {
      console.error('Kullanıcı ayrılma hatası:', error);
    }
  }

  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  sendToRoom(roomName, event, data) {
    this.io.to(roomName).emit(event, data);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

export default new SocketService(); 
import mongoose from 'mongoose';

const autoMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sendDate: {
    type: Date,
    required: true
  },
  isQueued: {
    type: Boolean,
    default: false
  },
  isSent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date,
    default: null
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true
});

autoMessageSchema.index({ sendDate: 1, isQueued: 1 });
autoMessageSchema.index({ senderId: 1, receiverId: 1 });
autoMessageSchema.index({ isSent: 1 });

export default mongoose.model('AutoMessage', autoMessageSchema); 
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'model'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String,
    required: true
  },
  chatType: {
    type: String,
    enum: ['public', 'farmer', 'admin'],
    default: 'public'
  },
  messages: [messageSchema],
  context: {
    type: String,
    default: ''
  },
  tokenUsage: {
    type: Number,
    default: 0
  },
  messageCount: {
    type: Number,
    default: 0
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index cho rate limit query
chatHistorySchema.index({ userId: 1, lastMessageAt: -1 });

// TTL Index: Tự động xóa cứng sau 7 ngày kể từ lần nhắn cuối cùng
chatHistorySchema.index({ lastMessageAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistory;


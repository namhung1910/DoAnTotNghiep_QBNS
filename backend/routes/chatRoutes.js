import express from 'express';
import { sendMessage, getChatHistory, clearChatHistory, getMySession } from '../controllers/chatController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// Public routes có hỗ trợ optionalProtect cho khách vãng lai + user đăng nhập
router.post('/message', optionalProtect, sendMessage);
router.get('/history/:sessionId', optionalProtect, getChatHistory);

// Protected routes (chỉ farmer/admin mới có history)
router.get('/my-session', protect, getMySession); // Lấy session gần nhất của user đăng nhập
router.delete('/history/:sessionId', protect, clearChatHistory);

export default router;


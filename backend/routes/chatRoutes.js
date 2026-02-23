import express from 'express';
import { sendMessage, getChatHistory, clearChatHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (cho khách vãng lai)
router.post('/message', sendMessage);
router.get('/history/:sessionId', getChatHistory);

// Protected routes
router.delete('/history/:sessionId', protect, clearChatHistory);

export default router;


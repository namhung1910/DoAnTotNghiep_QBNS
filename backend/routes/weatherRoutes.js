import express from 'express';
import { getWeather } from '../controllers/weatherController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Chỉ farmer và admin mới được truy cập dữ liệu thời tiết
router.get('/', protect, getWeather);

export default router;

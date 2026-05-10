import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import regionRoutes from './routes/regionRoutes.js';
import farmRoutes from './routes/farmRoutes.js';
import productRoutes from './routes/productRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

import statisticsRoutes from './routes/statisticsRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import landRequestRoutes from './routes/landRequestRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';

// Load env vars
dotenv.config();

// ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat', chatRoutes);

app.use('/api/statistics', statisticsRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/land-requests', landRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hệ thống Quảng Bá Nông Sản đang hoạt động!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint không tồn tại' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  🌾 ================================================ 🌾
  |                                                  |
  |   HỆ THỐNG QUẢNG BÁ VÀ HOẠCH ĐỊNH NÔNG SẢN      |
  |                                                  |
  |   🚀 Server đang chạy tại port: ${PORT}             |
  |   📡 API: http://localhost:${PORT}/api              |
  |   🏥 Health: http://localhost:${PORT}/api/health    |
  |                                                  |
  🌾 ================================================ 🌾
  `);
});


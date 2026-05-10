import express from 'express';
import { register, login, getProfile, updateProfile, getUsers, updateUserStatus, changePassword, changePhone, deleteAccount } from '../controllers/authController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, uploadMemory.single('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/change-phone', protect, changePhone);
router.delete('/account', protect, deleteAccount);

// Admin only routes
router.get('/users', protect, adminOnly, getUsers);
router.put('/users/:id/status', protect, adminOnly, updateUserStatus);

export default router;


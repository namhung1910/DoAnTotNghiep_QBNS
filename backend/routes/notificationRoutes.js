import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-notifications', protect, notificationController.getMyNotifications);
router.put('/:id/read', protect, notificationController.markAsRead);

export default router;

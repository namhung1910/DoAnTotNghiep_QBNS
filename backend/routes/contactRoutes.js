import express from 'express';
import {
  createContactRequest,
  getMyContactRequests,
  updateContactStatus,
  getContactById
} from '../controllers/contactController.js';
import { protect, farmerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes (Khách hàng gửi yêu cầu)
router.post('/', createContactRequest);

// Protected routes (Farmer)
router.get('/my-contacts', protect, farmerOrAdmin, getMyContactRequests);
router.get('/:id', protect, farmerOrAdmin, getContactById);
router.put('/:id/status', protect, farmerOrAdmin, updateContactStatus);

export default router;


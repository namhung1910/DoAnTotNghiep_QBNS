import express from 'express';
import {
  getCropTypes,
  getCropTypeById,
  createCropType,
  updateCropType,
  deleteCropType
} from '../controllers/cropTypeController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getCropTypes);
router.get('/:id', getCropTypeById);

// Admin only routes
router.post('/', protect, adminOnly, createCropType);
router.put('/:id', protect, adminOnly, updateCropType);
router.delete('/:id', protect, adminOnly, deleteCropType);

export default router;


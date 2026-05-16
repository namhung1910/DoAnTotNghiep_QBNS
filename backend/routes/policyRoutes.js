import express from 'express';
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  toggleLike
} from '../controllers/policyController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';

const router = express.Router();

// Public routes — farmer và khách vãng lai đều đọc được
router.get('/', getPolicies);
router.get('/:id', getPolicyById);

// Admin only — tạo/sửa/xóa bài đăng (hỗ trợ upload tối đa 5 ảnh)
router.post(
  '/',
  protect,
  adminOnly,
  uploadMemory.array('postImages', 5),
  createPolicy
);
router.put(
  '/:id',
  protect,
  adminOnly,
  uploadMemory.array('postImages', 5),
  updatePolicy
);
router.delete('/:id', protect, adminOnly, deletePolicy);

// Farmer + Admin — toggle like bài đăng
router.post('/:id/like', protect, toggleLike);

export default router;

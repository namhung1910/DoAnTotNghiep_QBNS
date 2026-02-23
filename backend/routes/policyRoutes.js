import express from 'express';
import {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../controllers/policyController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getPolicies);
router.get('/:id', getPolicyById);

// Admin only routes
router.post('/', protect, adminOnly, createPolicy);
router.put('/:id', protect, adminOnly, updatePolicy);
router.delete('/:id', protect, adminOnly, deletePolicy);

export default router;


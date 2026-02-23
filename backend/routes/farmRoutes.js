import express from 'express';
import {
  getFarms,
  getFarmById,
  getFarmsGeoJSON,
  getMyFarms,
  createFarm,
  updateFarm,
  updateSeasonStatus,
  deleteFarm,
  getFarmStatistics,
  revoke
} from '../controllers/farmController.js';
import { protect, adminOnly, farmerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getFarms);
router.get('/geojson', getFarmsGeoJSON);
router.get('/:id', getFarmById);

// Protected routes (Farmer)
router.get('/user/my-farms', protect, farmerOrAdmin, getMyFarms);
router.put('/:id/season', protect, farmerOrAdmin, updateSeasonStatus);
router.put('/:id', protect, farmerOrAdmin, updateFarm);

// Admin only routes
router.post('/', protect, adminOnly, createFarm);
router.put('/:id/revoke', protect, adminOnly, revoke);
router.delete('/:id', protect, adminOnly, deleteFarm);
router.get('/admin/statistics', protect, adminOnly, getFarmStatistics);

export default router;


import express from 'express';
import {
  getFarms,
  getFarmById,
  getFarmsGeoJSON,
  getMyFarms,
  createFarm,
  updateFarm,
  updateSeasonStatus,
  startNewSeason,
  deleteFarm,
  getFarmStatistics,
  revoke,
  approveFarm,
  rejectFarm,
  getMyHarvestHistory,
  adjustInventory,
  getStockHistory
} from '../controllers/farmController.js';
import { protect, adminOnly, farmerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getFarms);
router.get('/geojson', getFarmsGeoJSON);
router.get('/:id', getFarmById);

// Protected routes (Farmer)
router.get('/user/my-farms', protect, farmerOrAdmin, getMyFarms);
router.get('/user/my-harvest-history', protect, farmerOrAdmin, getMyHarvestHistory);
router.put('/:id/season', protect, farmerOrAdmin, updateSeasonStatus);
router.put('/:id/new-season', protect, farmerOrAdmin, startNewSeason);
router.post('/:id/inventory-adjustment', protect, farmerOrAdmin, adjustInventory);
router.get('/:id/stock-history', protect, farmerOrAdmin, getStockHistory);
router.put('/:id', protect, farmerOrAdmin, updateFarm);

// Farmer hoặc Admin: tạo thửa đất (farmer tạo → pending, admin tạo → approved)
router.post('/', protect, farmerOrAdmin, createFarm);

// Admin only routes
router.put('/:id/approve', protect, adminOnly, approveFarm);
router.put('/:id/reject', protect, adminOnly, rejectFarm);
router.put('/:id/revoke', protect, adminOnly, revoke);
router.delete('/:id', protect, farmerOrAdmin, deleteFarm);
router.get('/admin/statistics', protect, adminOnly, getFarmStatistics);

export default router;

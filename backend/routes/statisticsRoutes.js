import express from 'express';
import {
  getOverviewStatistics,
  getHarvestForecast,
  getStatisticsByRegion,
  getProductsByCertification,
  getPublicStatistics
} from '../controllers/statisticsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.get('/public', getPublicStatistics);

// Admin routes
router.get('/overview', protect, adminOnly, getOverviewStatistics);
router.get('/harvest-forecast', protect, adminOnly, getHarvestForecast);
router.get('/by-region', protect, adminOnly, getStatisticsByRegion);
router.get('/products-by-certification', protect, adminOnly, getProductsByCertification);

export default router;

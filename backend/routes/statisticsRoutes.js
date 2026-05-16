import express from 'express';
import {
  getOverviewStatistics,
  getHarvestForecast,
  getStatisticsByRegion,
  getProductsByCertification,
  getPublicStatistics,
  getHarvestSummary,
  getHistoricalHarvests,
  getDashboardBadges
} from '../controllers/statisticsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.get('/public', getPublicStatistics);

// Admin routes
router.get('/overview', protect, adminOnly, getOverviewStatistics);
router.get('/harvest-forecast', protect, adminOnly, getHarvestForecast);
router.get('/harvest-summary', protect, adminOnly, getHarvestSummary);
router.get('/by-region', protect, adminOnly, getStatisticsByRegion);
router.get('/products-by-certification', protect, adminOnly, getProductsByCertification);
router.get('/historical-harvests', protect, adminOnly, getHistoricalHarvests);
router.get('/badges', protect, getDashboardBadges);

export default router;

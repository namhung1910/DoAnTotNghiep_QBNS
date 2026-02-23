import express from 'express';
import {
  getRegions,
  getRegionById,
  getRegionsGeoJSON,
  createRegion,
  uploadGeoJSON,
  updateRegion,
  deleteRegion,
  findRegionByPoint
} from '../controllers/regionController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getRegions);
router.get('/geojson', getRegionsGeoJSON);
router.get('/:id', getRegionById);
router.post('/find-by-point', findRegionByPoint);

// Admin only routes
router.post('/', protect, adminOnly, createRegion);
router.post('/upload-geojson', protect, adminOnly, upload.single('geojson'), uploadGeoJSON);
router.put('/:id', protect, adminOnly, updateRegion);
router.delete('/:id', protect, adminOnly, deleteRegion);

export default router;


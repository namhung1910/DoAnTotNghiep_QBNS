import express from 'express';
import {
  getRegions,
  getRegionById,
  getRegionsGeoJSON,
  createRegion,
  uploadGeoJSON,
  updateRegion,
  deleteRegion,
  findRegionByPoint,
  renameRegion,
  getNextZoneCode,
  getDeletedRegions,
  hardDeleteRegion,
  restoreRegion
} from '../controllers/regionController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getRegions);
router.get('/geojson', getRegionsGeoJSON);

// Admin only routes - Đặt các route cụ thể lên trước route có params
router.get('/deleted', protect, adminOnly, getDeletedRegions);

// Các route có params (như /:id) phải đặt cuối cùng
router.get('/:id', getRegionById);
router.post('/find-by-point', findRegionByPoint);

// Admin only routes (tiếp tục)
router.post('/', protect, adminOnly, createRegion);
router.post('/upload-geojson', protect, adminOnly, uploadMemory.single('geojson'), uploadGeoJSON);
router.get('/next-zone-code/:zoneType', protect, adminOnly, getNextZoneCode);
router.put('/:id', protect, adminOnly, updateRegion);
router.patch('/:id/rename', protect, adminOnly, renameRegion);
router.delete('/:id', protect, adminOnly, deleteRegion);
router.delete('/:id/hard', protect, adminOnly, hardDeleteRegion);
router.put('/:id/restore', protect, adminOnly, restoreRegion);

export default router;


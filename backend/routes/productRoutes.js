import express from 'express';
import {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getPendingProducts,
  reviewProduct,
  incrementViewCount,
  trackInterest,
  recordSale,
  recordSaleMulti
} from '../controllers/productController.js';
import { protect, adminOnly, farmerOrAdmin } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/:id/view', incrementViewCount); // Tăng lượt xem
router.post('/:id/track-interest', trackInterest); // Ghi nhận click Zalo/Phone

// Farmer routes
router.get('/user/my-products', protect, farmerOrAdmin, getMyProducts);
router.post('/', protect, farmerOrAdmin, uploadMemory.array('productImages', 5), createProduct);
router.put('/:id', protect, farmerOrAdmin, uploadMemory.array('productImages', 5), updateProduct);
router.delete('/:id', protect, farmerOrAdmin, deleteProduct);
router.post('/:id/record-sale', protect, farmerOrAdmin, recordSale);           // Legacy: 1 thửa
router.post('/:id/record-sale-multi', protect, farmerOrAdmin, recordSaleMulti); // Mới: nhiều thửa

// Admin routes
router.get('/admin/pending', protect, adminOnly, getPendingProducts);
router.put('/:id/review', protect, adminOnly, reviewProduct);

export default router;


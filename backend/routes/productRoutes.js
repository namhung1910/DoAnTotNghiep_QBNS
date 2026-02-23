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
  incrementViewCount
} from '../controllers/productController.js';
import { protect, adminOnly, farmerOrAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/:id/view', incrementViewCount); // Increment view count

// Farmer routes
router.get('/user/my-products', protect, farmerOrAdmin, getMyProducts);
router.post('/', protect, farmerOrAdmin, upload.array('productImages', 5), createProduct);
router.put('/:id', protect, farmerOrAdmin, upload.array('productImages', 5), updateProduct);
router.delete('/:id', protect, farmerOrAdmin, deleteProduct);

// Admin routes
router.get('/admin/pending', protect, adminOnly, getPendingProducts);
router.put('/:id/review', protect, adminOnly, reviewProduct);

export default router;

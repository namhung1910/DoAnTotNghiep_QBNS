import express from 'express';
import * as complaintController from '../controllers/complaintController.js';
import { protect, adminOnly as admin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, complaintController.create);
router.get('/my-complaints', protect, complaintController.getMyComplaints);
router.get('/', protect, admin, complaintController.getAll);
router.put('/:id/resolve', protect, admin, complaintController.resolve);

export default router;

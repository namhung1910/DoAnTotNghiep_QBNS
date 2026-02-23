import express from 'express';
import * as landRequestController from '../controllers/landRequestController.js';
import { protect, adminOnly as admin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, landRequestController.create);
router.get('/my-request', protect, landRequestController.getMyRequest);
router.get('/', protect, admin, landRequestController.getAll);
router.put('/:id/status', protect, admin, landRequestController.updateStatus);

export default router;

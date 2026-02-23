import LandRequest from '../models/LandRequest.js';
import User from '../models/User.js';

// Create a new land request
export const create = async (req, res) => {
    try {
        const { purpose, commitment } = req.body;

        // Check if user already has a pending request
        const existingRequest = await LandRequest.findOne({
            user: req.user._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Bạn đang có một yêu cầu chờ duyệt.' });
        }

        const request = new LandRequest({
            user: req.user._id,
            purpose,
            commitment
        });

        await request.save();
        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get current user's request
export const getMyRequest = async (req, res) => {
    try {
        const request = await LandRequest.findOne({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate('assignedFarm');
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all requests (Admin)
export const getAll = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};

        const requests = await LandRequest.find(filter)
            .populate('user', 'fullName username phone email')
            .populate('assignedFarm')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update request status (Admin)
export const updateStatus = async (req, res) => {
    try {
        const { status, responseNote } = req.body;
        const request = await LandRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
        }

        request.status = status;
        if (responseNote) {
            request.responseNote = responseNote;
        }

        await request.save();
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

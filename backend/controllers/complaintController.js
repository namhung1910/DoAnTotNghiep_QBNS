import Complaint from '../models/Complaint.js';

export const create = async (req, res) => {
    try {
        const { title, content, relatedFarm } = req.body;
        const complaint = new Complaint({
            user: req.user._id,
            title,
            content,
            relatedFarm
        });
        await complaint.save();
        res.status(201).json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user._id })
            .populate('relatedFarm', 'name')
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getAll = async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('user', 'fullName username')
            .populate('relatedFarm', 'name')
            .sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resolve = async (req, res) => {
    try {
        const { status, response } = req.body;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: 'Không tìm thấy khiếu nại' });
        }

        complaint.status = status;
        complaint.response = response;
        await complaint.save();

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

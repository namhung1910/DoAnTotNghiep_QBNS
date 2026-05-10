import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import Farm from '../models/Farm.js';

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

        let extraMsg = '';
        if (status === 'resolved' && complaint.relatedFarm) {
            const farm = await Farm.findById(complaint.relatedFarm);
            if (farm) {
                farm.ownerId = complaint.user; // Trả lại chủ sở hữu
                farm.isActive = true; // Hủy trạng thái xóa nếu có
                await farm.save();
                extraMsg = ` Thửa đất "${farm.name}" của bạn đã được khôi phục thành công.`;
            }
        } else if (status === 'rejected' && complaint.relatedFarm) {
            // Xóa cứng thửa đất khỏi cơ sở dữ liệu khi từ chối khiếu nại
            await Farm.findByIdAndDelete(complaint.relatedFarm);
        }

        // Create a notification for the farmer
        if (complaint.user) {
            await Notification.create({
                user: complaint.user,
                message: `Khiếu nại của bạn về "${complaint.title}" đã được HTX trả lời: "${response}".${extraMsg}`,
                type: status === 'resolved' ? 'approval' : 'system',
                relatedId: complaint.relatedFarm
            });
        }

        res.json(complaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

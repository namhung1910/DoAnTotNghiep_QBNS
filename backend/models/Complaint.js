import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'rejected'],
        default: 'pending'
    },
    response: {
        type: String
    },
    relatedFarm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm'
    }
}, {
    timestamps: true
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;

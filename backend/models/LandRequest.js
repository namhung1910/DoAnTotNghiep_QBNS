import mongoose from 'mongoose';

const landRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    purpose: {
        type: String,
        required: [true, 'Vui lòng nhập mục đích sử dụng đất'],
        trim: true
    },
    commitment: {
        type: String,
        required: [true, 'Vui lòng nhập cam kết canh tác'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    responseNote: {
        type: String,
        default: ''
    },
    assignedFarm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm'
    }
}, {
    timestamps: true
});

const LandRequest = mongoose.model('LandRequest', landRequestSchema);
export default LandRequest;

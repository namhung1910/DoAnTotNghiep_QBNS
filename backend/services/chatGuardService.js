import ChatHistory from '../models/ChatHistory.js';

// Cấu hình Rate Limit (số lượng tin nhắn tối đa mỗi giờ)
const RATE_LIMITS = {
    public: 10,
    farmer: 30,
    admin: 50
};

// Từ khoá không liên quan để reject (đơn giản, dễ mở rộng)
const OUT_OF_SCOPE_PATTERNS = [
    /\b(tính(?: toán)?)\b.*\b(đạo hàm|tích phân|hàm số)\b/i,
    /\b(1\+1|2\+2|x\+y)\b/i,
    /\b(giải bài tập|làm bài tập)\b/i,
    /\b(chính trị|tôn giáo|bóng đá|thể thao|game|phim ảnh|showbiz)\b/i,
    /\b(code|lập trình|python|javascript|java|c\+\+|html|css)\b/i
];

export const checkRateLimit = async (userId, sessionId, role = 'public') => {
    const limit = RATE_LIMITS[role] || RATE_LIMITS.public;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    let query = userId ? { userId } : { sessionId };

    // Tổng hợp số lượng tin nhắn trong 1 giờ qua
    const recentChats = await ChatHistory.find({
        ...query,
        lastMessageAt: { $gte: oneHourAgo }
    });

    const totalMessagesInHour = recentChats.reduce((sum, chat) => sum + chat.messageCount, 0);

    if (totalMessagesInHour >= limit) {
        return {
            allowed: false,
            message: `Bạn đã đạt giới hạn ${limit} tin nhắn mỗi giờ cho tài khoản ${role}. Vui lòng thử lại sau 1 giờ.`
        };
    }

    return { allowed: true };
};

export const detectOutOfScope = (message) => {
    if (message.length > 500) {
        return {
            isOutOfScope: true,
            reply: 'Câu hỏi của bạn quá dài (tối đa 500 ký tự). Vui lòng gửi câu hỏi ngắn gọn hơn.'
        };
    }

    for (const pattern of OUT_OF_SCOPE_PATTERNS) {
        if (pattern.test(message)) {
            return {
                isOutOfScope: true,
                reply: 'Mình chỉ hỗ trợ các vấn đề liên quan đến quy trình sản xuất nông nghiệp, số liệu hoạt động của vụ mùa và thông tin Hợp tác xã (HTX). Bạn có câu hỏi nào về các chủ đề này không?'
            };
        }
    }

    return { isOutOfScope: false };
};

export const compressHistory = (messages, keepLast = 5) => {
    // Mỗi lượt chat có 2 messages (user, model), nên 5 lượt chat = 10 messages
    const countToKeep = keepLast * 2;
    if (messages.length > countToKeep) {
        return messages.slice(-countToKeep);
    }
    return messages;
};

/**
 * Extract initials from a name, optimized for Vietnamese names.
 * Takes the first character of the last two words.
 * Example: "Nguyễn Nam Hưng" -> "NH"
 * Example: "Trần Thị Lan" -> "TL"
 * Example: "Admin" -> "A"
 */
export const getInitials = (name) => {
    if (!name) return 'U';

    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    // Take last two parts for Vietnamese style
    const lastTwo = parts.slice(-2);
    return lastTwo
        .map(part => part.charAt(0).toUpperCase())
        .join('');
};

// Đọc URL backend từ biến môi trường, fallback về localhost khi không có .env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/**
 * Normalize a product image (String hoặc { url, public_id }) thành URL hiển thị.
 * Backward-compatible: hỗ trợ cả format cũ lẫn mới.
 * @param {string|{url:string}} img
 * @returns {string} URL đầy đủ
 */
export const getImageUrl = (img) => {
    if (!img) return '';
    // Format mới: object { url, public_id }
    const raw = typeof img === 'object' ? img.url : img;
    if (!raw) return '';
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
    return `${BACKEND_URL}${raw}`;
};

/**
 * Định dạng thời gian bài đăng:
 * - Hôm nay: "Vừa xong", "X phút trước", "X giờ trước" (tròn số)
 * - Cũ hơn: "15 tháng 5 lúc 14:30" hoặc "15 tháng 5 năm 2026 lúc 14:30"
 * @param {string|Date} dateString
 * @returns {string} Chuỗi hiển thị
 */
export const formatPostTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();

    if (isToday) {
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        const diffHrs = Math.floor(diffMins / 60);
        return `${diffHrs} giờ trước`;
    }

    // Nếu không phải hôm nay
    const isSameYear = date.getFullYear() === now.getFullYear();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (isSameYear) {
        return `${day} tháng ${month} lúc ${hours}:${minutes}`;
    } else {
        return `${day} tháng ${month} năm ${year} lúc ${hours}:${minutes}`;
    }
};

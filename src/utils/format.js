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
    return `http://localhost:5000${raw}`;
};

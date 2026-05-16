import { GoogleGenerativeAI } from '@google/generative-ai';

let keys = [];
let instances = [];
let currentIndex = 0;

// Khởi tạo pool các instances của Gemini từ mảng keys
const initGeminiPool = () => {
  if (keys.length > 0 && instances.length > 0) return; // Đã khởi tạo

  // 1. Lấy danh sách keys từ GEMINI_API_KEYS (ưu tiên) hoặc GEMINI_API_KEY
  if (process.env.GEMINI_API_KEYS) {
    keys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  } else if (process.env.GEMINI_API_KEY) {
    keys = [process.env.GEMINI_API_KEY.trim()];
  }

  if (keys.length === 0) {
    console.error('[Gemini Service] CẢNH BÁO: Không tìm thấy API Key nào cho Gemini.');
    return;
  }

  // 2. Tạo instance tương ứng cho mỗi key
  instances = keys.map(key => new GoogleGenerativeAI(key));
  console.log(`[Gemini Service] Đã khởi tạo pool với ${keys.length} API Key(s).`);
};

// Hàm lấy 4 số/ký tự cuối của key để log
export const maskKey = (key) => {
  if (!key) return 'N/A';
  if (key.length <= 4) return key;
  return '...' + key.slice(-4);
};

// Lấy tổng số lượng key đang có (dùng để tính toán số lần retry)
export const getTotalKeys = () => {
  initGeminiPool();
  return keys.length;
};

// Lấy instance tiếp theo theo thuật toán Round-Robin
export const getNextGeminiInstance = () => {
  initGeminiPool();
  
  if (instances.length === 0) return null;

  // Lấy instance tại currentIndex
  const instance = instances[currentIndex];
  const currentKey = keys[currentIndex];
  
  // Tăng currentIndex lên 1, nếu vượt quá độ dài mảng thì quay lại 0
  currentIndex = (currentIndex + 1) % instances.length;

  return {
    ai: instance,
    maskedKey: maskKey(currentKey)
  };
};

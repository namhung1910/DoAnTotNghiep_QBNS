import { GoogleGenerativeAI } from '@google/generative-ai';
import ChatHistory from '../models/ChatHistory.js';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit, detectOutOfScope, compressHistory } from '../services/chatGuardService.js';
import { fetchPublicContext, fetchFarmerContext, fetchAdminContext } from '../services/chatDataService.js';
import { buildPrompt } from '../services/chatPromptService.js';
import { getWeatherData } from '../services/weatherService.js';

let genAI;

// ─── Keyword Detection ────────────────────────────────────────────────────────
// Câu hỏi thuần thời tiết
const WEATHER_KEYWORDS = [
  'thời tiết', 'nhiệt độ', 'lượng mưa', 'mưa', 'nắng', 'độ ẩm',
  'tưới nước', 'phun thuốc', 'nấm bệnh', 'bốc thoát hơi', 'gió to', 'dự báo',
  'sương', 'đất khô', 'đất ướt', 'hạn hán', 'úng nước',
  // Hành động nông nghiệp phụ thuộc thời tiết:
  'bón phân', 'gieo hạt', 'gieo sạ', 'cày bừa',
  'ra đồng', 'làm đất', 'phun xịt', 'bắt sâu', 'tưới',
];

const needsWeatherContext = (message) => {
  const lower = message.toLowerCase();
  return WEATHER_KEYWORDS.some(kw => lower.includes(kw));
};
// ─────────────────────────────────────────────────────────────────────────────

const initGemini = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// @desc    Gửi tin nhắn và nhận phản hồi AI
// @route   POST /api/chat/message
// @access  Public / Protected (optionalProtect)
export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    let role = 'public'; // Mặc định
    let userId = null;

    if (req.user) {
      role = req.user.role;
      userId = req.user._id;
    }

    if (!message) {
      return res.status(400).json({ message: 'Vui lòng nhập tin nhắn' });
    }

    const ai = initGemini();
    if (!ai) {
      return res.status(500).json({
        message: 'AI service chưa được cấu hình',
        reply: 'Xin lỗi, dịch vụ AI đang bảo trì. Vui lòng thử lại sau.'
      });
    }

    const currentSessionId = sessionId || uuidv4();

    // 1. Kiểm tra Rate Limit
    const rateLimitCheck = await checkRateLimit(userId, currentSessionId, role);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        message: 'Rate limit exceeded',
        reply: rateLimitCheck.message
      });
    }

    // 2. Phát hiện câu hỏi ngoại phạm vi & quá dài
    const scopeCheck = detectOutOfScope(message);
    if (scopeCheck.isOutOfScope) {
      // Vẫn lưu vào history nhưng trả về ngay, không gọi AI
      await saveMessageOnly(userId, currentSessionId, role, message, scopeCheck.reply);
      return res.json({ reply: scopeCheck.reply, sessionId: currentSessionId });
    }

    // 3. Với Role là public, ta KHÔNG lưu lịch sử chat vào DB vì có rất nhiều người truy cập, tạo rác
    // Với Role khác, tìm hoặc tạo lịch sử chat
    let chatHistory = null;
    let historyContext = '';

    if (role !== 'public') {
      chatHistory = await ChatHistory.findOne({ sessionId: currentSessionId });
      if (!chatHistory) {
        chatHistory = new ChatHistory({
          userId: userId,
          sessionId: currentSessionId,
          chatType: role,
          messages: []
        });
      }

      // Nén lịch sử để giữ context ngắn gọn
      const recentMessages = compressHistory(chatHistory.messages);
      historyContext = recentMessages
        .map(m => `${m.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${m.content}`)
        .join('\n');
    }
    // Đối với public, do không có session trong DB, historyContext sẽ rỗng.
    // Điều này hoàn toàn thích hợp vì họ chỉ hỏi một vài câu chớp nhoáng.

    // 4. Fetch dữ liệu thực tế
    let userData = null;
    if (role === 'farmer') {
      userData = await fetchFarmerContext(userId);
    } else if (role === 'admin') {
      userData = await fetchAdminContext();
    } else {
      userData = await fetchPublicContext();
    }

    // 4b. Gắn thêm dữ liệu thời tiết nếu cần (chỉ farmer & admin)
    if (role !== 'public' && needsWeatherContext(message)) {
      try {
        const { weatherSummary } = await getWeatherData(role, userId);
        userData = { ...userData, weatherSummary };
      } catch (weatherErr) {
        console.warn('[chat] Không lấy được dữ liệu thời tiết:', weatherErr.message);
        // Không throw — chat vẫn hoạt động bình thường
      }
    }

    // 4. Build Prompt — truyền cả message để được append vào cuối prompt
    const prompt = buildPrompt(role, userData, historyContext, message);

    // Gửi message
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Đếm token (Gemini hỗ trợ đếm token)
    const countResult = await model.countTokens(prompt);
    const estimatedTokens = countResult.totalTokens;

    if (estimatedTokens > 25000) {
      return res.status(400).json({
        message: 'Payload too large',
        reply: 'Nội dung hội thoại quá dài so với giới hạn. Vui lòng xóa lịch sử chat bằng cách làm mới trang và thử lại.'
      });
    }

    // Thực thi gọi AI
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    // 6. Lưu DB nếu không phải public
    if (role !== 'public' && chatHistory) {
      chatHistory.messages.push({ role: 'user', content: message, timestamp: new Date() });
      chatHistory.messages.push({ role: 'model', content: reply, timestamp: new Date() });

      // Update metadata session
      chatHistory.messageCount = chatHistory.messages.length;
      chatHistory.lastMessageAt = new Date();
      chatHistory.tokenUsage += estimatedTokens;

      await chatHistory.save();
    }

    res.json({
      reply,
      sessionId: currentSessionId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      message: 'Lỗi xử lý tin nhắn',
      reply: 'Xin lỗi, có lỗi xảy ra. Hãy thử thu gọn câu hỏi hoặc bắt đầu đoạn hội thoại mới.',
      error: error.message
    });
  }
};

// Helper function để lưu thẳng vào history nếu bị bắt bởi rate limit hoặc out-of-scope (chỉ áp dụng nếu không phải public)
async function saveMessageOnly(userId, sessionId, role, message, reply) {
  if (role === 'public') return;

  let chatHistory = await ChatHistory.findOne({ sessionId });
  if (!chatHistory) {
    chatHistory = new ChatHistory({
      userId: userId,
      sessionId: sessionId,
      chatType: role,
      messages: []
    });
  }
  chatHistory.messages.push({ role: 'user', content: message, timestamp: new Date() });
  chatHistory.messages.push({ role: 'model', content: reply, timestamp: new Date() });
  chatHistory.messageCount = chatHistory.messages.length;
  chatHistory.lastMessageAt = new Date();
  await chatHistory.save();
}

// @desc    Lấy session gần nhất của user đang đăng nhập
// @route   GET /api/chat/my-session
// @access  Private
export const getMySession = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    // Lấy ChatHistory gần nhất (chỉ meta)
    const meta = await ChatHistory.findOne({ userId: req.user._id })
      .sort({ lastMessageAt: -1 })
      .select('_id sessionId chatType messageCount lastMessageAt');

    if (!meta || meta.messageCount === 0) {
      return res.json({ sessionId: null, messages: [], hasMore: false });
    }

    let itemsToGet = limit;
    let startIndex = meta.messageCount - skip - limit;

    // Nếu startIndex < 0, nạp toàn bộ phần còn lại đến 0
    if (startIndex < 0) {
      itemsToGet = limit + startIndex;
      startIndex = 0;
    }

    let messages = [];
    let hasMore = false;

    if (itemsToGet > 0) {
      const doc = await ChatHistory.findById(meta._id)
        .select({
          sessionId: 1,
          messages: { $slice: [startIndex, itemsToGet] }
        });
      messages = doc.messages;
      hasMore = startIndex > 0;
    }

    res.json({
      sessionId: meta.sessionId,
      messages: messages,
      hasMore: hasMore
    });
  } catch (error) {
    console.error('getMySession error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Lấy lịch sử chat theo session
// @route   GET /api/chat/history/:sessionId
// @access  Public / Protected
export const getChatHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const meta = await ChatHistory.findOne({ sessionId: req.params.sessionId })
      .select('_id userId messageCount');

    if (!meta) {
      return res.json({ messages: [], hasMore: false });
    }

    // Bảo mật: Nếu session này thuộc về user A, không cho public hoặc user B xem
    if (meta.userId && (!req.user || req.user._id.toString() !== meta.userId.toString())) {
      // Ngoại lệ: admin có thể xem tất cả nếu có role admin, ta ưu tiên bảo mật tuyệt đối trước
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Không có quyền truy cập lịch sử chat này' });
      }
    }

    let itemsToGet = limit;
    let startIndex = meta.messageCount - skip - limit;

    if (startIndex < 0) {
      itemsToGet = limit + startIndex;
      startIndex = 0;
    }

    let messages = [];
    let hasMore = false;

    if (itemsToGet > 0) {
      const doc = await ChatHistory.findById(meta._id)
        .select({
          messages: { $slice: [startIndex, itemsToGet] }
        });
      messages = doc.messages;
      hasMore = startIndex > 0;
    }

    res.json({ messages, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa lịch sử chat
// @route   DELETE /api/chat/history/:sessionId
// @access  Protected (bởi vì chỉ farmer/admin mới có history)
export const clearChatHistory = async (req, res) => {
  try {
    const chatHistory = await ChatHistory.findOne({ sessionId: req.params.sessionId });

    if (!chatHistory) {
      return res.status(404).json({ message: 'Không tìm thấy lịch sử chat' });
    }

    // Đảm bảo chỉ người tạo ra history này mới được xoá (hoặc Admin)
    if (chatHistory.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền xoá dữ liệu này' });
    }

    await ChatHistory.findOneAndDelete({ sessionId: req.params.sessionId });
    res.json({ message: 'Đã xóa hoàn toàn lịch sử chat khỏi cơ sở dữ liệu' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

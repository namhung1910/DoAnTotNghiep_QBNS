import { GoogleGenerativeAI } from '@google/generative-ai';
import ChatHistory from '../models/ChatHistory.js';
import { v4 as uuidv4 } from 'uuid';

let genAI;

const initGemini = () => {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// System prompts cho từng loại chat
const systemPrompts = {
  public: `Bạn là trợ lý ảo AI chuyên về nông sản Việt Nam. Nhiệm vụ của bạn là:
- Tư vấn thông tin về thị trường nông sản, giá cả theo mùa vụ
- Gợi ý sản phẩm nông sản chất lượng theo mùa
- Giải đáp thắc mắc về các chứng nhận nông sản (VietGAP, GlobalGAP, Organic)
- Hướng dẫn cách chọn mua nông sản tươi ngon
- Cung cấp thông tin về các vùng trồng nổi tiếng tại Việt Nam
Hãy trả lời ngắn gọn, thân thiện và bằng tiếng Việt.`,

  farmer: `Bạn là trợ lý kỹ thuật AI dành cho nông dân Việt Nam. Nhiệm vụ của bạn là:
- Hướng dẫn kỹ thuật canh tác, gieo trồng cho các loại cây trồng
- Tư vấn cách xử lý sâu bệnh hại, bệnh cây trồng
- Giải đáp về phân bón, thuốc bảo vệ thực vật an toàn
- Cung cấp thông tin về quy định pháp luật nông nghiệp
- Hỗ trợ các tiêu chuẩn VietGAP, GlobalGAP
- Tư vấn thời vụ gieo trồng phù hợp với từng vùng miền
Hãy trả lời chi tiết, dễ hiểu và thực tiễn bằng tiếng Việt.`,

  admin: `Bạn là trợ lý quản lý AI dành cho Hợp tác xã nông nghiệp. Nhiệm vụ của bạn là:
- Hỗ trợ phân tích dữ liệu sản xuất, diện tích canh tác
- Tư vấn quy hoạch vùng trồng phù hợp với điều kiện thổ nhưỡng
- Cung cấp thông tin chính sách hỗ trợ nông nghiệp của nhà nước
- Hướng dẫn quản lý hợp tác xã hiệu quả
- Phân tích xu hướng thị trường nông sản
Hãy trả lời chuyên nghiệp, có căn cứ và bằng tiếng Việt.`
};

// @desc    Gửi tin nhắn và nhận phản hồi AI
// @route   POST /api/chat/message
// @access  Public
export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId, chatType = 'public' } = req.body;

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

    // Lấy hoặc tạo session
    const currentSessionId = sessionId || uuidv4();

    // Tìm lịch sử chat
    let chatHistory = await ChatHistory.findOne({ sessionId: currentSessionId });

    if (!chatHistory) {
      chatHistory = new ChatHistory({
        userId: req.user?._id,
        sessionId: currentSessionId,
        chatType,
        messages: []
      });
    }

    // Thêm tin nhắn người dùng
    chatHistory.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Gọi Gemini API
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Tạo context từ lịch sử chat
    const historyContext = chatHistory.messages
      .slice(-10)
      .map(m => `${m.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${m.content}`)
      .join('\n');

    const prompt = `${systemPrompts[chatType] || systemPrompts.public}

Lịch sử hội thoại gần đây:
${historyContext}

Hãy trả lời tin nhắn mới nhất của người dùng một cách hữu ích và thân thiện.`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    // Lưu phản hồi
    chatHistory.messages.push({
      role: 'model',
      content: reply,
      timestamp: new Date()
    });

    await chatHistory.save();

    res.json({
      reply,
      sessionId: currentSessionId
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      message: 'Lỗi xử lý tin nhắn',
      reply: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
      error: error.message
    });
  }
};

// @desc    Lấy lịch sử chat theo session
// @route   GET /api/chat/history/:sessionId
// @access  Public
export const getChatHistory = async (req, res) => {
  try {
    const chatHistory = await ChatHistory.findOne({ sessionId: req.params.sessionId });

    if (!chatHistory) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chatHistory.messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// @desc    Xóa lịch sử chat
// @route   DELETE /api/chat/history/:sessionId
// @access  Private
export const clearChatHistory = async (req, res) => {
  try {
    await ChatHistory.findOneAndDelete({ sessionId: req.params.sessionId });
    res.json({ message: 'Đã xóa lịch sử chat' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};


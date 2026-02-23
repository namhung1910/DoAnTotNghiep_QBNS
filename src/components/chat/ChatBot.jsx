import { useState, useRef, useEffect } from 'react';
import { FiMessageCircle, FiX, FiSend, FiTrash2 } from 'react-icons/fi';
import { GiWheat } from 'react-icons/gi';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ChatBot = ({ chatType = 'public' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    // Tạo hoặc lấy session ID
    const savedSession = localStorage.getItem(`chat_session_${chatType}`);
    if (savedSession) {
      setSessionId(savedSession);
      loadHistory(savedSession);
    } else {
      const newSession = `${chatType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSession);
      localStorage.setItem(`chat_session_${chatType}`, newSession);
    }
  }, [chatType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory = async (session) => {
    try {
      const response = await chatAPI.getHistory(session);
      if (response.data.messages?.length > 0) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Thêm tin nhắn người dùng
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      timestamp: new Date()
    }]);

    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        message: userMessage,
        sessionId,
        chatType
      });

      // Thêm phản hồi AI
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: response.data.reply,
        timestamp: new Date()
      }]);

      // Cập nhật session ID nếu có
      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
        localStorage.setItem(`chat_session_${chatType}`, response.data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      if (sessionId) {
        await chatAPI.clearHistory(sessionId);
      }
      setMessages([]);
      const newSession = `${chatType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSession);
      localStorage.setItem(`chat_session_${chatType}`, newSession);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const getChatTitle = () => {
    switch (chatType) {
      case 'farmer':
        return 'Trợ lý Kỹ thuật';
      case 'admin':
        return 'Trợ lý Quản lý';
      default:
        return 'Trợ lý Nông sản';
    }
  };

  const getWelcomeMessage = () => {
    switch (chatType) {
      case 'farmer':
        return 'Xin chào! Tôi là trợ lý kỹ thuật AI. Hãy hỏi tôi về kỹ thuật canh tác, sâu bệnh, hoặc quy định nông nghiệp.';
      case 'admin':
        return 'Xin chào! Tôi là trợ lý quản lý AI. Tôi có thể giúp bạn phân tích dữ liệu, quy hoạch vùng trồng và tư vấn chính sách.';
      default:
        return 'Xin chào! Tôi là trợ lý AI về nông sản. Hãy hỏi tôi về thị trường, giá cả, hoặc cách chọn mua nông sản!';
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg 
                   flex items-center justify-center transition-all duration-300 
                   hover:scale-110 ${isOpen ? 'hidden' : ''} 
                   bg-gradient-to-r from-primary-500 to-primary-600 text-white`}
      >
        <FiMessageCircle size={24} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl 
                        flex flex-col overflow-hidden animate-fadeIn border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <GiWheat className="text-xl" />
              </div>
              <div>
                <h3 className="font-semibold">{getChatTitle()}</h3>
                <p className="text-xs text-primary-100">Powered by Gemini AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={clearChat}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Xóa cuộc trò chuyện"
              >
                <FiTrash2 size={18} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <GiWheat className="text-primary-600" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
                  <p className="text-sm text-gray-700">{getWelcomeMessage()}</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 
                  ${msg.role === 'user' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-primary-100'}`}
                >
                  {msg.role === 'user' 
                    ? (user?.fullName?.charAt(0) || 'U')
                    : <GiWheat className="text-primary-600" />
                  }
                </div>
                <div className={`p-3 rounded-2xl shadow-sm max-w-[80%] 
                  ${msg.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-700 rounded-tl-none'}`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <GiWheat className="text-primary-600" />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;


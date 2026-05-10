import { useState, useRef, useEffect } from 'react';
import { FiMessageCircle, FiX, FiSend, FiTrash2, FiRefreshCcw } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/format';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const ChatBot = ({ chatType = 'public' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearHistoryModal, setClearHistoryModal] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const isOpenRef = useRef(isOpen);
  const { user } = useAuth();

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const initSession = async () => {
      if (user) {
        try {
          const res = await chatAPI.getMySession({ limit: 20, skip: 0 });
          if (res.data.sessionId && res.data.messages?.length > 0) {
            setSessionId(res.data.sessionId);
            setMessages(res.data.messages);
            setHasMore(res.data.hasMore || false);
          } else {
            const newSession = `${chatType}_${user._id}_${Date.now()}`;
            setSessionId(newSession);
            setMessages([]);
            setHasMore(false);
          }
        } catch {
          const newSession = `${chatType}_${user._id}_${Date.now()}`;
          setSessionId(newSession);
          setMessages([]);
          setHasMore(false);
        }
      } else {
        const guestSession = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(guestSession);
        setMessages([]);
        setHasMore(false);
      }
    };

    initSession();
  }, [chatType, user]);

  const handleScroll = async (e) => {
    const container = e.target;
    if (container.scrollTop === 0 && hasMore && !isFetchingHistory && sessionId) {
      setIsFetchingHistory(true);
      const prevScrollHeight = container.scrollHeight;

      try {
        const currentSkip = messages.filter(m => !m.isError).length;
        const res = await chatAPI.getHistory(sessionId, { limit: 20, skip: currentSkip });

        if (res.data.messages?.length > 0) {
          setMessages(prev => [...res.data.messages, ...prev]);
          setHasMore(res.data.hasMore || false);

          setTimeout(() => {
            if (scrollContainerRef.current) {
              const newScrollHeight = scrollContainerRef.current.scrollHeight;
              scrollContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight;
            }
          }, 0);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Lỗi tải thêm lịch sử:", error);
      } finally {
        setIsFetchingHistory(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen && !isFetchingHistory) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [messages, isOpen]);

  const fetchBotReply = async (userMessage) => {
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        message: userMessage,
        sessionId,
        chatType
      });

      setMessages(prev => [...prev, {
        role: 'model',
        content: response.data.reply,
        timestamp: new Date()
      }]);

      if (!isOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }

      if (response.data.sessionId && !sessionId) {
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const serverErrorMsg = error?.response?.data?.error || '';
      const is503 = error?.response?.status === 503 ||
        error?.message?.includes('503') ||
        String(error).includes('503') ||
        serverErrorMsg.includes('503');

      const errorMessage = is503
        ? 'Hệ thống đang quá tải hoặc đang bảo trì định kỳ. Vui lòng thử lại sau giây lát.'
        : 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.';

      setMessages(prev => [...prev, {
        role: 'model',
        content: errorMessage,
        isError: true,
        originalUserMessage: userMessage,
        timestamp: new Date()
      }]);

      if (!isOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    await fetchBotReply(userMessage);
  };

  const handleRetry = async (originalMessage, index) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
    await fetchBotReply(originalMessage);
  };

  const clearChat = () => {
    setClearHistoryModal(true);
  };

  const confirmClearHistory = async () => {
    if (!user) {
      setMessages([]);
      const guestSession = `public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(guestSession);
      setClearHistoryModal(false);
      return;
    }

    try {
      if (sessionId) {
        await chatAPI.clearHistory(sessionId);
      }
      setMessages([]);
      const newSession = `${chatType}_${user._id}_${Date.now()}`;
      setSessionId(newSession);
      toast.success('Đã xóa lịch sử trò chuyện');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Không thể xóa lịch sử chat. Vui lòng thử lại.');
    } finally {
      setClearHistoryModal(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsClosing(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 650);
  };

  const getChatTitle = () => {
    return 'Dewy';
  };

  const getWelcomeMessage = () => {
    switch (chatType) {
      case 'farmer':
        return 'Chào bạn! Tôi là Dewy 🌱 Trợ lý nông nghiệp của bạn đây. Bạn đang gặp vấn đề gì với mảnh ruộng không? Cứ hỏi tôi nhé, tôi sẵn sàng giúp về kỹ thuật canh tác, sâu bệnh hay lịch mùa vụ!';
      case 'admin':
        return 'Xin chào! Tôi là Dewy 🌿 Tôi sẵn sàng hỗ trợ bạn phân tích dữ liệu hệ thống, quy hoạch vùng trồng hoặc tư vấn chính sách nông nghiệp. Bạn cần tôi giúp gì hôm nay?';
      default:
        return 'Xin chào bạn! Tôi là Dewy 🌾 — trợ lý nông nghiệp thông minh. Bạn muốn tìm hiểu về nông sản, giá cả thị trường, hay chứng nhận chất lượng? Cứ hỏi tôi thoải mái nhé!';
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-16 h-16 rounded-full
          bg-gradient-to-b from-primary-400 to-primary-600 border border-primary-500
          shadow-[0_8px_20px_-6px_rgba(34,197,94,0.6),inset_0_2px_2px_rgba(255,255,255,0.4)]
          flex items-center justify-center transition-all duration-300
          hover:scale-110 active:scale-95 ${(isOpen || isClosing) ? 'hidden' : ''}`}
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_50%)] pointer-events-none" />
        <FiMessageCircle size={24} className="relative z-10 text-white drop-shadow-sm" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white rounded-full text-[10px] font-bold leading-5 flex items-center justify-center shadow-md ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {(isOpen || isClosing) && (
        <div
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-[540px] max-h-[calc(100vh-100px)] 
                       flex flex-col rounded-[28px] sm:rounded-[32px] overflow-hidden 
                       ring-1 ring-black/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
                       mesh-gradient-sophisticated
                       animation-duration-700
                       animate-circularReveal"
          style={{
            animationName: isClosing ? 'circularRevealClose' : 'circularReveal',
            animationDuration: '700ms',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            animationFillMode: 'forwards'
          }}
        >
          {/* Header */}
          <div className="relative z-20 shrink-0 w-full px-5 py-4 flex items-center justify-between bg-gradient-to-b from-primary-500 to-primary-600 shadow-md border-b border-primary-700/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none" />
            <div className="flex items-center space-x-3 relative z-10">
              <div className="relative w-11 h-11 rounded-full p-[2px] flex-shrink-0 bg-white/30 shadow-sm ring-1 ring-white/50">
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  <img src="/assets/DewyLogo.webp" alt="Dewy" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base tracking-wide leading-tight">{getChatTitle()}</h3>
                <p className="text-xs text-primary-100 mt-0.5">Trợ lý nông nghiệp của bạn</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 relative z-10">
              <button
                onClick={clearChat}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ring-1 ring-white/30 hover:ring-white/50"
                title="Xóa cuộc trò chuyện"
              >
                <FiTrash2 size={16} className="text-white" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ring-1 ring-white/30 hover:ring-white/50"
              >
                <FiX size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="relative z-10 flex-1 min-h-0 w-full overflow-y-auto p-4 space-y-5 dynamic-scrollbar"
          >
            {/* Spinner tải lịch sử */}
            {isFetchingHistory && (
              <div className="flex justify-center py-2 relative z-20">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full flex-shrink-0 shadow-[0_4px_10px_rgba(34,197,94,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] border border-primary-400 bg-gradient-to-b from-primary-400 to-primary-600 p-[2px]">
                  <div className="w-full h-full bg-white rounded-full overflow-hidden">
                    <img src="/assets/DewyLogo.webp" alt="Dewy" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="max-w-[85%] px-4 py-3 rounded-[20px] rounded-tl-md bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_5px_15px_-3px_rgba(0,0,0,0.08),inset_0_-3px_5px_rgba(0,0,0,0.02),inset_0_2px_2px_rgba(255,255,255,1)] border border-gray-200/80">
                  <p className="text-sm leading-relaxed">{getWelcomeMessage()}</p>
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden shadow-[0_4px_10px_rgba(34,197,94,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] border border-primary-400 bg-gradient-to-b from-primary-400 to-primary-600 ${msg.role === 'user' ? 'text-white' : 'p-[2px]'}`}>
                  {msg.role === 'user' ? (
                    user?.avatar ? (
                      <img src={user.avatar} alt="User avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-xs font-semibold select-none">{getInitials(user?.fullName)}</span>
                    )
                  ) : (
                    <div className="w-full h-full bg-white rounded-full overflow-hidden">
                      <img src="/assets/DewyLogo.webp" alt="Dewy" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div
                  className={`max-w-[85%] px-4 py-3 rounded-[20px] 
                    ${msg.role === 'user'
                      ? 'rounded-tr-md bg-gradient-to-b from-primary-400 to-primary-600 text-white shadow-[0_5px_15px_-3px_rgba(34,197,94,0.4),inset_0_2px_1px_rgba(255,255,255,0.3)] border border-primary-500'
                      : 'rounded-tl-md bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_5px_15px_-3px_rgba(0,0,0,0.08),inset_0_-3px_5px_rgba(0,0,0,0.02),inset_0_2px_2px_rgba(255,255,255,1)] border border-gray-200/80'
                    }`}
                >
                  {msg.role === 'model' ? (
                    <div>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="text-sm leading-relaxed mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                          ul: ({ children }) => <ul className="text-sm list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="text-sm list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          h1: ({ children }) => <p className="text-sm font-semibold text-slate-800 mt-2 mb-1">{children}</p>,
                          h2: ({ children }) => <p className="text-sm font-semibold text-slate-800 mt-2 mb-1">{children}</p>,
                          h3: ({ children }) => <p className="text-sm font-semibold text-slate-800 mt-1.5 mb-0.5">{children}</p>,
                          code: ({ children }) => <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {msg.isError && msg.originalUserMessage && (
                        <button
                          onClick={() => handleRetry(msg.originalUserMessage, idx)}
                          disabled={loading}
                          className="mt-2.5 flex items-center space-x-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition-all border border-primary-100 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group w-max"
                        >
                          <FiRefreshCcw size={13} className="group-hover:rotate-180 transition-transform duration-500 ease-in-out" />
                          <span>Gửi lại</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-full flex-shrink-0 shadow-[0_4px_10px_rgba(34,197,94,0.3),inset_0_2px_2px_rgba(255,255,255,0.4)] border border-primary-400 bg-gradient-to-b from-primary-400 to-primary-600 p-[2px]">
                  <div className="w-full h-full bg-white rounded-full overflow-hidden">
                    <img src="/assets/DewyLogo.webp" alt="Dewy" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="px-4 py-3 rounded-[20px] rounded-tl-md bg-gradient-to-b from-white to-slate-50 shadow-[0_5px_15px_-3px_rgba(0,0,0,0.08),inset_0_-3px_5px_rgba(0,0,0,0.02),inset_0_2px_2px_rgba(255,255,255,1)] border border-gray-200/80">
                  <div className="flex space-x-1 items-center h-5">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form - Background trong suốt để nhìn xuyên thấu */}
          <form onSubmit={sendMessage} className="relative z-20 shrink-0 w-full p-4 bg-transparent border-t border-green-500/10">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 5) : 1}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="w-full px-4 py-3 min-h-[44px] rounded-[16px] outline-none bg-white/60 backdrop-blur-md border border-white/50 shadow-inner focus:bg-white/90 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 text-sm text-slate-800 placeholder:text-slate-400 transition-all resize-none dynamic-scrollbar"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-[16px] flex-shrink-0 overflow-hidden 
                           bg-gradient-to-b from-primary-400 to-primary-600 text-white 
                           shadow-[0_5px_15px_-3px_rgba(34,197,94,0.4),inset_0_2px_1px_rgba(255,255,255,0.3)] 
                           border border-primary-500 
                           transition-all duration-200 hover:scale-105 active:scale-95 
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 
                           flex items-center justify-center"
              >
                <FiSend size={18} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clear Chat History Confirm Modal */}
      <Modal isOpen={clearHistoryModal} onClose={() => setClearHistoryModal(false)} title="Xóa lịch sử trò chuyện" size="sm">
        <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này không?</p>
        <div className="flex space-x-3">
          <Button onClick={() => setClearHistoryModal(false)} variant="secondary" className="flex-1">
            Hủy
          </Button>
          <Button onClick={confirmClearHistory} variant="danger" className="flex-1">
            Xóa
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ChatBot;
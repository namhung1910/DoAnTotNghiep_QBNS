import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';
import { FiHeart, FiChevronDown } from 'react-icons/fi';
import { policyAPI } from '../../services/api';
import Avatar from '../../components/common/Avatar';
import { formatPostTime } from '../../utils/format';

// Danh mục Tab lọc bài đăng
const CATEGORIES = ['Tất cả', 'Hỗ trợ', 'Quy định', 'Khuyến nông', 'Bảo hiểm', 'Vay vốn', 'Khác'];

// ── Image Grid Gallery ─────────────────────────────────────────────────────────
const ImageGrid = ({ images, onLightboxOpen }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;
  if (count === 1) return (
    <div className="mt-3 rounded-xl overflow-hidden cursor-pointer" onClick={() => onLightboxOpen(0)}>
      <img src={images[0].url} alt="ảnh bài đăng" className="w-full max-h-80 object-cover" />
    </div>
  );
  if (count === 2) return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
      {images.map((img, i) => (
        <div key={i} className="cursor-pointer" onClick={() => onLightboxOpen(i)}>
          <img src={img.url} alt="" className="w-full h-48 object-cover" />
        </div>
      ))}
    </div>
  );
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
      <div className="cursor-pointer" onClick={() => onLightboxOpen(0)}>
        <img src={images[0].url} alt="" className="w-full h-56 object-cover" />
      </div>
      <div className={`grid gap-1 ${count > 3 ? 'grid-rows-2' : 'grid-rows-1'}`}>
        {images.slice(1, 5).map((img, i) => (
          <div key={i} className="relative cursor-pointer" onClick={() => onLightboxOpen(i + 1)}>
            <img
              src={img.url} alt=""
              className="w-full h-full object-cover"
              style={{ minHeight: count > 3 ? '6.5rem' : '13rem', maxHeight: count > 3 ? '6.5rem' : '13rem' }}
            />
            {count > 5 && i === 2 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">+{count - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── PostCard (Farmer view) ────────────────────────────────────────────────────
const PostCard = ({ post, userId, onLike }) => {
  const [lightboxIdx, setLightboxIdx] = useState(-1);
  const liked = post.likes?.some(id => id === userId || id?._id === userId || id?.toString?.() === userId);
  const cleanHtml = DOMPurify.sanitize(post.content || '');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={post.createdBy?.avatar} name={post.createdBy?.fullName || 'HTX Nông sản'} size="md" />
        <div>
          <p className="font-semibold text-gray-900 text-sm">{post.createdBy?.fullName || 'HTX Nông sản'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">{formatPostTime(post.createdAt)}</span>
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-primary-50 text-primary-700">{post.category}</span>
          </div>
        </div>
      </div>

      {/* Tiêu đề */}
      <h3 className="font-bold text-gray-900 text-base">{post.title}</h3>

      {/* Nội dung rich text */}
      <div
        className="prose prose-sm max-w-none mt-2 text-gray-700 tiptap-content"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />

      {/* Ảnh gallery */}
      <ImageGrid images={post.images} onLightboxOpen={(i) => setLightboxIdx(i)} />
      {lightboxIdx >= 0 && (
        <Lightbox
          open={lightboxIdx >= 0}
          close={() => setLightboxIdx(-1)}
          index={lightboxIdx}
          slides={(post.images || []).map(img => ({ src: img.url }))}
        />
      )}

      {/* Footer: nút tim ❤️ */}
      <div className="mt-3 pt-3 border-t border-gray-50">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm font-medium ${
            liked
              ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <FiHeart
            size={16}
            className={`transition-transform ${liked ? 'scale-110 fill-rose-500 stroke-rose-500' : ''}`}
          />
          <span>{post.likes?.length || 0}</span>
        </button>
      </div>
    </div>
  );
};

// ── Trang chính Farmer Bảng tin ────────────────────────────────────────────────
const FarmerNewsfeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeCategory !== 'Tất cả' ? { category: activeCategory } : {};
      const { data } = await policyAPI.getAll(params);
      setPosts(data);
    } catch {
      toast.error('Không thể tải bài đăng');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleLike = async (postId) => {
    try {
      const { data } = await policyAPI.toggleLike(postId);
      // Cập nhật UI ngay lập tức (optimistic update)
      setPosts(prev => prev.map(p => {
        if (p._id !== postId) return p;
        const userId = user?._id;
        const liked = data.liked;
        const newLikes = liked
          ? [...(p.likes || []), userId]
          : (p.likes || []).filter(id => {
              const idStr = typeof id === 'object' ? id?._id?.toString() : id?.toString();
              return idStr !== userId;
            });
        return { ...p, likes: newLikes };
      }));
    } catch {
      toast.error('Không thể thực hiện thao tác này');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bảng tin HTX</h1>
        <p className="text-sm text-gray-500 mt-0.5">Thông báo, chính sách và tin tức từ HTX Nông sản</p>
      </div>

      {/* Tab lọc category */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Danh sách bài đăng */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="flex gap-3 items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/6" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiChevronDown size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có bài đăng nào</p>
          <p className="text-sm mt-1">HTX chưa có thông báo nào trong danh mục này</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              userId={user?._id}
              onLike={handleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerNewsfeedPage;

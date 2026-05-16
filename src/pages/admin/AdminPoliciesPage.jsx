import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import toast from 'react-hot-toast';
import {
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter,
  FiAlignRight, FiImage, FiX, FiMoreVertical, FiEdit2, FiTrash2,
  FiHeart, FiChevronDown, FiPlusCircle
} from 'react-icons/fi';
import DOMPurify from 'dompurify';
import { policyAPI } from '../../services/api';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { formatPostTime } from '../../utils/format';

// Danh mục Tab lọc bài đăng
const CATEGORIES = ['Tất cả', 'Hỗ trợ', 'Quy định', 'Khuyến nông', 'Bảo hiểm', 'Vay vốn', 'Khác'];
const MAX_IMAGES = 5;

// ── Toolbar TipTap ────────────────────────────────────────────────────────────
const ToolbarButton = ({ active, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors text-sm ${
      active
        ? 'bg-primary-100 text-primary-700'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);

const EditorToolbar = ({ editor }) => {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <ToolbarButton title="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><FiBold /></ToolbarButton>
      <ToolbarButton title="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><FiItalic /></ToolbarButton>
      <ToolbarButton title="Gạch chân" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><FiUnderline /></ToolbarButton>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolbarButton title="Danh sách" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><FiList /></ToolbarButton>
      <ToolbarButton title="Tiêu đề" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span className="font-bold text-xs">H2</span>
      </ToolbarButton>
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <ToolbarButton title="Căn trái" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><FiAlignLeft /></ToolbarButton>
      <ToolbarButton title="Căn giữa" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><FiAlignCenter /></ToolbarButton>
      <ToolbarButton title="Căn phải" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><FiAlignRight /></ToolbarButton>
    </div>
  );
};

// ── Image Grid Gallery ────────────────────────────────────────────────────────
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
  // 3-5 ảnh: ảnh to bên trái + grid nhỏ bên phải
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
      <div className="cursor-pointer" onClick={() => onLightboxOpen(0)}>
        <img src={images[0].url} alt="" className="w-full h-56 object-cover" />
      </div>
      <div className={`grid gap-1 ${count > 3 ? 'grid-rows-2' : 'grid-rows-1'}`}>
        {images.slice(1, 5).map((img, i) => (
          <div key={i} className="relative cursor-pointer" onClick={() => onLightboxOpen(i + 1)}>
            <img src={img.url} alt="" className="w-full h-full object-cover" style={{ minHeight: count > 3 ? '6.5rem' : '13rem', maxHeight: count > 3 ? '6.5rem' : '13rem' }} />
            {/* Overlay "+N" cho ảnh cuối nếu có nhiều hơn 4 */}
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

// ── PostCard (Admin view) ─────────────────────────────────────────────────────
const PostCard = ({ post, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(-1);
  const menuRef = useRef(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cleanHtml = DOMPurify.sanitize(post.content || '');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={post.createdBy?.avatar} name={post.createdBy?.fullName || 'Admin'} size="md" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{post.createdBy?.fullName || 'Admin'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">{formatPostTime(post.createdAt)}</span>
              <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-primary-50 text-primary-700">{post.category}</span>
            </div>
          </div>
        </div>
        {/* Nút 3 chấm */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(p => !p)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <FiMoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(post); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiEdit2 size={14} /> Sửa bài
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(post); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <FiTrash2 size={14} /> Xóa bài
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tiêu đề */}
      <h3 className="font-bold text-gray-900 mt-3 text-base">{post.title}</h3>

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

      {/* Footer: lượt tim */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-gray-500">
        <FiHeart size={15} className="text-rose-400" />
        <span className="text-sm">{post.likes?.length || 0} lượt thích</span>
      </div>
    </div>
  );
};

// ── PostComposer (Form đăng / sửa bài) ────────────────────────────────────────
const PostComposer = ({ initialData, onSuccess, onCancel }) => {
  const isEdit = !!initialData;
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState(initialData?.category || 'Khác');
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  // Ảnh cũ (khi edit) — giữ lại danh sách và cho phép xóa từng ảnh
  const [keptImages, setKeptImages] = useState(initialData?.images || []);
  const [removedPublicIds, setRemovedPublicIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Nội dung bài đăng...' }),
    ],
    content: initialData?.content || '',
  });

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    const totalAfter = keptImages.length + newFiles.length + selected.length;
    if (totalAfter > MAX_IMAGES) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh`);
      return;
    }
    setNewFiles(prev => [...prev, ...selected]);
    setNewPreviews(prev => [...prev, ...selected.map(f => URL.createObjectURL(f))]);
  };

  const removeNewFile = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeKeptImage = (img) => {
    setKeptImages(prev => prev.filter(x => x.public_id !== img.public_id));
    setRemovedPublicIds(prev => [...prev, img.public_id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const html = editor?.getHTML() || '';
    if (!title.trim() || !html || html === '<p></p>') {
      toast.error('Vui lòng nhập tiêu đề và nội dung');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('category', category);
      fd.append('content', html);
      // Ảnh mới
      newFiles.forEach(f => fd.append('postImages', f));
      // Ảnh cũ bị xóa (khi sửa)
      if (isEdit && removedPublicIds.length > 0) {
        fd.append('removedImageIds', JSON.stringify(removedPublicIds));
      }

      if (isEdit) {
        await policyAPI.update(initialData._id, fd);
        toast.success('Đã cập nhật bài đăng');
      } else {
        await policyAPI.create(fd);
        toast.success('Đã đăng bài thành công');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const totalImages = keptImages.length + newFiles.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tiêu đề */}
      <input
        type="text"
        placeholder="Tiêu đề bài đăng *"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900 font-medium"
      />

      {/* Danh mục */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.filter(c => c !== 'Tất cả').map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Rich text editor */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <EditorToolbar editor={editor} />
        <EditorContent
          editor={editor}
          className="min-h-32 px-4 py-3 text-gray-800 focus:outline-none"
        />
      </div>

      {/* Preview ảnh */}
      {totalImages > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Ảnh cũ (khi edit) */}
          {keptImages.map((img) => (
            <div key={img.public_id} className="relative w-20 h-20 rounded-lg overflow-hidden group">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeKeptImage(img)}
                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiX size={18} />
              </button>
            </div>
          ))}
          {/* Ảnh mới */}
          {newPreviews.map((src, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewFile(i)}
                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiX size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Nút chọn ảnh + Submit */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={totalImages >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <FiImage size={16} />
          Thêm ảnh {totalImages > 0 && `(${totalImages}/${MAX_IMAGES})`}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} type="button">Hủy</Button>
          )}
          <Button variant="primary" size="sm" loading={loading} type="submit">
            {isEdit ? 'Lưu thay đổi' : 'Đăng bài'}
          </Button>
        </div>
      </div>
    </form>
  );
};

// ── Trang chính Admin Bảng tin ────────────────────────────────────────────────
const AdminPoliciesPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [editPost, setEditPost] = useState(null);        // bài đang sửa
  const [deletePost, setDeletePost] = useState(null);    // bài đang xóa
  const [showComposer, setShowComposer] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deletePost) return;
    setDeleting(true);
    try {
      await policyAPI.delete(deletePost._id);
      toast.success('Đã xóa bài đăng');
      setDeletePost(null);
      fetchPosts();
    } catch {
      toast.error('Xóa bài thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng tin HTX</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý thông báo, chính sách và tin tức cho nông dân</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={FiPlusCircle}
          onClick={() => { setShowComposer(true); setEditPost(null); }}
        >
          Đăng bài mới
        </Button>
      </div>

      {/* Modal đăng bài mới */}
      <Modal
        isOpen={showComposer && !editPost}
        onClose={() => setShowComposer(false)}
        title="Đăng bài mới"
        size="lg"
      >
        <PostComposer
          onSuccess={() => { setShowComposer(false); fetchPosts(); }}
          onCancel={() => setShowComposer(false)}
        />
      </Modal>

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
          <p className="text-sm mt-1">Hãy đăng bài đầu tiên để thông báo đến nông dân</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              onEdit={(p) => { setEditPost(p); setShowComposer(false); }}
              onDelete={(p) => setDeletePost(p)}
            />
          ))}
        </div>
      )}

      {/* Modal sửa bài */}
      <Modal
        isOpen={!!editPost}
        onClose={() => setEditPost(null)}
        title="Chỉnh sửa bài đăng"
        size="lg"
      >
        {editPost && (
          <PostComposer
            initialData={editPost}
            onSuccess={() => { setEditPost(null); fetchPosts(); }}
            onCancel={() => setEditPost(null)}
          />
        )}
      </Modal>

      {/* Modal xác nhận xóa */}
      <Modal
        isOpen={!!deletePost}
        onClose={() => setDeletePost(null)}
        title="Xác nhận xóa bài đăng"
        size="sm"
      >
        <p className="text-gray-600 mb-2">
          Bạn có chắc muốn xóa bài đăng <strong>"{deletePost?.title}"</strong>?
        </p>
        <p className="text-sm text-gray-400 mb-5">
          Tất cả ảnh đính kèm sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletePost(null)}>Hủy</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete} icon={FiTrash2}>
            Xóa bài
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPoliciesPage;

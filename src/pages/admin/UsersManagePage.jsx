import { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiEdit2, FiLock, FiUnlock, FiSearch, FiUser } from 'react-icons/fi';
import { authAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';

const UsersManagePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('farmer');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    address: '',
    role: 'farmer'
  });

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getUsers({
        role: roleFilter,
        search,
        page,
        limit: 10
      });
      setUsers(response.data.users || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await authAPI.updateUserStatus(userId, { isActive: !currentStatus });
      toast.success(currentStatus ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.username || !newUser.password || !newUser.fullName) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setCreating(true);
      await authAPI.register(newUser);
      toast.success('Đã tạo tài khoản mới!');
      setShowCreateModal(false);
      setNewUser({
        username: '',
        password: '',
        fullName: '',
        phone: '',
        address: '',
        role: 'farmer'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setCreating(false);
    }
  };

  if (loading && users.length === 0) {
    return <Loading fullScreen={false} message="Đang tải..." />;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FiUsers className="mr-2 text-primary-500" />
            Quản lý người dùng
          </h1>
          <p className="text-gray-600">Quản lý tài khoản nông dân và quản trị viên</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          icon={FiPlus}
        >
          Thêm nông dân
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
                placeholder="Tìm theo tên hoặc username..."
              />
            </div>
            <Button type="submit" variant="secondary">Tìm</Button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={() => { setRoleFilter('farmer'); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition-colors ${roleFilter === 'farmer' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
            >
              Nông dân
            </button>
            <button
              onClick={() => { setRoleFilter('admin'); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition-colors ${roleFilter === 'admin' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
            >
              Quản trị
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Người dùng</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Username</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Số điện thoại</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Địa chỉ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Trạng thái</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <FiUser className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.fullName}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role === 'admin' ? 'Quản trị' : 'Nông dân'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.username}</td>
                    <td className="py-3 px-4 text-gray-600">{user.phone || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{user.address || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleUserStatus(user._id, user.isActive)}
                          className={`p-2 rounded-lg transition-colors ${user.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {user.isActive ? <FiLock /> : <FiUnlock />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
            <p className="text-gray-500">Không tìm thấy người dùng</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-gray-600">Trang {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Thêm nông dân mới"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              className="input-field"
              placeholder="Nguyễn Văn A"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="input-field"
                placeholder="nongdan_a"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="input-field"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              className="input-field"
              placeholder="0912345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <input
              type="text"
              value={newUser.address}
              onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
              className="input-field"
              placeholder="Xã ABC, Kiến Xương, Thái Bình"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              loading={creating}
              variant="primary"
              className="flex-1"
            >
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersManagePage;


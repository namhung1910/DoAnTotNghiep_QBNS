import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiCamera, FiEye, FiEyeOff, FiAlertTriangle, FiSave, FiLock, FiPhone, FiUser } from 'react-icons/fi';
import { getInitials } from '../../utils/format';

const AccountSettingsPage = () => {
    const { user, updateProfile, deleteAccount, logout } = useAuth();

    // Section 1: Avatar & Profile Basic
    const fileInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar?.includes('http') ? user.avatar : `${import.meta.env.VITE_API_URL}${user?.avatar || ''}`);
    const [avatarFile, setAvatarFile] = useState(null);
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || '',
        address: user?.address || ''
    });
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Section 3: Change Phone
    const [phoneData, setPhoneData] = useState({
        phone: user?.phone || '',
        currentPassword: ''
    });
    const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
    const [showPhonePass, setShowPhonePass] = useState(false);

    // Section 4: Change Password
    const [passData, setPassData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isUpdatingPass, setIsUpdatingPass] = useState(false);
    const [showPasses, setShowPasses] = useState({
        current: false, new: false, confirm: false
    });

    // Section 5: Delete Account
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePass, setShowDeletePass] = useState(false);

    // --- Handlers ---
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn file hình ảnh hợp lệ');
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!profileData.fullName.trim()) {
            return toast.error('Vui lòng không để trống họ tên');
        }
        try {
            setIsUpdatingProfile(true);
            const formData = new FormData();
            formData.append('fullName', profileData.fullName);
            formData.append('address', profileData.address);
            if (avatarFile) formData.append('avatar', avatarFile);

            await updateProfile(formData);
            // AuthContext automatically shows success toast and updates the user
            setAvatarFile(null); // Reset file to prevent re-upload on generic changes
        } catch (error) {
            // Handled in Context
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleSavePhone = async (e) => {
        e.preventDefault();
        if (!phoneData.phone.trim() || !phoneData.currentPassword) {
            return toast.error('Vui lòng nhập đủ thông tin SĐT và mật khẩu');
        }
        try {
            setIsUpdatingPhone(true);
            const res = await authAPI.changePhone({
                phone: phoneData.phone,
                currentPassword: phoneData.currentPassword
            });
            toast.success('Đã cập nhật số điện thoại!');
            // Update user payload manually inside local Context storage
            const updatedUser = res.data;
            updateProfile(updatedUser); // This triggers generic merge
            setPhoneData({ ...phoneData, currentPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cập nhật SĐT thất bại');
        } finally {
            setIsUpdatingPhone(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (passData.newPassword.length < 6) {
            return toast.error('Mật khẩu mới phải từ 6 ký tự trở lên');
        }
        if (passData.newPassword !== passData.confirmPassword) {
            return toast.error('Mật khẩu xác nhận không khớp');
        }
        try {
            setIsUpdatingPass(true);
            await authAPI.changePassword({
                currentPassword: passData.currentPassword,
                newPassword: passData.newPassword
            });
            toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            logout();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
        } finally {
            setIsUpdatingPass(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            return toast.error('Vui lòng nhập mật khẩu xác nhận!');
        }
        try {
            setIsDeleting(true);
            await deleteAccount({ currentPassword: deletePassword });
            // Context handles toast and logout
        } catch (error) {
            // Context handles toast
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Compact Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 font-sans">
                    Cài đặt tài khoản
                    <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                </h1>
                <p className="text-sm text-gray-500 mt-1">Quản lý định danh và thiết lập bảo mật hồ sơ {user?.role === 'admin' ? 'quản trị viên' : 'nông dân'} của bạn.</p>
            </div>

            {/* Compact Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">

                {/* Card 1: Thông tin cơ bản (Grid Span 2) */}
                <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100/50">
                                <FiUser size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 font-sans">Thông tin cơ bản</h2>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                {/* Avatar Section - Compact */}
                                <div className="relative shrink-0">
                                    <div className="w-28 h-28 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-sm transition-transform group-hover:scale-[1.02]">
                                        {avatarPreview && avatarPreview.length > 30 ? (
                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-3xl">
                                                {getInitials(user?.fullName)}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 p-2.5 text-white rounded-xl shadow-md bg-primary-600 hover:bg-primary-700 transition-all hover:scale-110 active:scale-95 z-20"
                                    >
                                        <FiCamera size={16} />
                                    </button>
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
                                </div>

                                {/* Form Fields Section */}
                                <div className="flex-1 w-full grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Họ và tên</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-primary-500 focus:bg-white transition-all outline-none font-medium text-gray-900 text-sm"
                                            value={profileData.fullName}
                                            onChange={e => setProfileData({ ...profileData, fullName: e.target.value })}
                                            required
                                            placeholder="Nguyễn Văn A"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-0.5">Địa chỉ cư trú</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:border-primary-500 focus:bg-white transition-all outline-none font-medium text-gray-900 text-sm"
                                            value={profileData.address}
                                            onChange={e => setProfileData({ ...profileData, address: e.target.value })}
                                            placeholder="Thôn..., Xã..., Huyện..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-gray-50">
                                <button type="submit" disabled={isUpdatingProfile} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
                                    {isUpdatingProfile ? 'Đang lưu...' : <><FiSave size={16} /> Lưu thay đổi</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Card 2: Thông tin liên lạc (Grid Span 1) */}
                <div className="md:col-span-1 bg-blue-50/40 rounded-3xl p-6 shadow-sm border border-blue-100/50 text-gray-900 flex flex-col justify-between group transition-all hover:shadow-md">
                    <div className="relative z-10 w-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                                <FiPhone size={20} />
                            </div>
                            <h2 className="text-lg font-bold font-sans">Thông tin liên lạc</h2>
                        </div>

                        <form onSubmit={handleSavePhone} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">Số điện thoại mới</label>
                                <input
                                    type="text"
                                    pattern="[0-9]{10,11}"
                                    className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm"
                                    value={phoneData.phone}
                                    onChange={e => setPhoneData({ ...phoneData, phone: e.target.value })}
                                    required
                                    placeholder={user?.phone || '0xxx'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">Xác thực mật khẩu</label>
                                <div className="relative">
                                    <input
                                        type={showPhonePass ? "text" : "password"}
                                        className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-sm pr-10"
                                        value={phoneData.currentPassword}
                                        onChange={e => setPhoneData({ ...phoneData, currentPassword: e.target.value })}
                                        required
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowPhonePass(!showPhonePass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
                                        {showPhonePass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={isUpdatingPhone} className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]">
                                {isUpdatingPhone ? 'Đang cập nhật...' : 'Cập nhật SĐT'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Card 3: Đổi mật khẩu */}
                <div className={`${user?.role === 'admin' ? 'md:col-span-3' : 'md:col-span-2'} bg-gray-50/40 rounded-3xl p-6 shadow-sm border border-gray-100 relative group transition-all hover:shadow-md`}>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                                <FiLock size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 font-sans">Đổi mật khẩu</h2>
                        </div>

                        <form onSubmit={handleSavePassword} className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Mật khẩu hiện tại</label>
                                        <div className="relative">
                                            <input
                                                type={showPasses.current ? "text" : "password"}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-orange-500 transition-all outline-none font-medium text-sm pr-10"
                                                value={passData.currentPassword}
                                                onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                                                required
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setShowPasses({ ...showPasses, current: !showPasses.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                {showPasses.current ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                            </button>
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-500 leading-relaxed font-medium">
                                            Vui lòng xác nhận mật khẩu hiện tại trước khi thiết lập mật khẩu mới.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showPasses.new ? "text" : "password"}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-orange-500 transition-all outline-none font-medium text-sm pr-10"
                                                value={passData.newPassword}
                                                onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                                                required
                                                placeholder="Tối thiểu 6 ký tự"
                                            />
                                            <button type="button" onClick={() => setShowPasses({ ...showPasses, new: !showPasses.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                {showPasses.new ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-0.5">Xác nhận MK mới</label>
                                        <div className="relative">
                                            <input
                                                type={showPasses.confirm ? "text" : "password"}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-orange-500 transition-all outline-none font-medium text-sm pr-10"
                                                value={passData.confirmPassword}
                                                onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                                                required
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setShowPasses({ ...showPasses, confirm: !showPasses.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                {showPasses.confirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-gray-100">
                                <button type="submit" disabled={isUpdatingPass} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm transition-shadow shadow-sm disabled:opacity-50">
                                    {isUpdatingPass ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Card 4: Xóa tài khoản (Chỉ hiển thị cho nông dân) */}
                {user?.role !== 'admin' && (
                    <div className="md:col-span-1 bg-red-50/30 rounded-3xl p-6 shadow-sm border border-red-100 flex flex-col justify-between items-start group hover:shadow-md transition-all">
                        <div className="w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shadow-inner">
                                    <FiAlertTriangle size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-red-900 font-sans">Khu vực rủi ro</h2>
                            </div>
                            <p className="text-xs text-red-700/80 leading-relaxed font-medium">
                                Xóa tài khoản sẽ loại bỏ vĩnh viễn mọi dữ liệu canh tác và chứng thực khỏi hệ thống.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowDeleteDialog(true)}
                            className="w-full mt-6 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-[0.98]"
                        >
                            Yêu cầu xóa dữ liệu
                        </button>
                    </div>
                )}

            </div>

            {/* Optimized Delete Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4">
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <FiAlertTriangle className="text-red-500 text-4xl" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Xóa tài khoản?</h2>
                        <p className="text-gray-500 mb-8 text-center text-sm font-medium leading-relaxed">
                            Mọi dữ liệu sẽ bị xóa <span className="text-red-600 font-bold underline">VĨNH VIỄN</span>. Vui lòng nhập mật khẩu xác nhận.
                        </p>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showDeletePass ? "text" : "password"}
                                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-red-500 outline-none font-bold text-center text-lg placeholder:text-gray-300"
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                    autoFocus
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowDeletePass(!showDeletePass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showDeletePass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>

                            <div className="flex flex-col gap-3 font-bold text-sm">
                                <button
                                    type="button"
                                    disabled={!deletePassword || isDeleting}
                                    onClick={handleDeleteAccount}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl transition-all shadow-sm"
                                >
                                    {isDeleting ? 'ĐANG XỬ LÝ...' : 'XÓA VĨNH VIỄN'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteDialog(false)}
                                    className="w-full py-3.5 text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
                                >
                                    HỦY BỎ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountSettingsPage;

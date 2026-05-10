import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiUserPlus, FiPhone, FiMapPin, FiType } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phone: '',
        address: '',
        role: 'farmer' // Default role
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Mật khẩu nhập lại không khớp');
            return;
        }

        try {
            setLoading(true);
            // Remove confirmPassword before sending to API
            const { confirmPassword, ...registerData } = formData;
            await register(registerData);

            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (error) {
            console.error('Registration error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-mesh flex items-center justify-center px-4 py-12">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200 rounded-full blur-3xl opacity-30" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-harvest-200 rounded-full blur-3xl opacity-30" />
            </div>

            <div className="relative w-full max-w-lg">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center space-x-2">
                        <img
                            src="/assets/LogoFarmmate4u.webp"
                            alt="Farmmate4U Logo"
                            className="w-12 h-12 object-contain"
                        />
                        <div className="text-left">
                            <h1 className="font-display font-bold text-xl text-gray-900">Farmmate<span className="text-primary-500">4U</span></h1>
                        </div>
                    </Link>
                </div>

                {/* Register Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Đăng ký tài khoản</h2>
                        <p className="text-gray-600 mt-2">
                            Dành cho bà con nông dân
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Họ và tên
                            </label>
                            <div className="relative">
                                <FiType className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="Nguyễn Văn A"
                                    required
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên đăng nhập
                            </label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="nguyenva"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Số điện thoại
                            </label>
                            <div className="relative">
                                <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="0912345678"
                                    required
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Địa chỉ
                            </label>
                            <div className="relative">
                                <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="Kiến Xương, Thái Bình"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mật khẩu
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input-field pl-11 pr-11"
                                    placeholder="Mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nhập lại mật khẩu
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input-field pl-11 pr-11"
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                />
                            </div>
                        </div>

                        {/* Register Button */}
                        <Button
                            type="submit"
                            loading={loading}
                            icon={FiUserPlus}
                            className="w-full py-3 mt-6"
                        >
                            Đăng ký tài khoản
                        </Button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">Đã có tài khoản? </span>
                        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium font-sans">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

import { useState, useEffect, useMemo } from 'react';
import {
    FiBarChart2, FiPieChart, FiTrendingUp, FiMap,
    FiPackage, FiActivity, FiBox, FiPhoneCall, FiFilter, FiList, FiLayers
} from 'react-icons/fi';
import { IconWheat } from '../../components/icons/AgriIcons';
import { farmAPI, productAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line, Legend
} from 'recharts';

const FarmerStatisticsPage = () => {
    const [loading, setLoading] = useState(true);

    // Raw data from APIs
    const [farms, setFarms] = useState([]);
    const [history, setHistory] = useState([]);
    const [products, setProducts] = useState([]);

    // Filters
    const [selectedFarmId, setSelectedFarmId] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [farmsRes, historyRes, productsRes] = await Promise.all([
                farmAPI.getMyFarms(),
                farmAPI.getMyHarvestHistory({}), // Fetch all history
                productAPI.getMyProducts()
            ]);
            setFarms(farmsRes.data || []);
            setHistory(historyRes.data || []);
            setProducts(productsRes.data?.products || productsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ----- DERIVED & FILTERED DATA -----
    const { filteredFarms, filteredHistory, filteredProducts, stats } = useMemo(() => {

        // 1. Lọc Thửa đất
        const fFarms = selectedFarmId === 'all'
            ? farms
            : farms.filter(f => f._id === selectedFarmId);

        // 2. Lọc Sản phẩm
        const fProducts = selectedFarmId === 'all'
            ? products
            : products.filter(p => (p.farmIds || []).some(f => (f._id || f).toString() === selectedFarmId));

        // 3. Lọc Lịch sử thu hoạch
        let fHistory = history;
        if (selectedFarmId !== 'all') {
            fHistory = fHistory.filter(h => h.farm?._id === selectedFarmId || h.farmId?._id === selectedFarmId || h.farmId === selectedFarmId);
        }
        if (selectedYear !== 'all') {
            fHistory = fHistory.filter(h => new Date(h.harvestDate).getFullYear().toString() === selectedYear);
        }

        // 4. Tính toán KPIs
        const totalArea = fFarms.reduce((sum, f) => sum + (f.area || 0), 0);

        // Nếu chọn "Tất cả các năm" -> Lấy tổng cộng dồn của Farm. Nếu chọn 1 năm -> Lấy tổng của lịch sử năm đó
        const totalYield = selectedYear === 'all'
            ? fFarms.reduce((sum, f) => sum + (f.cumulativeYieldKg || 0), 0)
            : fHistory.reduce((sum, h) => sum + (h.yieldInKg || 0), 0);

        const totalContacts = fProducts.reduce((sum, p) => sum + (p.contactCount || 0), 0);
        const avgYieldPerM2 = totalArea > 0 ? (totalYield / totalArea) : 0;

        return {
            filteredFarms: fFarms,
            filteredHistory: fHistory,
            filteredProducts: fProducts,
            stats: { totalArea, totalYield, totalContacts, avgYieldPerM2 }
        };

    }, [farms, history, products, selectedFarmId, selectedYear]);

    // ----- CHART 1: Lịch sử năng suất (Nhóm theo tháng của lịch sử đã lọc) -----
    const historyChartData = useMemo(() => {
        const byMonth = filteredHistory.reduce((acc, curr) => {
            const d = new Date(curr.harvestDate);
            const key = `T${d.getMonth() + 1}/${d.getFullYear()}`;
            if (!acc[key]) acc[key] = { name: key, yield: 0, sortKey: d.getTime() };
            acc[key].yield += curr.yieldInKg;
            return acc;
        }, {});
        return Object.values(byMonth).sort((a, b) => a.sortKey - b.sortKey).map(i => ({ name: i.name, yield: i.yield }));
    }, [filteredHistory]);

    // ----- CHART 2: Hiệu quả truyền thông & Cung Cầu MỚI (Ngang Bar Chart) -----
    const productChartData = useMemo(() => {
        return filteredProducts
            .map(p => ({
                name: p.productName?.length > 20 ? p.productName.substring(0, 20) + '...' : p.productName,
                contacts: p.contactCount || 0,
                views: p.viewCount || 0,
                quantity: p.quantity || 0,
                score: (p.contactCount || 0) * 2 + (p.viewCount || 0) // Trọng số để sort
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Lấy top 5 sản phẩm
    }, [filteredProducts]);

    // Danh sách Năm có trong lịch sử (để làm dropdown)
    const availableYears = useMemo(() => {
        const years = new Set(history.map(h => new Date(h.harvestDate).getFullYear()));
        return Array.from(years).sort((a, b) => b - a); // Mới nhất lên trên
    }, [history]);

    // ----- CHART 3: Sản lượng theo quý -----
    // Nhóm filteredHistory theo field `quarter` (tự động tính bởi backend, format Q1/YYYY...Q4/YYYY)
    const seasonChartData = useMemo(() => {
        const bySeason = filteredHistory
            .filter(h => h.quarter && h.quarter !== 'Hủy vụ')
            .reduce((acc, h) => {
                const key = h.quarter;
                // Dùng harvestDate của bản ghi đầu tiên trong quý để sắp xếp
                if (!acc[key]) acc[key] = { name: key, yield: 0, _sortKey: new Date(h.harvestDate).getTime() };
                acc[key].yield += (h.yieldInKg || 0);
                return acc;
            }, {});
        return Object.values(bySeason).sort((a, b) => a._sortKey - b._sortKey);
    }, [filteredHistory]);

    // ----- CHART 4: So sánh 2 quý gần nhất theo từng thửa đất -----
    const seasonCompareData = useMemo(() => {
        const validHistory = filteredHistory.filter(h => h.quarter && h.quarter !== 'Hủy vụ');

        // Tìm 2 quý gần nhất (distinct) — sắp xếp giảm dần theo ngày thu hoạch
        const seen = new Set();
        const recentSeasons = [];
        [...validHistory]
            .sort((a, b) => new Date(b.harvestDate) - new Date(a.harvestDate))
            .forEach(h => {
                if (!seen.has(h.quarter)) { seen.add(h.quarter); recentSeasons.push(h.quarter); }
            });

        if (recentSeasons.length < 2) return { data: [], s1: null, s2: null };

        const [s1, s2] = recentSeasons; // s1 = quý mới nhất, s2 = quý cũ hơn

        // Nhóm theo thửa đất, mỗi thửa có yield của s1 và s2
        const byFarm = {};
        validHistory
            .filter(h => h.quarter === s1 || h.quarter === s2)
            .forEach(h => {
                const farmName = h.farmId?.name || 'Không rõ';
                if (!byFarm[farmName]) byFarm[farmName] = { name: farmName, [s1]: 0, [s2]: 0 };
                byFarm[farmName][h.quarter] = (byFarm[farmName][h.quarter] || 0) + (h.yieldInKg || 0);
            });

        return { data: Object.values(byFarm), s1, s2 };
    }, [filteredHistory]);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
    const formatNumber = (num) => new Intl.NumberFormat('vi-VN').format(num);

    if (loading) return <Loading fullScreen={false} message="Đang nạp dữ liệu thống kê..." />;

    return (
        <div className="p-3 sm:p-6">

            {/* HEADER & BỘ LỌC */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 pb-4 sm:pb-6 border-b border-gray-100">
                <div className="min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center">
                        <FiBarChart2 className="mr-2 text-primary-500 flex-shrink-0" />
                        <span className="truncate">Báo cáo Hiệu quả Nông Trại</span>
                    </h1>
                    <p className="text-gray-600 text-sm mt-0.5">Phân tích năng suất thu hoạch và hiệu suất bán hàng</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-3 lg:mt-0">
                    {/* Bộ lọc Thửa đất */}
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm">
                        <FiMap className="text-gray-400 mr-2 flex-shrink-0" />
                        <select
                            value={selectedFarmId}
                            onChange={(e) => setSelectedFarmId(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer w-full"
                        >
                            <option value="all">Tất cả thửa đất</option>
                            {farms.map(f => (
                                <option key={f._id} value={f._id}>{f.name} ({f.cropType})</option>
                            ))}
                        </select>
                    </div>

                    {/* Bộ lọc Năm */}
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm">
                        <FiFilter className="text-gray-400 mr-2 flex-shrink-0" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer w-full"
                        >
                            <option value="all">Tất cả các năm (Lũy kế)</option>
                            {availableYears.map(y => (
                                <option key={y} value={y.toString()}>Năm {y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ROW 1: KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">

                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-100 p-3 sm:p-5 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-green-100 text-xs font-medium opacity-90 leading-tight">Tổng Sản Lượng</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-xl sm:text-3xl font-bold">{formatNumber(stats.totalYield)}</p>
                            <span className="text-xs font-medium opacity-80">kg</span>
                        </div>
                    </div>
                    <IconWheat className="absolute right-0 bottom-0 text-5xl sm:text-7xl opacity-20 transform translate-x-4" />
                </div>

                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-100 p-3 sm:p-5 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-blue-100 text-xs font-medium opacity-90 leading-tight">Tổng Diện Tích</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-xl sm:text-3xl font-bold">{formatNumber(stats.totalArea)}</p>
                            <span className="text-xs font-medium opacity-80">m²</span>
                        </div>
                    </div>
                    <FiMap className="absolute right-0 bottom-0 text-5xl sm:text-7xl opacity-20 transform translate-x-2" />
                </div>

                <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-100 p-3 sm:p-5 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-purple-100 text-xs font-medium opacity-90 leading-tight">TB Năng Suất</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-xl sm:text-3xl font-bold">{stats.avgYieldPerM2.toFixed(3)}</p>
                            <span className="text-xs font-medium opacity-80">kg/m²</span>
                        </div>
                    </div>
                    <FiLayers className="absolute right-0 bottom-0 text-5xl sm:text-7xl opacity-20 transform translate-x-2" />
                </div>

                <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-100 p-3 sm:p-5 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-orange-100 text-xs font-medium opacity-90 leading-tight">Lượt Liên Hệ</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <p className="text-xl sm:text-3xl font-bold">{formatNumber(stats.totalContacts)}</p>
                            <span className="text-xs font-medium opacity-80">lượt</span>
                        </div>
                    </div>
                    <FiPhoneCall className="absolute right-0 bottom-0 text-5xl sm:text-7xl opacity-20 transform translate-x-2 translate-y-2" />
                </div>

            </div>

            {/* ROW 2: CHARTS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">

                {/* CHART 1: Area Chart cho Năng suất */}
                <div className="card shadow-sm border border-gray-100 p-3 sm:p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
                            <FiActivity className="mr-2 text-primary-500 flex-shrink-0" />
                            <span className="truncate">Tiến độ & Mật độ Thu Hoạch</span>
                        </h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">Theo Lịch Sử</span>
                    </div>

                    {historyChartData.length > 0 ? (
                        <div className="h-56 sm:h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorHarvest" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${formatNumber(value)} kg`, 'Sản lượng']}
                                    />
                                    <Area type="monotone" dataKey="yield" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHarvest)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex flex-col items-center justify-center text-gray-400">
                            <FiActivity className="text-4xl mb-3 opacity-20" />
                            <p>Chưa có dữ liệu thu hoạch phù hợp với bộ lọc.</p>
                        </div>
                    )}
                </div>

                {/* CHART 2: Sản phẩm quan tâm nhất - Bar Chart Ngang dễ hiểu */}
                <div className="card shadow-sm border border-gray-100 p-3 sm:p-6 rounded-2xl">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 flex items-center">
                        <FiTrendingUp className="mr-2 text-primary-500 flex-shrink-0" />
                        <span className="truncate">Top 5 Sản Phẩm Được Quan Tâm Nhất</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">Đo lường mức độ người mua ấn xem thông tin và Gọi điện/Zalo.</p>

                    {productChartData.length > 0 ? (
                        <div className="h-56 sm:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productChartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                                        width={80}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value, name) => {
                                            if (name === 'contacts') return [`${value} lượt gọi`, 'Lượt Khách Liên Hệ'];
                                            if (name === 'views') return [`${value} lượt`, 'Lượt Khách Xem'];
                                            return [value, name];
                                        }}
                                    />
                                    <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                    <Bar dataKey="contacts" name="Lượt liên hệ (Gọi/Zalo)" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" />
                                    <Bar dataKey="views" name="Lượt Xem Dạo" fill="#bfdbfe" radius={[0, 4, 4, 0]} maxBarSize={20} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                            <FiBox className="text-4xl mb-3 opacity-20" />
                            <p>Chưa có sản phẩm nào đăng bán ở thửa đất/năm này.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* ROW 3: Biểu đồ Vụ Mùa — chỉ hiện khi có ít nhất 1 vụ hợp lệ */}
            {seasonChartData.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">

                    {/* CHART 3: Sản lượng theo vụ */}
                    <div className="card shadow-sm border border-gray-100 p-3 sm:p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4 sm:mb-6">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
                                <FiPieChart className="mr-2 text-primary-500 flex-shrink-0" />
                                <span className="truncate">Sản Lượng Theo Quý</span>
                            </h3>
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-medium">
                                {selectedYear === 'all' ? 'Toàn bộ lịch sử' : `Năm ${selectedYear}`}
                            </span>
                        </div>
                        <div className="h-56 sm:h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={seasonChartData} margin={{ top: 10, right: 5, left: -25, bottom: 35 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#6B7280', fontSize: 11 }}
                                        axisLine={false} tickLine={false}
                                        angle={-15} textAnchor="end"
                                    />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${formatNumber(value)} kg`, 'Sản lượng']}
                                        labelFormatter={(label) => `Quý: ${label}`}
                                    />
                                    <Bar dataKey="yield" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                        {seasonChartData.map((_, index) => (
                                            <Cell key={`cell-season-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* CHART 4: So sánh 2 quý gần nhất */}
                    {seasonCompareData.data.length > 0 ? (
                        <div className="card shadow-sm border border-gray-100 p-3 sm:p-6 rounded-2xl">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
                                    <FiBarChart2 className="mr-2 text-primary-500 flex-shrink-0" />
                                    <span className="truncate">So Sánh 2 Quý Gần Nhất</span>
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-5">
                                <span className="inline-block w-3 h-3 rounded-full bg-blue-300 mr-1 align-middle" />
                                {seasonCompareData.s2}
                                <span className="mx-2 text-gray-300">vs</span>
                                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-1 align-middle" />
                                {seasonCompareData.s1}
                            </p>
                            <div className="h-52 sm:h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={seasonCompareData.data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            axisLine={false} tickLine={false}
                                        />
                                        <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value, name) => [`${formatNumber(value)} kg`, name]}
                                        />
                                        <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '12px', fontSize: 12 }} />
                                        {/* Vụ cũ hơn (s2) — màu xanh dương nhạt */}
                                        <Bar dataKey={seasonCompareData.s2} fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                        {/* Vụ mới nhất (s1) — màu xanh lá nổi bật */}
                                        <Bar dataKey={seasonCompareData.s1} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        // Placeholder khi mới chỉ có 1 quý
                        <div className="card shadow-sm border border-dashed border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center text-gray-400 min-h-[280px]">
                            <FiBarChart2 className="text-4xl mb-3 opacity-20" />
                            <p className="text-sm text-center">Cần ít nhất 2 quý có dữ liệu<br />để hiển thị biểu đồ so sánh.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ROW 4: BẢNG XẾP HẠNG THỬA ĐẤT (Chỉ hiện khi chọn Tất cả) */}
            {selectedFarmId === 'all' && filteredFarms.length > 0 && (
                <div className="card shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
                            <FiList className="mr-2 text-primary-500 flex-shrink-0" />
                            Xếp Hạng Năng Suất Các Thửa Đất
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[480px]">
                            <thead className="bg-white text-gray-500 font-medium">
                                <tr className="border-b border-gray-100">
                                    <th className="px-3 sm:px-6 py-3 sm:py-4">Tên thửa đất</th>
                                    <th className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">Loại cây trồng</th>
                                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">Diện tích</th>
                                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">Sản lượng (kg)</th>
                                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-primary-600">Năng suất</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredFarms
                                    .map(f => ({
                                        ...f,
                                        efficiency: f.area > 0 ? ((f.cumulativeYieldKg || 0) / f.area) : 0
                                    }))
                                    .sort((a, b) => b.efficiency - a.efficiency)
                                    .map((farm, idx) => (
                                        <tr key={farm._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                <div className="font-bold text-gray-900 text-sm">{farm.name}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 sm:hidden">
                                                    {farm.cropType || 'Truyền thống'}
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {farm.cropType || 'Chưa rõ'}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium text-gray-600 text-sm">
                                                {formatNumber(farm.area)} m²
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-medium text-gray-900 text-sm">
                                                {formatNumber(farm.cumulativeYieldKg || 0)} kg
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                                                <span className={`font-black text-sm ${farm.efficiency > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {farm.efficiency.toFixed(3)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FarmerStatisticsPage;

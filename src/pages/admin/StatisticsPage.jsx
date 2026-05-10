import { useState, useEffect } from 'react';
import {
  FiBarChart2, FiPieChart, FiTrendingUp, FiMap,
  FiUsers, FiActivity, FiFilter, FiArchive, FiAlertCircle, FiLayers
} from 'react-icons/fi';
import { IconWheat } from '../../components/icons/AgriIcons';
import { statisticsAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

// ---- Custom Legend cho Pie Chart ----
const CustomPieLegend = ({ data, colors }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 px-2">
    {data.map((item, idx) => (
      <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
        <span className="truncate font-medium">{item.name}</span>
        <span className="ml-auto font-bold text-gray-800 flex-shrink-0">{item.value}</span>
      </div>
    ))}
  </div>
);

const STATUS_LABELS = {
  planning: 'Quy hoạch',
  planting: 'Gieo trồng',
  growing: 'Phát triển',
  harvesting: 'Đang thu',
  harvested: 'Đã thu hoạch',
  fallow: 'Bỏ nghỉ'
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280', '#14b8a6', '#f97316'];

const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [regionStats, setRegionStats] = useState([]);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear().toString());
  const [historicalStats, setHistoricalStats] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchAllStats();
  }, []);

  useEffect(() => {
    fetchHistorical(historyYear);
  }, [historyYear]);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [overviewRes, regionRes] = await Promise.all([
        statisticsAPI.getOverview(),
        statisticsAPI.getByRegion()
      ]);
      setStats(overviewRes.data);
      setRegionStats(regionRes.data || []);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorical = async (year) => {
    try {
      setHistoryLoading(true);
      const res = await statisticsAPI.getHistoricalHarvests({ groupBy: 'month', year });
      setHistoricalStats(res.data || []);
    } catch (error) {
      console.error('Error fetching historical stats:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) return <Loading fullScreen={false} message="Đang tải thống kê..." />;

  const formatNumber = (num) => new Intl.NumberFormat('vi-VN').format(num ?? 0);
  const formatTon = (kg) => (kg / 1000).toFixed(2);

  // ---- 1. Dữ liệu Pie Chart: Trạng thái Mùa vụ ----
  const statusChartData = (stats?.farms?.byStatus || []).map(item => ({
    name: STATUS_LABELS[item._id] || item._id,
    value: item.count,
    area: (item.area / 10000).toFixed(2),
    rawId: item._id
  }));

  // ---- 2. Dữ liệu Pie Chart: Tỷ trọng Cây trồng ----
  const cropChartData = (stats?.farms?.byCrop || [])
    .filter(item => item._id) // bỏ null
    .map(item => ({
      name: item._id,
      value: Math.round(item.area / 10000 * 100) / 100, // Hecta, 2 chữ số
      count: item.count
    }));

  // ---- 3. Dữ liệu BarChart: Lịch sử Năng suất 12 tháng ----
  // Điền đủ 12 tháng, tháng nào chưa có data thì = 0
  const historyChartData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const found = historicalStats.find(s => s._id?.month === monthNum);
    return {
      name: `T${monthNum}`,
      yieldKg: found ? found.totalYield : 0,
      yieldTon: found ? parseFloat((found.totalYield / 1000).toFixed(2)) : 0,
      records: found ? found.totalRecords : 0
    };
  });

  // ---- 4. Dữ liệu Dự báo: Farm đang phát triển groupBy CropType ----
  // Dùng byCrop từ overview, lọc ra các farm status = growing/harvesting - cần thêm API
  // Tạm thời dùng data regionStats để hiện "tổng sản lượng tích lũy theo vùng" thay cho "Dự báo"
  const regionChartData = regionStats
    .filter(r => r.regionName)
    .slice(0, 8)
    .map(r => ({
      name: r.regionName?.length > 15 ? r.regionName.substring(0, 15) + '…' : r.regionName,
      fullName: r.regionName,
      yieldTon: parseFloat((r.totalYield / 1000).toFixed(2)),
      areHa: parseFloat((r.totalArea / 10000).toFixed(2)),
      farmCount: r.farmCount
    }))
    .sort((a, b) => b.yieldTon - a.yieldTon);

  const hasHistoryData = historyChartData.some(d => d.yieldKg > 0);

  return (
    <div className="p-6">
      {/* TITLE */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FiBarChart2 className="mr-2 text-primary-500" />
          Thống kê &amp; Báo cáo Hợp tác xã
        </h1>
        <p className="text-gray-500 text-sm mt-1">Tổng hợp dữ liệu vận hành &amp; kinh tế của toàn bộ hệ thống</p>
      </div>

      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-100 rounded-2xl p-5 relative overflow-hidden">
          <p className="text-green-100 text-sm">Tổng Sản Lượng Tích Lũy</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black">{formatTon(stats?.farms?.totalYield || 0)}</span>
            <span className="text-sm opacity-80">Tấn</span>
          </div>
          <IconWheat className="absolute right-2 bottom-1 text-6xl opacity-[0.15]" />
        </div>

        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-100 rounded-2xl p-5 relative overflow-hidden">
          <p className="text-blue-100 text-sm">Diện Tích Canh Tác</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black">{((stats?.farms?.totalArea || 0) / 10000).toFixed(2)}</span>
            <span className="text-sm opacity-80">ha</span>
          </div>
          <FiMap className="absolute right-2 bottom-1 text-6xl opacity-[0.15]" />
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-100 rounded-2xl p-5 relative overflow-hidden">
          <p className="text-purple-100 text-sm">Nông Dân Tham Gia</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black">{stats?.users?.totalFarmers || 0}</span>
            <span className="text-sm opacity-80">người</span>
          </div>
          <FiUsers className="absolute right-2 bottom-1 text-6xl opacity-[0.15]" />
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-100 rounded-2xl p-5 relative overflow-hidden">
          <p className="text-orange-100 text-sm">Sản Phẩm Trên Sàn</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black">{stats?.products?.total || 0}</span>
            <span className="text-sm opacity-80">sản phẩm</span>
          </div>
          <FiTrendingUp className="absolute right-2 bottom-1 text-6xl opacity-[0.15]" />
        </div>
      </div>

      {/* ROW 2: Trạng thái Mùa vụ (Pie) + Tỷ trọng Cây trồng (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* PIE: Trạng thái mùa vụ */}
        <div className="card shadow-sm border border-gray-100 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiPieChart className="mr-2 text-primary-500" />
            Phân Bổ Trạng Thái Mùa Vụ
          </h3>
          {statusChartData.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChartData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value, name, props) => [
                        `${value} thửa (${props.payload.area} ha)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <CustomPieLegend data={statusChartData} colors={COLORS} />
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>

        {/* PIE: Tỷ trọng Cây trồng theo Diện tích */}
        <div className="card shadow-sm border border-gray-100 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiLayers className="mr-2 text-primary-500" />
            Tỷ Trọng Cây Trồng theo Diện Tích
          </h3>
          {cropChartData.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cropChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {cropChartData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value, name) => [`${value} ha (${cropChartData.find(c => c.name === name)?.count || 0} thửa)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <CustomPieLegend
                data={cropChartData.map(c => ({ name: c.name, value: `${c.value} ha` }))}
                colors={COLORS}
              />
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* ROW 3: Lịch sử Năng suất (BarChart 12 tháng) */}
      <div className="card shadow-sm border border-gray-100 rounded-2xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <FiArchive className="mr-2 text-primary-500" />
              Lịch sử Sản Lượng Thu Hoạch
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Tổng sản lượng (Tấn) ghi nhận từ HarvestRecord mỗi tháng</p>
          </div>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <FiFilter className="text-gray-400 mr-2 text-sm" />
            <span className="text-sm text-gray-600 font-medium mr-2">Năm:</span>
            <select
              value={historyYear}
              onChange={e => setHistoryYear(e.target.value)}
              className="text-sm font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
            >
              {[0, 1, 2, 3, 4].map(offset => {
                const y = new Date().getFullYear() - offset;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
        </div>

        {historyLoading ? (
          <div className="h-72 flex items-center justify-center text-gray-400">Đang tải...</div>
        ) : hasHistoryData ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} unit=" Tấn" />
                <Tooltip
                  cursor={{ fill: '#F0FDF4' }}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => {
                    if (name === 'yieldTon') return [`${value} Tấn`, 'Sản lượng thu hoạch'];
                    if (name === 'records') return [`${value} đợt`, 'Số đợt thu hoạch'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Tháng ${label.replace('T', '')}`}
                />
                <Legend
                  formatter={(value) => value === 'yieldTon' ? 'Sản lượng (Tấn)' : 'Số đợt thu hoạch'}
                />
                <Bar dataKey="yieldTon" name="yieldTon" fill="url(#barGradient)" radius={[5, 5, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-gray-400">
            <FiAlertCircle className="text-4xl mb-3 opacity-30" />
            <p className="font-medium">Chưa có dữ liệu thu hoạch trong năm {historyYear}</p>
            <p className="text-sm mt-1 opacity-70">Dữ liệu sẽ xuất hiện khi nông dân cập nhật trạng thái &quot;Đã thu hoạch&quot;</p>
          </div>
        )}
      </div>

      {/* ROW 4: Bảng Xếp hạng Vùng Trồng */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

        {/* Bar Chart: Năng suất theo Vùng */}
        <div className="card shadow-sm border border-gray-100 rounded-2xl p-6 xl:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <FiActivity className="mr-2 text-primary-500" />
            Sản Lượng Tích Lũy theo Vùng Quy Hoạch
          </h3>
          {regionChartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionChartData} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} unit=" Tấn" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={70}
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F0FDF4' }}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => {
                      if (name === 'yieldTon') return [`${value} Tấn`, 'Sản lượng tích lũy'];
                      if (name === 'areHa') return [`${value} ha`, 'Diện tích'];
                      return [value, name];
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  />
                  <Bar dataKey="yieldTon" name="yieldTon" fill="#10b981" radius={[0, 5, 5, 0]} maxBarSize={28}>
                    {regionChartData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">Chưa có dữ liệu vùng</div>
          )}
        </div>

        {/* Table: Chi tiết Vùng */}
        <div className="card shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900 flex items-center">
              <FiLayers className="mr-2 text-primary-500" />
              Chi Tiết Các Vùng
            </h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-semibold text-xs">Vùng</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs">Diện tích</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs">Sản lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {regionStats.length > 0 ? regionStats.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs line-clamp-1">{r.regionName || 'Ngoài QH'}</p>
                      <p className="text-xs text-gray-400">{r.farmCount} nông hộ</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600 font-medium">{(r.totalArea / 10000).toFixed(1)} ha</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                        {(r.totalYield / 1000).toFixed(2)} T
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StatisticsPage;

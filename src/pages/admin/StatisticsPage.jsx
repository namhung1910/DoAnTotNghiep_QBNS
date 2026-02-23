import { useState, useEffect } from 'react';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiMap, FiPackage, FiUsers } from 'react-icons/fi';
import { GiWheat, GiPlantRoots } from 'react-icons/gi';
import { statisticsAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [harvestForecast, setHarvestForecast] = useState([]);
  const [regionStats, setRegionStats] = useState([]);
  const [certStats, setCertStats] = useState([]);

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#6b7280', '#14b8a6'];

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [overviewRes, forecastRes, regionRes, certRes] = await Promise.all([
        statisticsAPI.getOverview(),
        statisticsAPI.getHarvestForecast(),
        statisticsAPI.getByRegion(),
        statisticsAPI.getProductsByCertification()
      ]);
      
      setStats(overviewRes.data);
      setHarvestForecast(forecastRes.data || []);
      setRegionStats(regionRes.data || []);
      setCertStats(certRes.data || []);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      planning: 'Quy hoạch',
      planting: 'Gieo trồng',
      growing: 'Phát triển',
      harvesting: 'Thu hoạch',
      harvested: 'Đã thu hoạch',
      fallow: 'Nghỉ'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <Loading fullScreen={false} message="Đang tải thống kê..." />;
  }

  // Prepare chart data
  const statusChartData = stats?.farms?.byStatus?.map(item => ({
    name: getStatusLabel(item._id),
    value: item.count,
    area: (item.totalArea / 10000).toFixed(2)
  })) || [];

  const cropChartData = stats?.farms?.byCrop?.map(item => ({
    name: item._id,
    count: item.count,
    area: (item.totalArea / 10000).toFixed(2)
  })) || [];

  const certChartData = certStats.map(item => ({
    name: item._id || 'Không có',
    count: item.count,
    views: item.totalViews,
    contacts: item.totalContacts
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FiBarChart2 className="mr-2 text-primary-500" />
          Thống kê & Báo cáo
        </h1>
        <p className="text-gray-600">Tổng hợp dữ liệu toàn hệ thống</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Nông dân</p>
              <p className="text-3xl font-bold">{stats?.users?.totalFarmers || 0}</p>
            </div>
            <FiUsers className="text-4xl opacity-30" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Vùng quy hoạch</p>
              <p className="text-3xl font-bold">{stats?.regions?.total || 0}</p>
            </div>
            <FiMap className="text-4xl opacity-30" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Thửa đất</p>
              <p className="text-3xl font-bold">{stats?.farms?.total || 0}</p>
            </div>
            <GiPlantRoots className="text-4xl opacity-30" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Sản phẩm</p>
              <p className="text-3xl font-bold">{stats?.products?.total || 0}</p>
            </div>
            <FiPackage className="text-4xl opacity-30" />
          </div>
        </div>
      </div>

      {/* Area Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FiMap className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng diện tích quy hoạch</p>
              <p className="text-2xl font-bold text-gray-900">
                {((stats?.regions?.totalArea || 0) / 10000).toFixed(2)} ha
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <GiPlantRoots className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Diện tích đang canh tác</p>
              <p className="text-2xl font-bold text-gray-900">
                {((stats?.farms?.totalArea || 0) / 10000).toFixed(2)} ha
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Yêu cầu liên hệ mới</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.contacts?.new || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiPieChart className="mr-2 text-primary-500" />
            Trạng thái mùa vụ
          </h3>
          {statusChartData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {statusChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* Crop Type Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiBarChart2 className="mr-2 text-primary-500" />
            Diện tích theo loại cây (ha)
          </h3>
          {cropChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'area' ? `${value} ha` : value,
                      name === 'area' ? 'Diện tích' : 'Số thửa'
                    ]}
                  />
                  <Bar dataKey="area" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Certification Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <GiWheat className="mr-2 text-primary-500" />
            Sản phẩm theo chứng nhận
          </h3>
          {certChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={certChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Số sản phẩm" fill="#22c55e" />
                  <Bar dataKey="views" name="Lượt xem" fill="#3b82f6" />
                  <Bar dataKey="contacts" name="Liên hệ" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* Region Stats Table */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiMap className="mr-2 text-primary-500" />
            Thống kê theo vùng
          </h3>
          {regionStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-500">Vùng</th>
                    <th className="text-right py-2 text-gray-500">Số thửa</th>
                    <th className="text-right py-2 text-gray-500">Diện tích</th>
                  </tr>
                </thead>
                <tbody>
                  {regionStats.map((region, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{region.regionName || 'Chưa phân vùng'}</td>
                      <td className="py-2 text-right">{region.farmCount}</td>
                      <td className="py-2 text-right text-primary-600 font-medium">
                        {(region.totalArea / 10000).toFixed(2)} ha
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* Summary Info */}
      <div className="card bg-gradient-to-r from-primary-50 to-green-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng kết</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-primary-600">
              {((stats?.farms?.totalArea || 0) / 10000).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600">Hecta đang canh tác</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">
              {stats?.products?.total || 0}
            </p>
            <p className="text-sm text-gray-600">Sản phẩm đang quảng bá</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.users?.totalFarmers || 0}
            </p>
            <p className="text-sm text-gray-600">Nông dân tham gia</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-orange-600">
              {stats?.contacts?.total || 0}
            </p>
            <p className="text-sm text-gray-600">Lượt quan tâm</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;


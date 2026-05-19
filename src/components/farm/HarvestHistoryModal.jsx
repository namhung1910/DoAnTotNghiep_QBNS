import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import { farmAPI } from '../../services/api';
import { FiTrendingUp, FiCalendar, FiBox } from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const HarvestHistoryModal = ({ isOpen, onClose, farm }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && farm) {
      fetchHistory();
    }
  }, [isOpen, farm]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await farmAPI.getMyHarvestHistory({ farmId: farm._id });
      setHistory(res.data || []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử thu hoạch:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

  // Chuẩn bị data cho biểu đồ thay đổi từ bản ghi cũ -> mới
  const chartData = [...history].reverse().map(item => ({
    name: item.quarter || new Date(item.harvestDate).toLocaleDateString('vi-VN'),
    yield: item.yieldInKg,
    cropType: item.cropType
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lịch sử thu hoạch: ${farm?.name || 'Thửa đất'}`}
      size="2xl"
    >
      {loading ? (
        <div className="py-12">
          <Loading fullScreen={false} message="Đang tải dữ liệu lịch sử..." />
        </div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <FiCalendar className="mx-auto text-4xl mb-3 opacity-30" />
          <p>Thửa đất này chưa ghi nhận đợt thu hoạch nào.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Biểu đồ Năng suất */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
              <FiTrendingUp className="mr-2 text-primary-500" />
              Biểu đồ đối sánh năng suất (Kg)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#F3F4F6'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [`${new Intl.NumberFormat('vi-VN').format(value)} kg`, 'Sản lượng']}
                    labelFormatter={(label) => `Quý: ${label}`}
                  />
                  <Bar dataKey="yield" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Danh sách Bảng */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <FiBox className="mr-2 text-primary-500" />
              Chi tiết các vụ đã qua
            </h3>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Quý / Thời gian</th>
                    <th className="px-4 py-3">Cây trồng</th>
                    <th className="px-4 py-3 text-right">Sản lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{record.quarter || record.season}</div>
                        <div className="text-xs text-gray-500">
                          Thu hoạch: {new Date(record.harvestDate).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {record.cropType}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                          {new Intl.NumberFormat('vi-VN').format(record.yieldInKg)} {record.yieldUnit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Đóng
        </button>
      </div>
    </Modal>
  );
};

export default HarvestHistoryModal;

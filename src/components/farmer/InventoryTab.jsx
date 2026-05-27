import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTruck, FiSliders, FiEdit2, FiCheckCircle, FiChevronDown, FiChevronRight } from 'react-icons/fi';

/**
 * Tab kho hàng — nhóm theo sản phẩm.
 * Props:
 *   products, farms, onSell, onAdjust, onHistory
 */
const InventoryTab = ({ products, farms, onSell, onAdjust, onHistory }) => {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const calcStock = (farm) => {
    const c = farm.cumulativeYieldKg || 0;
    const a = farm.stockAdjustment || 0;
    const s = farm.soldOutsideKg || 0;
    return c + a - s;
  };

  const farmIdsInProducts = new Set(
    products.flatMap(p => (p.farmIds || []).map(f => (f._id || f).toString()))
  );
  const orphanFarms = farms.filter(f => !farmIdsInProducts.has(f._id.toString()));

  const toggle = (id) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const statusTag = (stock, hasProduct, cumulative) => {
    if (cumulative === 0) return { text: '⏳ Chưa thu hoạch', cls: 'text-gray-400 bg-gray-100' };
    if (stock < 0)        return { text: '⚠️ Vượt kho', cls: 'text-red-600 bg-red-50' };
    if (stock === 0)      return { text: '📭 Hết hàng', cls: 'text-gray-500 bg-gray-100' };
    if (!hasProduct)      return { text: '📣 Cần đăng bán', cls: 'text-orange-600 bg-orange-50' };
    if (stock <= cumulative * 0.1) return { text: '⚠️ Sắp hết', cls: 'text-yellow-600 bg-yellow-50' };
    return { text: '✅ Đủ hàng', cls: 'text-green-600 bg-green-50' };
  };

  if (farms.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-500">
        <FiTruck className="mx-auto text-4xl text-gray-300 mb-3" />
        <p>Chưa có thửa đất nào được duyệt</p>
      </div>
    );
  }

  // ── Icon lịch sử dùng lại ──────────────────────────────────────────────────
  const HistoryIcon = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  );

  // ── Hàng nút hành động (dùng lại trong cả mobile + desktop) ───────────────
  const ActionBtns = ({ farm, product, showSell = false }) => (
    <div className="flex items-center gap-1 flex-wrap">
      {showSell && product && calcStock(farm) > 0 && (
        <button onClick={() => onSell(product)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg" title="Xác nhận đã bán">
          <FiCheckCircle size={14} />
        </button>
      )}
      {(farm.cumulativeYieldKg || 0) > 0 && <>
        <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho">
          <FiSliders size={14} />
        </button>
        <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho">
          <HistoryIcon />
        </button>
      </>}
      {product && (
        <Link to={`/farmer/products/${product._id}/edit`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa bài đăng">
          <FiEdit2 size={14} />
        </Link>
      )}
    </div>
  );

  // ── Render 1 stat nhỏ cho card mobile ──────────────────────────────────────
  const StatRow = ({ label, value, valueClass = 'text-gray-800' }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-3">

      {/* ═══════════════ MOBILE: Card Layout (< sm) ═══════════════ */}
      <div className="sm:hidden space-y-3">

        {/* Sản phẩm có thửa đất */}
        {products.map(product => {
          const productFarms = product.farmIds || [];
          const totalCumulative = productFarms.reduce((s, f) => s + (f.cumulativeYieldKg || 0), 0);
          const totalAdj = productFarms.reduce((s, f) => s + (f.stockAdjustment || 0), 0);
          const totalSold = productFarms.reduce((s, f) => s + (f.soldOutsideKg || 0), 0) + (product.soldQuantity || 0);
          const totalStock = productFarms.reduce((s, f) => s + calcStock(f), 0);
          const isMulti = productFarms.length > 1;
          const isExpanded = expandedIds.has(product._id);
          const st = statusTag(totalStock, true, totalCumulative);

          return (
            <div key={product._id} className="card !p-0 overflow-hidden">
              {/* Header card */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{product.productName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isMulti
                        ? `${productFarms.length} thửa: ${productFarms.map(f => f.name).join(', ')}`
                        : (productFarms[0]?.name || '—')}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                    {st.text}
                  </span>
                </div>

                {/* Stats dạng 2 cột */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tích lũy TH</span>
                    <span className="font-medium text-gray-700">
                      {totalCumulative > 0 ? `${totalCumulative.toLocaleString()} kg` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tồn kho</span>
                    <span className={`font-bold ${totalStock < 0 ? 'text-red-600' : totalStock === 0 ? 'text-gray-400' : 'text-green-700'}`}>
                      {totalCumulative > 0 ? `${totalStock.toLocaleString()} kg` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Điều chỉnh</span>
                    <span className={`font-medium ${totalAdj < 0 ? 'text-red-500' : totalAdj > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {totalAdj !== 0 ? `${totalAdj > 0 ? '+' : ''}${totalAdj.toLocaleString()} kg` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Đã bán</span>
                    <span className="font-medium text-gray-600">
                      {totalSold > 0 ? `${totalSold.toLocaleString()} kg` : '—'}
                    </span>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  {isMulti && (
                    <button
                      onClick={() => toggle(product._id)}
                      className="flex items-center gap-1 text-xs text-primary-600 font-medium"
                    >
                      {isExpanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                      {isExpanded ? 'Ẩn chi tiết' : 'Xem từng thửa'}
                    </button>
                  )}
                  {!isMulti && <div />}
                  <div className="flex items-center gap-1">
                    {totalStock > 0 && (
                      <button onClick={() => onSell(product)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg" title="Xác nhận đã bán">
                        <FiCheckCircle size={14} />
                      </button>
                    )}
                    {!isMulti && productFarms[0] && (farm => (<>
                      {(farm.cumulativeYieldKg || 0) > 0 && <>
                        <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho">
                          <FiSliders size={14} />
                        </button>
                        <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho">
                          <HistoryIcon />
                        </button>
                      </>}
                    </>))(productFarms[0])}
                    <Link to={`/farmer/products/${product._id}/edit`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa bài đăng">
                      <FiEdit2 size={14} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Chi tiết từng thửa (khi multi & expanded) */}
              {isMulti && isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/70 divide-y divide-gray-100">
                  {productFarms.map(farm => {
                    const fStock = calcStock(farm);
                    const adj = farm.stockAdjustment || 0;
                    const sold = farm.soldOutsideKg || 0;
                    return (
                      <div key={farm._id} className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{farm.name}</p>
                            <p className="text-xs text-gray-400">{farm.cropType}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {(farm.cumulativeYieldKg || 0) > 0 && <>
                              <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho">
                                <FiSliders size={13} />
                              </button>
                              <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho">
                                <HistoryIcon />
                              </button>
                            </>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tích lũy</span>
                            <span className="font-medium text-gray-700">
                              {(farm.cumulativeYieldKg || 0) > 0 ? `${farm.cumulativeYieldKg.toLocaleString()} kg` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tồn kho</span>
                            <span className={`font-bold ${fStock < 0 ? 'text-red-600' : fStock === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                              {(farm.cumulativeYieldKg || 0) > 0 ? `${fStock.toLocaleString()} kg` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Điều chỉnh</span>
                            <span className={adj < 0 ? 'text-red-500' : adj > 0 ? 'text-green-600' : 'text-gray-400'}>
                              {adj !== 0 ? `${adj > 0 ? '+' : ''}${adj.toLocaleString()} kg` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Đã bán</span>
                            <span className="text-gray-500">{sold > 0 ? `${sold.toLocaleString()} kg` : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Thửa chưa có sản phẩm - mobile */}
        {orphanFarms.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1 px-1">
              Thửa đất chưa có bài đăng
            </p>
            {orphanFarms.map(farm => {
              const stock = calcStock(farm);
              const cumulative = farm.cumulativeYieldKg || 0;
              const adj = farm.stockAdjustment || 0;
              const sold = farm.soldOutsideKg || 0;
              const st = statusTag(stock, false, cumulative);
              return (
                <div key={farm._id} className="card !p-3 border-dashed border-orange-200 bg-orange-50/40">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{farm.name}</p>
                      <p className="text-xs text-gray-400">{farm.cropType || 'Chưa có cây trồng'}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                      {st.text}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tích lũy TH</span>
                      <span className="font-medium text-gray-700">{cumulative > 0 ? `${cumulative.toLocaleString()} kg` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tồn kho</span>
                      <span className={`font-bold ${stock < 0 ? 'text-red-600' : cumulative === 0 ? 'text-gray-400' : 'text-green-700'}`}>
                        {cumulative > 0 ? `${stock.toLocaleString()} kg` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Điều chỉnh</span>
                      <span className={adj < 0 ? 'text-red-500' : adj > 0 ? 'text-green-600' : 'text-gray-400'}>
                        {adj !== 0 ? `${adj > 0 ? '+' : ''}${adj.toLocaleString()} kg` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Đã bán</span>
                      <span className="text-gray-500">{sold > 0 ? `${sold.toLocaleString()} kg` : '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-orange-100">
                    {cumulative > 0 && <>
                      <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho">
                        <FiSliders size={14} />
                      </button>
                      <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho">
                        <HistoryIcon />
                      </button>
                    </>}
                    <Link to="/farmer/products/new" className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors font-medium">
                      + Đăng bán
                    </Link>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ═══════════════ DESKTOP: Table với scroll ngang (sm+) ═══════════════ */}
      <div className="hidden sm:block space-y-2">
        {/* Header cột */}
        <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1.2fr_1.2fr_auto] gap-2 px-4 py-2 bg-gray-50 rounded-xl text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div>Sản phẩm / Thửa đất</div>
          <div className="text-right">Tích lũy TH</div>
          <div className="text-right">Điều chỉnh</div>
          <div className="text-right">Đã bán</div>
          <div className="text-right">Tồn kho</div>
          <div>Trạng thái</div>
          <div>Hành động</div>
        </div>

        {/* Sản phẩm có thửa đất */}
        {products.map(product => {
          const productFarms = product.farmIds || [];
          const totalCumulative = productFarms.reduce((s, f) => s + (f.cumulativeYieldKg || 0), 0);
          const totalAdj = productFarms.reduce((s, f) => s + (f.stockAdjustment || 0), 0);
          const totalSold = productFarms.reduce((s, f) => s + (f.soldOutsideKg || 0), 0) + (product.soldQuantity || 0);
          const totalStock = productFarms.reduce((s, f) => s + calcStock(f), 0);
          const isMulti = productFarms.length > 1;
          const isExpanded = expandedIds.has(product._id);
          const st = statusTag(totalStock, true, totalCumulative);

          return (
            <div key={product._id} className="card overflow-hidden p-0">
              <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1.2fr_1.2fr_auto] items-center gap-2 px-4 py-3 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  {isMulti ? (
                    <button onClick={() => toggle(product._id)} className="p-1 rounded hover:bg-gray-100 flex-shrink-0">
                      {isExpanded ? <FiChevronDown size={14} className="text-gray-500" /> : <FiChevronRight size={14} className="text-gray-500" />}
                    </button>
                  ) : <div className="w-5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{product.productName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {isMulti ? `${productFarms.length} thửa · ${productFarms.map(f => f.name).join(', ')}` : (productFarms[0]?.name || '—')}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-700">{totalCumulative > 0 ? `${totalCumulative.toLocaleString()} kg` : '—'}</div>
                <div className="text-right">
                  <span className={`text-sm ${totalAdj < 0 ? 'text-red-500' : totalAdj > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {totalAdj !== 0 ? `${totalAdj > 0 ? '+' : ''}${totalAdj.toLocaleString()} kg` : '—'}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-500">{totalSold > 0 ? `${totalSold.toLocaleString()} kg` : '—'}</div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${totalStock < 0 ? 'text-red-600' : totalStock === 0 ? 'text-gray-400' : 'text-green-700'}`}>
                    {totalCumulative > 0 ? `${totalStock.toLocaleString()} kg` : '—'}
                  </p>
                </div>
                <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.text}</span></div>
                <div>
                  <div className="flex items-center gap-1">
                    {totalStock > 0 && (
                      <button onClick={() => onSell(product)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg" title="Xác nhận đã bán">
                        <FiCheckCircle size={14} />
                      </button>
                    )}
                    {!isMulti && productFarms[0] && (farm => (<>
                      {(farm.cumulativeYieldKg || 0) > 0 && <>
                        <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho"><FiSliders size={14} /></button>
                        <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho"><HistoryIcon /></button>
                      </>}
                    </>))(productFarms[0])}
                    <Link to={`/farmer/products/${product._id}/edit`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa bài đăng"><FiEdit2 size={14} /></Link>
                  </div>
                </div>
              </div>

              {/* Dropdown từng thửa (multi & expanded) */}
              {isMulti && isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/70">
                  <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1.2fr_1.2fr_auto] items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <div className="pl-7">Thửa đất</div>
                    <div className="text-right">Tích lũy</div>
                    <div className="text-right">Điều chỉnh</div>
                    <div className="text-right">Đã bán</div>
                    <div className="text-right">Tồn kho</div>
                    <div /><div />
                  </div>
                  {productFarms.map(farm => {
                    const fStock = calcStock(farm);
                    const adj = farm.stockAdjustment || 0;
                    const sold = farm.soldOutsideKg || 0;
                    return (
                      <div key={farm._id} className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1.2fr_1.2fr_auto] items-center gap-2 px-4 py-2.5 border-t border-gray-100">
                        <div className="pl-7">
                          <p className="text-sm font-medium text-gray-800">{farm.name}</p>
                          <p className="text-xs text-gray-400">{farm.cropType}</p>
                        </div>
                        <div className="text-right text-sm text-gray-600">{(farm.cumulativeYieldKg || 0) > 0 ? `${farm.cumulativeYieldKg.toLocaleString()} kg` : '—'}</div>
                        <div className="text-right text-sm">
                          <span className={adj < 0 ? 'text-red-500' : adj > 0 ? 'text-green-600' : 'text-gray-400'}>
                            {adj !== 0 ? `${adj > 0 ? '+' : ''}${adj.toLocaleString()} kg` : '—'}
                          </span>
                        </div>
                        <div className="text-right text-sm text-gray-500">{sold > 0 ? `${sold.toLocaleString()} kg` : '—'}</div>
                        <div className="text-right">
                          <span className={`text-sm font-semibold ${fStock < 0 ? 'text-red-600' : fStock === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                            {(farm.cumulativeYieldKg || 0) > 0 ? `${fStock.toLocaleString()} kg` : '—'}
                          </span>
                        </div>
                        <div />
                        <div className="flex items-center gap-1">
                          {(farm.cumulativeYieldKg || 0) > 0 && <>
                            <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho"><FiSliders size={13} /></button>
                            <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho"><HistoryIcon /></button>
                          </>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Thửa chưa có sản phẩm - desktop */}
        {orphanFarms.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 px-1">Thửa đất chưa có bài đăng</p>
            {orphanFarms.map(farm => {
              const stock = calcStock(farm);
              const cumulative = farm.cumulativeYieldKg || 0;
              const adj = farm.stockAdjustment || 0;
              const sold = farm.soldOutsideKg || 0;
              const st = statusTag(stock, false, cumulative);
              return (
                <div key={farm._id} className="card grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1.2fr_1.2fr_auto] items-center gap-2 px-4 py-3 border-dashed border-orange-200 bg-orange-50/40">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{farm.name}</p>
                    <p className="text-xs text-gray-400">{farm.cropType || 'Chưa có cây trồng'}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">{cumulative > 0 ? `${cumulative.toLocaleString()} kg` : '—'}</div>
                  <div className="text-right text-sm">
                    <span className={adj < 0 ? 'text-red-500' : adj > 0 ? 'text-green-600' : 'text-gray-400'}>
                      {adj !== 0 ? `${adj > 0 ? '+' : ''}${adj.toLocaleString()} kg` : '—'}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-500">{sold > 0 ? `${sold.toLocaleString()} kg` : '—'}</div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${stock < 0 ? 'text-red-600' : cumulative === 0 ? 'text-gray-400' : 'text-green-700'}`}>
                      {cumulative > 0 ? `${stock.toLocaleString()} kg` : '—'}
                    </span>
                  </div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.text}</span></div>
                  <div className="flex items-center gap-1">
                    {cumulative > 0 && <>
                      <button onClick={() => onAdjust(farm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Cập nhật kho"><FiSliders size={14} /></button>
                      <button onClick={() => onHistory(farm)} className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg" title="Lịch sử kho"><HistoryIcon /></button>
                    </>}
                    <Link to="/farmer/products/new" className="text-xs bg-primary-600 text-white px-2 py-1 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap">
                      Đăng bán
                    </Link>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 px-1 pt-1">
        Công thức: <strong>Tồn thực tế = (Tích lũy + Điều chỉnh) − Đã bán</strong>
      </p>
    </div>
  );
};

export default InventoryTab;

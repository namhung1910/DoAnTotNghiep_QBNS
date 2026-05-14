/**
 * Hàm tính tồn kho thực tế của một thửa đất.
 * Đây là nguồn dữ liệu DUY NHẤT (Single Source of Truth) cho công thức tồn kho,
 * được dùng chung bởi chatDataService, farmController, và productController.
 *
 * Công thức:
 *   Tồn kho = cumulativeYieldKg + stockAdjustment - soldOutsideKg - soldProductQuantity
 *
 * Lưu ý về tính không chồng lấn:
 *   - soldOutsideKg: ghi nhận số kg đã bán NGOÀI hệ thống (qua farmController.adjustInventory type='sale')
 *   - soldProductQuantity: ghi nhận số kg đã bán QUA hệ thống (qua productController.recordSale → Product.soldQuantity)
 *   Hai trường này KHÔNG chồng lấn nhau theo thiết kế — mỗi kênh bán hàng ghi vào một trường riêng biệt.
 *
 * TODO scalability: Khi số lượng sản phẩm/nông dân tăng lên đáng kể, nên chuyển sang
 * MongoDB $aggregate pipeline để tính actualStock tại tầng DB thay vì tính trong JS.
 *
 * @param {object} farm - Đối tượng Farm (cần các trường: cumulativeYieldKg, stockAdjustment, soldOutsideKg)
 * @param {number} soldProductQuantity - Giá trị Product.soldQuantity (mặc định 0 nếu chưa có sản phẩm)
 * @returns {number} Tồn kho thực tế tính bằng kg, tối thiểu là 0
 */
export function calcActualStock(farm, soldProductQuantity = 0) {
    const cumulative  = farm?.cumulativeYieldKg || 0;
    const adjustment  = farm?.stockAdjustment   || 0;
    const soldOutside = farm?.soldOutsideKg      || 0;
    return Math.max(0, cumulative + adjustment - soldOutside - soldProductQuantity);
}

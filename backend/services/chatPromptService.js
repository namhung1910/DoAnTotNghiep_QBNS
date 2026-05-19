export const buildPrompt = (role, userData, historyContext, message) => {
    let systemPrompt = '';
    const today = new Date().toLocaleDateString('vi-VN');

    // Khối thời tiết — chỉ chèn khi có dữ liệu (đã qua kiểm tra keyword ở chatController)
    const weatherBlock = userData?.weatherSummary
        ? `\n${userData.weatherSummary}\n`
        : '';

    if (role === 'farmer') {
        const { myFarms, myHarvests, myProducts, summary } = userData;

        // Dòng hiển thị từng thửa đất kèm tồn kho thực tế
        const farmLines = myFarms && myFarms.length > 0
            ? myFarms.map(f =>
                `- ${f.name} (${f.cropType}) | Trạng thái: ${f.status} | Diện tích: ${f.area}m²\n` +
                `  Tồn kho thực: ${f.actualStock} kg${f.needsListing ? ' ⚠️ Chưa đăng bán!' : ''}\n` +
                `  Sản phẩm: ${f.linkedProductName ? `${f.linkedProductName} — ${f.linkedProductStatus}` : 'Chưa có bài đăng'}\n` +
                `  Ngày trồng: ${f.plantingDate ? new Date(f.plantingDate).toLocaleDateString('vi-VN') : 'Chưa rõ'} | ` +
                `Dự kiến thu hoạch: ${f.expectedHarvestDate ? new Date(f.expectedHarvestDate).toLocaleDateString('vi-VN') : 'Chưa rõ'}`
            ).join('\n')
            : '- Chưa có thửa đất nào đang canh tác';

        // Dòng lịch sử thu hoạch
        const harvestLines = myHarvests && myHarvests.length > 0
            ? myHarvests.map(h => `- ${h.quarter || 'N/A'} (${new Date(h.harvestDate).toLocaleDateString('vi-VN')}): ${h.cropType} đạt ${h.yieldInKg}kg`).join('\n')
            : '- Chưa có lịch sử thu hoạch';

        // Dòng sản phẩm đang đăng bán (dùng soldQuantity đúng với schema)
        const productLines = myProducts && myProducts.length > 0
            ? myProducts.map(p => `- ${p.productName}: ${p.price}đ, Đã bán: ${p.soldQuantity || 0}kg, Trạng thái: ${p.status}, Lượt xem: ${p.viewCount}`).join('\n')
            : '- Chưa đăng bán sản phẩm nào';

        systemPrompt = `Tên bạn là Dewy — trợ lý nông nghiệp AI của Hệ thống Quản lý HTX Nông sản.
Bạn đang hỗ trợ một Nông dân trong HTX. Tính cách của bạn thân thiện, gần gũi và nhiệt tình. Luôn xưng là Tôi, gọi người dùng là Bạn.

=== DỮ LIỆU THỰC TẾ CỦA NÔNG DÂN NÀY ===
Tổng quan:
- Số thửa đang theo dõi: ${summary.totalFarms} (đang canh tác: ${summary.activeCultivation})
- Tổng sản lượng tích lũy: ${summary.totalYieldKg} kg
- Tổng tồn kho ước tính: ${summary.totalStockKg} kg

Kho hàng từng thửa đất (tối đa 5 thửa gần nhất đang hoạt động):
${farmLines}

Lịch sử thu hoạch gần đây:
${harvestLines}

Sản phẩm đang đăng bán:
${productLines}
==========================================${weatherBlock}
NGUYÊN TẮC TRẢ LỜI NGHIÊM NGẶT:
1. Giao tiếp tự nhiên, ngắn gọn như một người bạn/trợ lý. TUYỆT ĐỐI KHÔNG tự động liệt kê hoặc báo cáo các số liệu (như tổng diện tích, số sản phẩm...) nếu người dùng không hỏi trực tiếp.
2. CHỈ sử dụng dữ liệu tham khảo ở trên để trả lời KHI CÓ LIÊN QUAN đến câu hỏi.
3. Hướng dẫn kỹ thuật canh tác, xử lý sâu bệnh, thời vụ nếu được hỏi.
4. Xử lý câu hỏi ngoài luồng: Nếu Bạn hỏi những thứ không liên quan đến nông nghiệp, thông tin HTX (như thể thao, giải trí, toán học...), Tôi hãy đáp lại thật ngắn gọn (ví dụ: "Tôi không rõ về chủ đề này") và LẬP TỨC ĐẶT 1 CÂU HỎI MỞ liên quan đến nông nghiệp để lái cuộc trò chuyện về đúng mục đích (vd: "... Bạn có đang gặp vấn đề gì với mảnh ruộng của mình không?").
5. Trả lời bằng tiếng Việt.
Hôm nay là: ${today}.`;

    } else if (role === 'admin') {
        const { systemStats, farmsByStatus, cropBreakdown, regionStats,
                pendingProductDetails, pendingLandRequests, alerts } = userData;

        // Dòng cơ cấu cây trồng
        const cropLines = cropBreakdown && cropBreakdown.length > 0
            ? cropBreakdown.map(c => `- ${c._id}: ${c.farmCount} thửa, ${Math.round(c.totalArea)}m², tích lũy ${Math.round(c.totalYield)}kg`).join('\n')
            : '- Chưa có dữ liệu';

        // Dòng thống kê theo vùng quy hoạch
        const regionLines = regionStats && regionStats.length > 0
            ? regionStats.map(r =>
                `- [${r.zoneCode || 'N/A'}] ${r.regionName || 'Chưa phân vùng'}: ${r.farmCount} thửa | ${Math.round(r.totalArea)}m² | ${Math.round(r.totalYield)}kg | Cây: ${(r.crops || []).filter(Boolean).join(', ') || 'N/A'}`
              ).join('\n')
            : '- Chưa có dữ liệu vùng quy hoạch';

        // Dòng sản phẩm chờ duyệt
        const pendingProductLines = pendingProductDetails && pendingProductDetails.length > 0
            ? pendingProductDetails.map(p =>
                `  • ${p.productName} — ${p.farmerId?.fullName || 'N/A'} | ${p.price?.toLocaleString('vi-VN')}đ/${p.unit} | ${p.certification}`
              ).join('\n')
            : '  (Không có)';

        // Dòng yêu cầu cấp đất
        const pendingLandLines = pendingLandRequests && pendingLandRequests.length > 0
            ? pendingLandRequests.map(r =>
                `  • ${r.user?.fullName || 'N/A'}${r.user?.phone ? ' (' + r.user.phone + ')' : ''} — xin ${r.requestedArea}m² trồng ${r.cropType || 'chưa xác định'}`
              ).join('\n')
            : '  (Không có)';

        // Dòng cảnh báo thửa chưa nhập sản lượng
        const missingYieldLines = alerts?.missingYieldFarms?.length > 0
            ? alerts.missingYieldFarms.map(f => `  • ${f.name} — ${f.ownerId?.fullName || 'N/A'}`).join('\n')
            : '  (Không có)';

        // Dòng thửa sắp thu hoạch — xử lý cả trường hợp đang thu hoạch (status=harvesting, ko có ngày)
        const upcomingHarvestLines = alerts?.upcomingHarvests?.length > 0
            ? alerts.upcomingHarvests.map(f => {
                const dateStr = f.expectedHarvestDate
                    ? new Date(f.expectedHarvestDate).toLocaleDateString('vi-VN')
                    : 'Đang thu hoạch (chưa nhập ngày cụ thể)';
                return `  • ${f.name} (${f.cropType}) — ${f.ownerId?.fullName || 'N/A'} | Ngày: ${dateStr} | Ước tính: ${f.expectedYield || 0}kg`;
              }).join('\n')
            : '  (Không có)';

        systemPrompt = `Tên bạn là Dewy — trợ lý quản lý AI của Hệ thống Quản lý HTX Nông sản.
Bạn đang hỗ trợ Ban Quản trị HTX. Tính cách của bạn chuyên nghiệp, rõ ràng, nhưng vẫn thân thiện. Luôn xưng là Tôi, gọi người dùng là Bạn.

=== DỮ LIỆU TOÀN HỆ THỐNG HTX ===

Tổng quan:
- Nông dân: ${systemStats.totalFarmers} | Thửa đất: ${systemStats.totalFarms} | Diện tích: ${Math.round(systemStats.totalArea)}m²
- Tổng sản lượng tích lũy: ${Math.round(systemStats.totalYieldKg)}kg

Tình trạng mùa vụ (số thửa):
- Lên kế hoạch: ${farmsByStatus.planning || 0} | Gieo trồng: ${farmsByStatus.planting || 0} | Phát triển: ${farmsByStatus.growing || 0} | Đang thu: ${farmsByStatus.harvesting || 0} | Đã thu: ${farmsByStatus.harvested || 0}

Cơ cấu cây trồng toàn HTX:
${cropLines}

Thống kê theo vùng quy hoạch:
${regionLines}

⚠️ CẦN XỬ LÝ:
Sản phẩm chờ duyệt (${pendingProductDetails?.length || 0}):
${pendingProductLines}

Yêu cầu cấp đất chờ duyệt (${pendingLandRequests?.length || 0}):
${pendingLandLines}

Thửa đã thu hoạch chưa nhập sản lượng (${alerts?.missingYieldFarms?.length || 0}):
${missingYieldLines}

Sắp thu hoạch trong 7 ngày tới (${alerts?.upcomingHarvests?.length || 0}):
${upcomingHarvestLines}
==========================================${weatherBlock}
NGUYÊN TẮC TRẢ LỜI NGHIÊM NGẶT:
1. Trả lời tự nhiên, chuyên nghiệp và đi thẳng vào vấn đề. TUYỆT ĐỐI KHÔNG tự động tóm tắt hoặc liệt kê các dữ liệu hệ thống nếu Admin không có yêu cầu cụ thể.
2. CHỈ trích xuất dữ liệu khi phân tích câu hỏi hoặc thống kê.
3. Cung cấp phân tích sâu sắc từ dữ liệu hệ thống để hỗ trợ ra quyết định, kiến thức quy hoạch, chính sách nông nghiệp.
4. Xử lý câu hỏi ngoài luồng: Nếu Bạn hỏi ngoài lề (không thuộc quản lý HTX, nông nghiệp...), hãy trả lời rất ngắn gọn và lái về công việc bằng 1 câu hỏi mở (vd: "... Bạn có muốn xem báo cáo sản lượng hôm nay không?").
5. Trả lời bằng tiếng Việt.
Hôm nay là: ${today}.`;



    } else {
        // Role public — khách vãng lai và người tiêu dùng
        const { activeProducts, systemSummary } = userData;

        // Hiển thị sản phẩm kèm thông tin liên lạc và tồn kho (thông tin công khai)
        const productLines = activeProducts && activeProducts.length > 0
            ? activeProducts.map(p =>
                `- ${p.productName}: ${p.price}đ/${p.unit} | Chứng nhận: ${p.certification}\n` +
                `  Còn lại: ${p.actualStock > 0 ? p.actualStock + ' kg' : 'Hết hàng — liên hệ HTX'}\n` +
                `  Người bán: ${p.sellerName} | SĐT: ${p.sellerPhone} | Địa chỉ: ${p.sellerAddress}\n` +
                `  Mô tả: ${p.description || 'Chưa có mô tả'}`
            ).join('\n')
            : '- Hiện chưa có sản phẩm nào';

        systemPrompt = `Tên bạn là Dewy — trợ lý ảo AI của HTX Nông sản, đang hỗ trợ Khách vãng lai và Người tiêu dùng. Tính cách của bạn thoải mái, thân thiện và dễ gần. Luôn xưng là Tôi, gọi người dùng là Bạn.

=== DỮ LIỆU CÔNG KHAI CỦA HTX ===
- Số nông dân tham gia: ${systemSummary.totalFarmers}
- Tổng diện tích canh tác: ${systemSummary.totalFarmArea} m²

Sản phẩm nổi bật đang bán (thông tin liên hệ và tồn kho là công khai):
${productLines}

(Đây là top 10 sản phẩm nổi bật nhất. Bạn có thể xem thêm tại trang sản phẩm của HTX.)
=========================================

NGUYÊN TẮC TRẢ LỜI NGHIÊM NGẶT:
1. Trả lời tự nhiên, ngắn gọn và thân thiện. TUYỆT ĐỐI KHÔNG BẮT ĐẦU bằng việc thống kê "HTX có x nông dân, y hecta..." nếu họ không hỏi.
2. KHÔNG chủ động liệt kê danh sách sản phẩm trừ khi người dùng nhờ gợi ý hoặc hỏi mua.
3. Thông tin sản phẩm (tên người bán, SĐT, địa chỉ, số lượng còn lại) là THÔNG TIN CÔNG KHAI — cung cấp đầy đủ khi được hỏi. KHÔNG tiết lộ các số liệu kho nội bộ như điều chỉnh hao hụt.
4. Xử lý câu hỏi ngoài luồng: Nếu Bạn hỏi chuyện phím hoặc các chủ đề ngoài lề (nhạc, bóng đá, thể thao...), Tôi hãy đáp ngắn gọn nhẹ nhàng và ĐẶT 1 CÂU HỎI MỞ để kéo Bạn về nông sản (vd: "... Tôi chỉ là trợ lý nông nghiệp thôi. Bạn có muốn tìm hiểu về các loại gạo ngon đang bán không?").
5. Trả lời bằng tiếng Việt.
Hôm nay là: ${today}.`;
    }

    return `${systemPrompt}

Lịch sử hội thoại:
${historyContext ? historyContext : '(Chưa có lịch sử)'}

Người dùng: ${message}`;
};

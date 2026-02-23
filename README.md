# 🌾 Hệ Thống Quảng Bá và Hoạch Định Vùng Nông Sản

Hệ thống phần mềm full-stack giúp quảng bá nông sản và hỗ trợ hoạch định vùng nông nghiệp, sử dụng công nghệ bản đồ số GIS và trí tuệ nhân tạo.

![NôngSản Việt Nam](https://img.shields.io/badge/Nông_Sản-Việt_Nam-green)
![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/MongoDB-GeoSpatial-green)

## 📋 Tính Năng Chính

### 🌐 Màn Hình Public (Khách vãng lai)
- **Bản đồ tương tác**: Xem trực quan các vùng quy hoạch nông nghiệp với Leaflet
- **Tra cứu quy hoạch**: Click vào vùng để xem thông tin thổ nhưỡng, loại cây trồng
- **Danh mục sản phẩm**: Xem nông sản gắn liền với vị trí địa lý
- **Truy xuất nguồn gốc**: Xem quy trình sản xuất, chứng nhận VietGAP/GlobalGAP
- **Trợ lý AI**: Chatbot tư vấn thị trường, giá cả (Gemini AI)

### 👨‍🌾 Màn Hình Nông Dân (Role: Farmer)
- **Quản lý thửa đất**: Xem vị trí và ranh giới các lô đất được giao
- **Cập nhật mùa vụ**: Khai báo trạng thái canh tác
- **Đăng tin quảng bá**: Đăng tải sản phẩm nông sản
- **Trợ lý kỹ thuật AI**: Hỏi đáp kỹ thuật canh tác, sâu bệnh
- **Theo dõi phản hồi**: Xem yêu cầu liên hệ từ khách hàng

### 🏢 Màn Hình Quản Trị (Role: Admin/HTX)
- **Số hóa bản đồ GIS**: Upload GeoJSON, vẽ vùng quy hoạch
- **Phân vùng & Giao đất**: Chia lô và gán cho nông dân
- **Kiểm duyệt nội dung**: Phê duyệt bài đăng của nông dân
- **Quản lý danh mục**: Cây trồng, chính sách nông nghiệp
- **Thống kê & Báo cáo**: Dashboard tổng hợp dữ liệu

## 🛠️ Công Nghệ Sử Dụng

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, React Router |
| Maps | Leaflet, React-Leaflet, GeoJSON |
| Backend | Node.js, Express.js |
| Database | MongoDB (GeoSpatial Index) |
| AI | Google Gemini 1.5 Flash API |
| Charts | Recharts |
| Auth | JWT, bcryptjs |

## 📁 Cấu Trúc Dự Án

```
DoAn/
├── backend/                    # Backend API
│   ├── config/                 # Cấu hình DB
│   ├── controllers/            # Logic xử lý
│   ├── middleware/             # Auth, Upload
│   ├── models/                 # MongoDB schemas
│   ├── routes/                 # API routes
│   ├── scripts/                # Seed data
│   └── server.js               # Entry point
│
├── src/                        # Frontend React
│   ├── components/             # UI components
│   │   ├── auth/               # Protected routes
│   │   ├── chat/               # AI Chatbot
│   │   ├── common/             # Header, Footer, Modal
│   │   ├── layouts/            # Page layouts
│   │   ├── map/                # Leaflet Map
│   │   └── products/           # Product cards
│   ├── context/                # React Context
│   ├── pages/                  # Page components
│   │   ├── admin/              # Admin dashboard
│   │   ├── auth/               # Login
│   │   ├── farmer/             # Farmer dashboard
│   │   └── public/             # Public pages
│   └── services/               # API calls
│
├── package.json                # Frontend dependencies
└── README.md                   # Documentation
```

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu
- Node.js >= 18.x
- MongoDB >= 6.x
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd DoAn
```

### 2. Cài Đặt Backend
```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend`:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/QuangBaNongSanDB

# JWT Secret Key
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Server Port
PORT=5000

# Gemini API Key (Lấy từ: https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 3. Khởi Tạo Database
```bash
# Seed dữ liệu mẫu
npm run seed
```

### 4. Cài Đặt Frontend
```bash
cd ..
npm install
```

### 5. Chạy Ứng Dụng

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Truy cập: http://localhost:5173

## 👤 Tài Khoản Demo

| Role | Username | Password |
|------|----------|----------|
| Admin (HTX) | `admin_htx` | `123456` |
| Nông dân 1 | `nongdan_hung` | `123456` |
| Nông dân 2 | `nongdan_lan` | `123456` |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/profile` - Lấy thông tin profile

### Regions (Vùng quy hoạch)
- `GET /api/regions` - Danh sách vùng
- `GET /api/regions/geojson` - GeoJSON data
- `POST /api/regions` - Tạo vùng mới (Admin)
- `POST /api/regions/upload-geojson` - Upload GeoJSON (Admin)

### Farms (Thửa đất)
- `GET /api/farms` - Danh sách thửa đất
- `GET /api/farms/geojson` - GeoJSON data
- `GET /api/farms/user/my-farms` - Thửa đất của tôi (Farmer)
- `PUT /api/farms/:id/season` - Cập nhật mùa vụ (Farmer)

### Products (Sản phẩm)
- `GET /api/products` - Danh sách sản phẩm (approved)
- `GET /api/products/:id` - Chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm (Farmer)
- `GET /api/products/admin/pending` - Sản phẩm chờ duyệt (Admin)
- `PUT /api/products/:id/review` - Duyệt sản phẩm (Admin)

### Chat (AI)
- `POST /api/chat/message` - Gửi tin nhắn
- `GET /api/chat/history/:sessionId` - Lịch sử chat

### Statistics (Thống kê)
- `GET /api/statistics/overview` - Tổng quan (Admin)
- `GET /api/statistics/harvest-forecast` - Dự báo thu hoạch

## 🗺️ Tích Hợp Bản Đồ

### Format GeoJSON
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Vùng trồng lúa",
        "soilType": "Phù sa",
        "plannedCrops": ["Lúa", "Rau"]
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[106.38, 20.40], [106.42, 20.40], ...]]
      }
    }
  ]
}
```

## 🤖 Tích Hợp AI Gemini

Để sử dụng chatbot AI:
1. Truy cập https://aistudio.google.com/
2. Tạo API key
3. Thêm vào file `.env` backend

## 📱 Screenshots

### Trang Chủ
- Hero section với giới thiệu hệ thống
- Nông sản nổi bật
- Các tính năng chính

### Bản Đồ Quy Hoạch
- Hiển thị vùng quy hoạch (polygon)
- Hiển thị thửa đất (màu theo trạng thái)
- Click để xem thông tin chi tiết

### Dashboard Nông Dân
- Thống kê thửa đất, sản phẩm
- Cập nhật mùa vụ
- Đăng sản phẩm mới

### Dashboard Admin
- Biểu đồ thống kê
- Upload GeoJSON
- Duyệt sản phẩm

## 🔧 Development

### Chạy lệnh lint
```bash
npm run lint
```

### Build production
```bash
npm run build
```

## 📄 License

MIT License - Đồ án tốt nghiệp

## 👨‍💻 Tác Giả

Đồ án tốt nghiệp - Hệ thống quảng bá và hoạch định vùng nông sản

---

🌾 **NôngSản Việt Nam** - Kết nối nông dân với người tiêu dùng

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public Pages
import HomePage from './pages/public/HomePage';
import MapPage from './pages/public/MapPage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Farmer Pages
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import MyFarmsPage from './pages/farmer/MyFarmsPage';
import MyProductsPage from './pages/farmer/MyProductsPage';
import CreateProductPage from './pages/farmer/CreateProductPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import RegionsManagePage from './pages/admin/RegionsManagePage';
import CreateRegionPage from './pages/admin/CreateRegionPage';
import AssignFarmPage from './pages/admin/AssignFarmPage';
import LandRequestsPage from './pages/admin/LandRequestsPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import PendingProductsPage from './pages/admin/PendingProductsPage';
import UsersManagePage from './pages/admin/UsersManagePage';
import CropTypesPage from './pages/admin/CropTypesPage';
import StatisticsPage from './pages/admin/StatisticsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#333',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Farmer Routes */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute roles={['farmer', 'admin']}>
                <DashboardLayout type="farmer" />
              </ProtectedRoute>
            }
          >
            <Route index element={<FarmerDashboard />} />
            <Route path="farms" element={<MyFarmsPage />} />
            <Route path="products" element={<MyProductsPage />} />
            <Route path="products/new" element={<CreateProductPage />} />
            <Route path="products/:id/edit" element={<CreateProductPage />} />
            <Route path="contacts" element={<FarmerDashboard />} />
            <Route path="profile" element={<FarmerDashboard />} />
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <DashboardLayout type="admin" />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="regions" element={<RegionsManagePage />} />
            <Route path="regions/upload" element={<RegionsManagePage />} />
            <Route path="regions/new" element={<CreateRegionPage />} />
            <Route path="regions/draw" element={<CreateRegionPage />} />
            <Route path="regions/draw" element={<CreateRegionPage />} />
            <Route path="land-requests" element={<LandRequestsPage />} />
            <Route path="complaints" element={<AdminComplaintsPage />} />
            <Route path="farms/assign" element={<AssignFarmPage />} />
            <Route path="products" element={<PendingProductsPage />} />
            <Route path="products/pending" element={<PendingProductsPage />} />
            <Route path="products/:id/review" element={<PendingProductsPage />} />
            <Route path="users" element={<UsersManagePage />} />
            <Route path="crop-types" element={<CropTypesPage />} />
            <Route path="policies" element={<AdminDashboard />} />
            <Route path="statistics" element={<StatisticsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-gray-600 mb-8">Trang không tồn tại</p>
                <a href="/" className="btn-primary">Về trang chủ</a>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

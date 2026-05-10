import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Layouts & Auth — imported statically (light shell components needed immediately)
import MainLayout from './components/layouts/MainLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import OfflineNotification from './components/common/OfflineNotification';

// Minimal page loader shown during chunk download
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Đang tải...</p>
    </div>
  </div>
);

// ── Public Pages ─────────────────────────────────────────────────────────────
const HomePage = lazy(() => import('./pages/public/HomePage'));
const MapPage = lazy(() => import('./pages/public/MapPage'));
const ProductsPage = lazy(() => import('./pages/public/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'));

// ── Auth Pages ────────────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

// ── Farmer Pages ──────────────────────────────────────────────────────────────
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const MyFarmsPage = lazy(() => import('./pages/farmer/MyFarmsPage'));
const MyProductsPage = lazy(() => import('./pages/farmer/MyProductsPage'));
const CreateProductPage = lazy(() => import('./pages/farmer/CreateProductPage'));
const FarmerStatisticsPage = lazy(() => import('./pages/farmer/FarmerStatisticsPage'));
const AccountSettingsPage = lazy(() => import('./pages/farmer/AccountSettingsPage'));

// ── Admin Pages ───────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const RegionsManagePage = lazy(() => import('./pages/admin/RegionsManagePage'));
const CreateRegionPage = lazy(() => import('./pages/admin/CreateRegionPage'));
const AssignFarmPage = lazy(() => import('./pages/admin/AssignFarmPage'));
const LandRequestsPage = lazy(() => import('./pages/admin/LandRequestsPage'));
const AdminComplaintsPage = lazy(() => import('./pages/admin/AdminComplaintsPage'));
const PendingProductsPage = lazy(() => import('./pages/admin/PendingProductsPage'));
const UsersManagePage = lazy(() => import('./pages/admin/UsersManagePage'));
const StatisticsPage = lazy(() => import('./pages/admin/StatisticsPage'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <OfflineNotification />
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

        <Suspense fallback={<PageLoader />}>
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
              <Route path="statistics" element={<FarmerStatisticsPage />} />
              <Route path="contacts" element={<FarmerDashboard />} />
              <Route path="profile" element={<AccountSettingsPage />} />
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
              <Route path="land-requests" element={<LandRequestsPage />} />
              <Route path="complaints" element={<AdminComplaintsPage />} />
              <Route path="farms/assign" element={<AssignFarmPage />} />
              <Route path="products" element={<PendingProductsPage />} />
              <Route path="products/pending" element={<PendingProductsPage />} />
              <Route path="products/:id/review" element={<PendingProductsPage />} />
              <Route path="users" element={<UsersManagePage />} />
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
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;

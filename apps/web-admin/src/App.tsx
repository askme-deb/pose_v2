import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@pospe/ui-library';

import AppShell from './layouts/AppShell';
import PublicLayout from './layouts/PublicLayout';
import RoleGate from './routes/RoleGate';

import LandingPage from './pages/auth/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import TwoFactorPage from './pages/auth/TwoFactorPage';
import OtpVerificationPage from './pages/auth/OtpVerificationPage';

import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/inventory/ProductsPage';
import CategoriesBrandsPage from './pages/inventory/CategoriesBrandsPage';
import StockAdjustmentsPage from './pages/inventory/StockAdjustmentsPage';
import PurchaseOrdersPage from './pages/purchases/PurchaseOrdersPage';
import SalesInvoicesPage from './pages/sales/SalesInvoicesPage';
import WarehouseTransfersPage from './pages/warehouse/WarehouseTransfersPage';
import CustomersPage from './pages/crm/CustomersPage';
import GstReportsPage from './pages/gst/GstReportsPage';
import ReportsAnalyticsPage from './pages/reports/ReportsAnalyticsPage';
import BusinessProfilePage from './pages/settings/BusinessProfilePage';
import UserRolesPage from './pages/roles/UserRolesPage';
import MobileAppsPage from './pages/mobile/MobileAppsPage';

import SuperAdminDashboardPage from './pages/superadmin/SuperAdminDashboardPage';
import SuperAdminTenantsPage from './pages/superadmin/SuperAdminTenantsPage';
import SuperAdminSubscriptionsPage from './pages/superadmin/SuperAdminSubscriptionsPage';
import SuperAdminWhiteLabelPage from './pages/superadmin/SuperAdminWhiteLabelPage';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/2fa" element={<TwoFactorPage />} />
            <Route path="/otp-verification" element={<OtpVerificationPage />} />
          </Route>

          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory/products" element={<ProductsPage />} />
            <Route path="/inventory/categories" element={<CategoriesBrandsPage />} />
            <Route path="/inventory/stock-adjustments" element={<StockAdjustmentsPage />} />
            <Route path="/purchases" element={<PurchaseOrdersPage />} />
            <Route path="/sales/invoices" element={<SalesInvoicesPage />} />
            <Route path="/warehouse/transfers" element={<WarehouseTransfersPage />} />
            <Route path="/crm/customers" element={<CustomersPage />} />
            <Route path="/gst/reports" element={<GstReportsPage />} />
            <Route path="/reports/analytics" element={<ReportsAnalyticsPage />} />
            <Route path="/settings/business-profile" element={<BusinessProfilePage />} />
            <Route path="/roles" element={<UserRolesPage />} />
            <Route path="/mobile-apps" element={<MobileAppsPage />} />

            <Route element={<RoleGate allow={['super_admin']} />}>
              <Route path="/superadmin" element={<SuperAdminDashboardPage />} />
              <Route path="/superadmin/tenants" element={<SuperAdminTenantsPage />} />
              <Route path="/superadmin/subscriptions" element={<SuperAdminSubscriptionsPage />} />
              <Route path="/superadmin/white-label" element={<SuperAdminWhiteLabelPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

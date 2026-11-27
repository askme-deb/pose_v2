import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePermission } from '../hooks/usePermission';
import CashierNotice from '../components/CashierNotice';

export default function RequireAuth() {
  const { user, token } = useAuthStore();
  // Same rule as the services' isFrontline(): a cashier without reporting rights.
  const canViewReports = usePermission('report:view');

  // A session without a token can't call any API, so treat it as logged out.
  if (!user || !token) return <Navigate to="/login" replace />;

  if (user.role === 'cashier' && !canViewReports) return <CashierNotice />;

  return <Outlet />;
}

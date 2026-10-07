import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function RequireAuth() {
  const { user, token } = useAuthStore();

  // A session without a token can't call any API, so treat it as logged out.
  if (!user || !token) return <Navigate to="/login" replace />;

  return <Outlet />;
}

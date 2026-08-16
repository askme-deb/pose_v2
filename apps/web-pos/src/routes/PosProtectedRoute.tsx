import { Navigate, Outlet } from 'react-router-dom';
import { usePosSessionStore } from '../store/usePosSessionStore';

export default function PosProtectedRoute() {
  const session = usePosSessionStore((s) => s.session);
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

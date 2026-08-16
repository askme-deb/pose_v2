import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@pospe/permissions';
import { useAuthStore } from '../store/useAuthStore';

export default function RoleGate({ allow }: { allow: Role[] }) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const roleHome: Record<string, string> = {
  admin: '/reportes',
  cashier: '/pos',
  kitchen: '/kitchen',
};

export function RoleRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const target = roleHome[profile?.role ?? 'cashier'] ?? '/pos';
  return <Navigate to={target} replace />;
}

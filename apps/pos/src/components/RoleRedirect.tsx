import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const roleHome: Record<string, string> = {
  admin: '/reportes',
  cashier: '/pos',
  waiter: '/pos',
  kitchen: '/kitchen',
};

export function RoleRedirect() {
  const { profile, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[color:var(--color-bg)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if business line is selected in sessionStorage
  const storedLine = sessionStorage.getItem('activeBusinessLineId');
  if (!storedLine) {
    return <Navigate to="/select-line" replace />;
  }

  const target = roleHome[profile?.role ?? 'cashier'] ?? '/pos';
  return <Navigate to={target} replace />;
}

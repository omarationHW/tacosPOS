import { LayoutDashboard, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function Dashboard() {
  const { profile } = useAuth();
  const { ordersToday, revenueToday, popularProducts, loading } = useDashboardStats();

  const avgPerOrder = ordersToday > 0 ? revenueToday / ordersToday : 0;
  const maxQty = popularProducts.length > 0 ? popularProducts[0].totalQty : 1;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <LayoutDashboard className="text-amber-500" size={28} />
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
      </div>

      {/* Greeting */}
      <p className="mb-6 text-lg text-gray-300">
        Bienvenido,{' '}
        <span className="font-semibold text-amber-500">
          {profile?.full_name || profile?.email}
        </span>
      </p>

      {/* Metric cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-2 flex items-center gap-2 text-gray-400">
            <ShoppingBag size={18} />
            <span className="text-sm">Pedidos Hoy</span>
          </div>
          <p className="text-3xl font-bold text-gray-100">{ordersToday}</p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-2 flex items-center gap-2 text-gray-400">
            <DollarSign size={18} />
            <span className="text-sm">Ingresos Hoy</span>
          </div>
          <p className="text-3xl font-bold text-gray-100">${revenueToday.toFixed(2)}</p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-2 flex items-center gap-2 text-gray-400">
            <TrendingUp size={18} />
            <span className="text-sm">Promedio por Pedido</span>
          </div>
          <p className="text-3xl font-bold text-gray-100">${avgPerOrder.toFixed(2)}</p>
        </div>
      </div>

      {/* Popular products */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-100">Productos Populares</h2>
        {popularProducts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aún no hay ventas hoy. Los productos más vendidos aparecerán aquí.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {popularProducts.map((product) => (
              <div key={product.name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{product.name}</span>
                  <span className="text-sm text-gray-400">{product.totalQty} vendidos</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${(product.totalQty / maxQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

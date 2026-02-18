import { useState } from 'react';
import { LayoutDashboard, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, type DashboardPeriod } from '@/hooks/useDashboardStats';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const periodLabels: Record<DashboardPeriod, string> = {
  today: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

export function Dashboard() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const { ordersCount, revenue, popularProducts, loading } = useDashboardStats(period);

  const avgPerOrder = ordersCount > 0 ? revenue / ordersCount : 0;
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
      <p className="mb-4 text-lg text-gray-300">
        Bienvenido,{' '}
        <span className="font-semibold text-amber-500">
          {profile?.full_name || profile?.email}
        </span>
      </p>

      {/* Period filter */}
      <div className="mb-6 flex gap-2">
        {(Object.keys(periodLabels) as DashboardPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors
              ${period === p
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Metric cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-2 flex items-center gap-2 text-gray-400">
            <ShoppingBag size={18} />
            <span className="text-sm">Pedidos</span>
          </div>
          <p className="text-3xl font-bold text-gray-100">{ordersCount}</p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="mb-2 flex items-center gap-2 text-gray-400">
            <DollarSign size={18} />
            <span className="text-sm">Ingresos</span>
          </div>
          <p className="text-3xl font-bold text-gray-100">${revenue.toFixed(2)}</p>
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
            Aun no hay ventas en este periodo. Los productos mas vendidos apareceran aqui.
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

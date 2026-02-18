import { useState } from 'react';
import { ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import type { KitchenOrder } from '@/hooks/useKitchenOrders';
import { KitchenOrderCard } from '@/components/kitchen/KitchenOrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function Kitchen() {
  const { orders, loading, advanceOrder } = useKitchenOrders();
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const handleAdvance = async (order: KitchenOrder) => {
    setBusyOrderId(order.id);
    try {
      await advanceOrder(order);
    } catch {
      toast.error('Error al actualizar la orden');
    } finally {
      setBusyOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ChefHat className="text-amber-500" size={28} />
        <h1 className="text-2xl font-bold text-gray-100">Cocina</h1>
        {orders.length > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-sm font-medium text-amber-400">
            {orders.length} activa{orders.length !== 1 && 's'}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-12 text-center">
          <ChefHat className="mx-auto mb-3 text-gray-600" size={48} strokeWidth={1.5} />
          <p className="text-gray-400">No hay órdenes activas</p>
          <p className="mt-1 text-sm text-gray-500">
            Las nuevas órdenes aparecerán aquí automáticamente
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              onAdvance={handleAdvance}
              busy={busyOrderId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

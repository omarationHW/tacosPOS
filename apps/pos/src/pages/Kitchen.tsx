import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChefHat } from 'lucide-react';
import { toast } from 'sonner';
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
        <ChefHat className="text-[color:var(--color-accent)]" size={32} />
        <h1 className="font-display text-3xl font-semibold text-[color:var(--color-fg)]">Cocina</h1>
        {orders.length > 0 && (
          <span className="rounded-full bg-[color:var(--color-accent-soft)] px-3 py-0.5 text-sm font-semibold text-[color:var(--color-accent)]">
            {orders.length} activa{orders.length !== 1 && 's'}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-12 text-center">
          <ChefHat className="mx-auto mb-3 text-[color:var(--color-fg-subtle)]" size={48} strokeWidth={1.5} />
          <p className="text-[color:var(--color-fg-muted)]">No hay órdenes activas</p>
          <p className="mt-1 text-sm text-[color:var(--color-fg-subtle)]">
            Las nuevas órdenes aparecerán aquí automáticamente
          </p>
        </div>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <KitchenOrderCard
                  order={order}
                  orderNumber={index + 1}
                  onAdvance={handleAdvance}
                  busy={busyOrderId === order.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChefHat, Printer, PrinterCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useKitchenOrders } from '@/hooks/useKitchenOrders';
import type { KitchenOrder } from '@/hooks/useKitchenOrders';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import type { ComandaOrder } from '@/lib/printer/ticket';
import { KitchenOrderCard } from '@/components/kitchen/KitchenOrderCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/** Adapta una orden de cocina al formato de comanda imprimible. */
function toComanda(order: KitchenOrder): ComandaOrder {
  return {
    id: order.id,
    daily_order_number: order.daily_order_number,
    order_type: order.order_type,
    customer_name: order.customer_name,
    notes: order.notes,
    created_at: order.created_at,
    pickup_at: order.pickup_at,
    table_name: order.table_name,
    business_line_name: order.business_line_name,
    items: order.order_items
      .filter((i) => i.status !== 'cancelled')
      .map((i) => ({
        quantity: i.quantity,
        product_name: i.product.name,
        notes: i.notes,
        modifiers: i.modifiers.map((m) => ({ name: m.modifier_name })),
      })),
  };
}

export function Kitchen() {
  const { status, deviceName, error, connect, disconnect, printComanda } = useBluetoothPrinter();
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // Al llegar pedidos nuevos con items, imprimir su comanda (si hay impresora).
  const handleNewOrders = useCallback(
    (newOrders: KitchenOrder[]) => {
      if (status !== 'connected') return;
      for (const order of newOrders) {
        printComanda(toComanda(order))
          .then(() => toast.success(`Comanda impresa #${order.daily_order_number ?? ''}`.trim()))
          .catch((e) => toast.error(`No se pudo imprimir: ${e.message}`));
      }
    },
    [status, printComanda],
  );

  const { orders, loading, advanceOrder } = useKitchenOrders({ onNewOrders: handleNewOrders });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

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

  /** Reimprime manualmente una comanda (botón en la tarjeta / long-press futuro). */
  const reprint = useCallback(
    (order: KitchenOrder) => {
      if (status !== 'connected') {
        toast.error('Conecta la impresora primero');
        return;
      }
      printComanda(toComanda(order))
        .then(() => toast.success('Comanda reimpresa'))
        .catch((e) => toast.error(`No se pudo imprimir: ${e.message}`));
    },
    [status, printComanda],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ChefHat className="text-[color:var(--color-accent)]" size={32} />
        <h1 className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">Cocina</h1>
        {orders.length > 0 && (
          <span className="rounded-full bg-[color:var(--color-accent-soft)] px-3 py-0.5 text-sm font-semibold text-[color:var(--color-accent)]">
            {orders.length} activa{orders.length !== 1 && 's'}
          </span>
        )}

        <div className="ml-auto">
          <PrinterButton
            status={status}
            deviceName={deviceName}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
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
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                  onReprint={status === 'connected' ? reprint : undefined}
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

function PrinterButton({
  status,
  deviceName,
  onConnect,
  onDisconnect,
}: {
  status: ReturnType<typeof useBluetoothPrinter>['status'];
  deviceName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (status === 'unsupported') {
    return (
      <span className="text-sm text-[color:var(--color-fg-subtle)]">
        Impresión no disponible en este navegador
      </span>
    );
  }

  if (status === 'connected') {
    return (
      <button
        onClick={onDisconnect}
        title={deviceName ?? 'Impresora conectada'}
        className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
      >
        <PrinterCheck size={16} />
        Impresora conectada
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={status === 'connecting'}
      className="flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-3 py-1.5 text-sm font-medium text-[color:var(--color-fg)] disabled:opacity-60"
    >
      {status === 'connecting' ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Printer size={16} />
      )}
      {status === 'connecting' ? 'Conectando…' : 'Conectar impresora'}
    </button>
  );
}

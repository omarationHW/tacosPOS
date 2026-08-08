import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChefHat, Printer, PrinterCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useKitchenOrders,
  getOrderPhase,
  orderFinalTotalKind,
  orderCurrentTotal,
  orderFixedSubtotal,
} from '@/hooks/useKitchenOrders';
import type { FinalTotalKind, KitchenOrder, KitchenOrderItem } from '@/hooks/useKitchenOrders';
import { useProducts } from '@/hooks/useProducts';
import { usePrinter, type PrinterStatus } from '@/contexts/PrinterContext';
import type { ComandaOrder } from '@/lib/printer/ticket';
import { KitchenOrderCard } from '@/components/kitchen/KitchenOrderCard';
import { FinalTotalModal } from '@/components/kitchen/FinalTotalModal';
import { ModifierModal } from '@/components/pos/ModifierModal';
import type { CartItemModifier } from '@/components/pos/OrderPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { applicableModifierGroups } from '@/lib/drinks';

const ORDER_TYPE_LABEL: Record<KitchenOrder['order_type'], string> = {
  dine_in: 'comer aquí',
  takeout: 'para llevar',
  delivery: 'a domicilio',
};

/** Adapta una orden de cocina al formato de comanda imprimible (reimpresión). */
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
    cashier_name: order.cashier_name,
    items: order.order_items
      .filter((i) => i.status !== 'cancelled')
      .map((i) => ({
        quantity: i.quantity,
        product_name: i.product.name,
        notes: i.notes,
        subtotal: i.subtotal,
        category_name: i.category_name,
        modifiers: i.modifiers.map((m) => ({ name: m.modifier_name, group: m.group_name })),
      })),
  };
}

export function Kitchen() {
  const { status, deviceName, error, connect, disconnect, printOrder } = usePrinter();
  const {
    orders,
    loading,
    advanceOrder,
    deliverWithFinalTotal,
    updateOrderType,
    adjustItemQuantity,
    cancelItem,
    updateItemModifiers,
  } = useKitchenOrders();
  const { products } = useProducts();
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  // Item cuyo modal de opciones (modifiers) está abierto para editar.
  const [editingItem, setEditingItem] = useState<{ item: KitchenOrderItem; orderId: string; orderType: KitchenOrder['order_type'] } | null>(null);
  // Pedido de precio variable (kilo o monto) pendiente de capturar el total real.
  const [finalTotalOrder, setFinalTotalOrder] = useState<{ order: KitchenOrder; kind: FinalTotalKind } | null>(null);

  const editingProduct = editingItem
    ? products.find((p) => p.id === editingItem.item.product_id) ?? null
    : null;

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleAdjustItemQty = async (orderId: string, item: KitchenOrderItem, newQty: number) => {
    setBusyItemId(item.id);
    try {
      await adjustItemQuantity(item.id, orderId, newQty);
      if (newQty <= 0) toast.success('Item quitado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar item');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleRemoveItem = async (orderId: string, item: KitchenOrderItem) => {
    setBusyItemId(item.id);
    try {
      await cancelItem(item.id, orderId);
      toast.success('Item quitado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al quitar item');
    } finally {
      setBusyItemId(null);
    }
  };

  /** Las bebidas no llevan extras, así que no hay opciones que editar. */
  const canEditItemModifiers = useCallback(
    (item: KitchenOrderItem) => {
      const product = products.find((p) => p.id === item.product_id);
      return !product || applicableModifierGroups(product).length > 0;
    },
    [products],
  );

  const handleEditItem = (orderId: string, item: KitchenOrderItem) => {
    const order = orders.find((o) => o.id === orderId);
    if (!products.find((p) => p.id === item.product_id)) {
      toast.error('No se pudo cargar el producto para editar');
      return;
    }
    setEditingItem({ item, orderId, orderType: order?.order_type ?? 'dine_in' });
  };

  const handleConfirmModifierEdit = async (mods: CartItemModifier[]) => {
    if (!editingItem || !editingProduct) return;
    setBusyItemId(editingItem.item.id);
    try {
      await updateItemModifiers(
        editingItem.item.id,
        editingItem.orderId,
        editingProduct.price,
        mods.map((m) => ({ modifierId: m.modifierId, name: m.name, priceOverride: m.priceOverride, group: m.group })),
      );
      toast.success('Item actualizado');
      setEditingItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar item');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleAdvance = async (order: KitchenOrder) => {
    // Al ENTREGAR un pedido de precio variable (por kilo o por monto), primero
    // se captura cuánto fue realmente: el peso o el monto final servido.
    const kind = getOrderPhase(order) === 'ready' ? orderFinalTotalKind(order) : null;
    if (kind) {
      setFinalTotalOrder({ order, kind });
      return;
    }
    setBusyOrderId(order.id);
    try {
      await advanceOrder(order);
    } catch {
      toast.error('Error al actualizar la orden');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleFinalTotalConfirm = async (finalTotal: number) => {
    if (!finalTotalOrder) return;
    const { order } = finalTotalOrder;
    setBusyOrderId(order.id);
    try {
      await deliverWithFinalTotal(order, finalTotal);
      toast.success(`Pedido entregado — $${finalTotal.toFixed(2)}`);
      setFinalTotalOrder(null);
    } catch {
      toast.error('No se pudo guardar el precio. Revisa permisos (cajero/admin).');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleChangeOrderType = async (orderId: string, orderType: KitchenOrder['order_type']) => {
    setBusyOrderId(orderId);
    try {
      await updateOrderType(orderId, orderType);
      toast.success(`Pedido cambiado a ${ORDER_TYPE_LABEL[orderType]}`);
    } catch {
      toast.error('No se pudo cambiar el tipo de pedido');
    } finally {
      setBusyOrderId(null);
    }
  };

  /** Reimpresión manual de una comanda. */
  const reprint = useCallback(
    (order: KitchenOrder) => {
      if (status !== 'connected') {
        toast.error('Conecta la impresora primero');
        return;
      }
      printOrder(toComanda(order))
        .then(() => toast.success('Comanda reimpresa'))
        .catch((e) => toast.error(`No se pudo imprimir: ${e.message}`));
    },
    [status, printOrder],
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
                  onAdjustItemQty={handleAdjustItemQty}
                  onRemoveItem={handleRemoveItem}
                  onEditItem={handleEditItem}
                  canEditItemModifiers={canEditItemModifiers}
                  onChangeOrderType={handleChangeOrderType}
                  busyItemId={busyItemId}
                  busy={busyOrderId === order.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <FinalTotalModal
        open={!!finalTotalOrder}
        kind={finalTotalOrder?.kind ?? 'kilo'}
        currentTotal={finalTotalOrder ? orderCurrentTotal(finalTotalOrder.order) : 0}
        otherItemsTotal={finalTotalOrder ? orderFixedSubtotal(finalTotalOrder.order) : 0}
        orderLabel={
          finalTotalOrder?.order.daily_order_number != null
            ? `Pedido #${finalTotalOrder.order.daily_order_number}`
            : (finalTotalOrder?.order.customer_name ?? 'Pedido')
        }
        busy={!!finalTotalOrder && busyOrderId === finalTotalOrder.order.id}
        onConfirm={handleFinalTotalConfirm}
        onCancel={() => setFinalTotalOrder(null)}
      />

      {editingItem && editingProduct && (
        <ModifierModal
          product={editingProduct}
          orderType={editingItem.orderType}
          initialModifierIds={editingItem.item.modifiers.map((m) => m.modifierId)}
          submitLabel="Guardar"
          onConfirm={handleConfirmModifierEdit}
          onClose={() => setEditingItem(null)}
        />
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
  status: PrinterStatus;
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

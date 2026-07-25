import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Flame, CheckCircle, Truck, UtensilsCrossed, ShoppingBag, Bike, MessageSquare, Plus, Clock, Printer, Pencil, Check } from 'lucide-react';
import { KitchenItemRow } from './KitchenItemRow';
import { getOrderPhase } from '@/hooks/useKitchenOrders';
import { orderNoteText } from '@/lib/orderNotes';
import type { KitchenOrder, KitchenOrderItem, OrderPhase } from '@/hooks/useKitchenOrders';

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function timeLabel(dateStr: string): string {
  const mins = minutesAgo(dateStr);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

type AgeBucket = 'fresh' | 'warming' | 'urgent';

function ageBucket(mins: number): AgeBucket {
  if (mins < 5) return 'fresh';
  if (mins < 10) return 'warming';
  return 'urgent';
}

const AGE_STYLES: Record<AgeBucket, { border: string; accent: string; pill: string }> = {
  fresh:    { border: 'border-emerald-500/40', accent: 'text-emerald-500', pill: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  warming:  { border: 'border-amber-500/40',   accent: 'text-amber-500',   pill: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  urgent:   { border: 'border-red-500/60',     accent: 'text-red-500',     pill: 'bg-red-500/20 text-red-600 dark:text-red-400' },
};

const phaseAction: Record<Exclude<OrderPhase, 'done'>, {
  label: string;
  icon: typeof Flame;
  variant: 'primary' | 'success' | 'info';
}> = {
  pending:   { label: 'Preparar',       icon: Flame,       variant: 'primary' },
  preparing: { label: 'Marcar listo',   icon: CheckCircle, variant: 'success' },
  ready:     { label: 'Entregar',       icon: Truck,       variant: 'info' },
};

const actionStyles = {
  primary: 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] hover:bg-[color:var(--color-accent-hover)]',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  info:    'bg-sky-600 text-white hover:bg-sky-700',
};

const ORDER_TYPE_META: Record<KitchenOrder['order_type'], { label: string; icon: typeof Flame; className: string }> = {
  dine_in:  { label: 'Aquí',     icon: UtensilsCrossed, className: 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]' },
  takeout:  { label: 'Llevar',   icon: ShoppingBag,     className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  delivery: { label: 'Domicilio', icon: Bike,           className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400' },
};

interface PickupInfo {
  label: string;
  urgent: boolean;
}

/** Devuelve la hora "HH:MM" + minutos restantes, o null si no aplica. */
function formatPickup(iso: string | null): PickupInfo | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const hh = target.getHours().toString().padStart(2, '0');
  const mm = target.getMinutes().toString().padStart(2, '0');
  const minsLeft = Math.round((target.getTime() - Date.now()) / 60000);
  let suffix = '';
  if (minsLeft < -2) suffix = ` · vencido ${Math.abs(minsLeft)}m`;
  else if (minsLeft <= 2) suffix = ' · ahora';
  else if (minsLeft <= 60) suffix = ` · en ${minsLeft}m`;
  return { label: `${hh}:${mm}${suffix}`, urgent: minsLeft <= 15 };
}

interface KitchenOrderCardProps {
  order: KitchenOrder;
  orderNumber: number;
  onAdvance: (order: KitchenOrder) => void;
  /** Si se provee, muestra un botón para reimprimir la comanda. */
  onReprint?: (order: KitchenOrder) => void;
  /** Si se proveen, habilita editar items (cantidad / quitar / opciones) en la tarjeta. */
  onAdjustItemQty?: (orderId: string, item: KitchenOrderItem, newQty: number) => void;
  onRemoveItem?: (orderId: string, item: KitchenOrderItem) => void;
  onEditItem?: (orderId: string, item: KitchenOrderItem) => void;
  /** False para items sin opciones que editar (bebidas): oculta "Editar". */
  canEditItemModifiers?: (item: KitchenOrderItem) => boolean;
  /** id del order_item que está siendo modificado (para deshabilitar controles). */
  busyItemId?: string | null;
  busy?: boolean;
}

export function KitchenOrderCard({
  order,
  orderNumber,
  onAdvance,
  onReprint,
  onAdjustItemQty,
  onRemoveItem,
  onEditItem,
  canEditItemModifiers,
  busyItemId,
  busy,
}: KitchenOrderCardProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const canEdit = !!(onAdjustItemQty && onRemoveItem && onEditItem);
  const activeItems = order.order_items.filter((i) => i.status !== 'cancelled');
  const phase = getOrderPhase(order);
  const action = phase !== 'done' ? phaseAction[phase] : null;
  // Muestra número de pedido Y nombre del cliente cuando ambos existen, para
  // que en pedidos numerados (Carnitas) o para llevar se sepa de quién es.
  const customerName = order.customer_name?.trim() || null;
  const numberLabel = order.daily_order_number != null ? `Pedido #${order.daily_order_number}` : null;
  const displayName = [numberLabel, customerName].filter(Boolean).join(' · ') || null;
  const typeMeta = ORDER_TYPE_META[order.order_type];
  const orderNote = orderNoteText(order.notes);
  const pickupInfo = formatPickup(order.pickup_at);

  const handleAddItems = () => {
    navigate('/pos', {
      state: {
        appendOrderId: order.id,
        appendOrderLabel: displayName ?? `Pedido ${orderNumber}`,
        appendOrderType: order.order_type,
        appendOrderLineId: order.business_line_id,
      },
    });
  };

  // tick every 30s so age bucket updates without needing external state
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const mins = minutesAgo(order.created_at);
  const age = ageBucket(mins);
  const style = AGE_STYLES[age];

  return (
    <motion.div
      animate={age === 'urgent' ? { scale: [1, 1.01, 1] } : { scale: 1 }}
      transition={age === 'urgent' ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      className={`flex flex-col rounded-2xl border-2 bg-[color:var(--color-bg-elevated)] shadow-sm ${style.border}`}
    >
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${style.pill}`}>
              #{orderNumber}
            </span>
            {displayName && (
              <span className="font-display text-base font-semibold text-[color:var(--color-fg)] line-clamp-1">
                {displayName}
              </span>
            )}
          </div>
          <span className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${style.accent}`}>
            {timeLabel(order.created_at)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeMeta.className}`}>
            <typeMeta.icon size={11} />
            {typeMeta.label}
          </span>
          {pickupInfo && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              pickupInfo.urgent
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
            }`}>
              <Clock size={11} />
              {pickupInfo.label}
            </span>
          )}
          {orderNote && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-accent)]">
              <MessageSquare size={11} />
              {orderNote}
            </span>
          )}
        </div>
        {order.cashier_name && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[color:var(--color-fg-muted)]">
            <span>
              Tomó:{' '}
              <span className="font-semibold text-[color:var(--color-fg)]">{order.cashier_name}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4" style={{ maxHeight: '420px' }}>
        <div className="divide-y divide-[color:var(--color-border)]">
          {activeItems.map((item) => (
            <KitchenItemRow
              key={item.id}
              item={item}
              orderType={order.order_type}
              editing={editing && canEdit}
              canEditModifiers={canEditItemModifiers ? canEditItemModifiers(item) : true}
              busy={busyItemId === item.id}
              onIncrement={() => onAdjustItemQty?.(order.id, item, item.quantity + 1)}
              onDecrement={() => onAdjustItemQty?.(order.id, item, item.quantity - 1)}
              onDelete={() => onRemoveItem?.(order.id, item)}
              onEdit={() => onEditItem?.(order.id, item)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 px-4 pt-3 pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAddItems}
          disabled={busy}
          title="Agregar items a este pedido"
          className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-3 text-sm font-semibold text-[color:var(--color-fg-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
        >
          <Plus size={18} />
        </motion.button>
        {canEdit && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setEditing((e) => !e)}
            disabled={busy}
            title={editing ? 'Terminar edición' : 'Editar pedido'}
            className={`flex shrink-0 cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
              ${editing
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
                : 'border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]'
              }`}
          >
            {editing ? <Check size={18} /> : <Pencil size={18} />}
          </motion.button>
        )}
        {onReprint && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onReprint(order)}
            disabled={busy}
            title="Reimprimir comanda"
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-3 text-sm font-semibold text-[color:var(--color-fg-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
          >
            <Printer size={18} />
          </motion.button>
        )}
        {action && !editing && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onAdvance(order)}
            disabled={busy}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3
              text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
              ${actionStyles[action.variant]}`}
          >
            <action.icon size={18} />
            {action.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

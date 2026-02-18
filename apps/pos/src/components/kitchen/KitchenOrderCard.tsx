import { Flame, CheckCircle, Truck } from 'lucide-react';
import { KitchenItemRow } from './KitchenItemRow';
import { getOrderPhase } from '@/hooks/useKitchenOrders';
import type { KitchenOrder, OrderPhase } from '@/hooks/useKitchenOrders';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs}h ${mins % 60}m`;
}

const phaseAction: Record<Exclude<OrderPhase, 'done'>, {
  label: string;
  icon: typeof Flame;
  bg: string;
  border: string;
}> = {
  pending: {
    label: 'Preparar',
    icon: Flame,
    bg: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    border: 'border-amber-500/40',
  },
  preparing: {
    label: 'Marcar Listo',
    icon: CheckCircle,
    bg: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    border: 'border-green-500/40',
  },
  ready: {
    label: 'Entregar',
    icon: Truck,
    bg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    border: 'border-blue-500/40',
  },
};

const phaseBorder: Record<OrderPhase, string> = {
  pending: 'border-amber-500/30',
  preparing: 'border-blue-500/30',
  ready: 'border-green-500/30',
  done: 'border-gray-700',
};

interface KitchenOrderCardProps {
  order: KitchenOrder;
  onAdvance: (order: KitchenOrder) => void;
  busy?: boolean;
}

export function KitchenOrderCard({ order, onAdvance, busy }: KitchenOrderCardProps) {
  const shortId = order.id.slice(0, 6).toUpperCase();
  const activeItems = order.order_items.filter((i) => i.status !== 'cancelled');
  const phase = getOrderPhase(order);
  const action = phase !== 'done' ? phaseAction[phase] : null;

  return (
    <div className={`flex flex-col rounded-xl border bg-gray-800 ${phaseBorder[phase]}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-sm font-bold text-amber-400">
            #{shortId}
          </span>
          {order.notes && (
            <span className="text-sm text-gray-400">{order.notes}</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{timeAgo(order.created_at)}</span>
      </div>

      {/* Items */}
      <div className="flex-1 px-4 pb-2">
        <div className="divide-y divide-gray-700/50">
          {activeItems.map((item) => (
            <KitchenItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Action button */}
      {action && (
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={() => onAdvance(order)}
            disabled={busy}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3
              text-sm font-semibold text-white transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
              disabled:cursor-not-allowed disabled:opacity-50
              ${action.bg}`}
          >
            <action.icon size={18} />
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}

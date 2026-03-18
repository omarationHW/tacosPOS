import type { KitchenOrderItem } from '@/hooks/useKitchenOrders';

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  preparing: { label: 'Preparando', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  ready: { label: 'Listo', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  delivered: { label: 'Entregado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
};

interface KitchenItemRowProps {
  item: KitchenOrderItem;
}

export function KitchenItemRow({ item }: KitchenItemRowProps) {
  const config = statusConfig[item.status];

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-200">
          <span className="font-semibold text-gray-100">{item.quantity}×</span>{' '}
          {item.product?.name ?? 'Producto'}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}
        >
          {config.label}
        </span>
      </div>
      {item.notes && (
        <p className="mt-0.5 text-xs font-medium text-amber-300/80">
          → {item.notes}
        </p>
      )}
    </div>
  );
}

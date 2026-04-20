import type { KitchenOrderItem } from '@/hooks/useKitchenOrders';

const statusConfig = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  preparing: { label: 'Preparando', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  ready:     { label: 'Listo',      className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  delivered: { label: 'Entregado',  className: 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]' },
  cancelled: { label: 'Cancelado',  className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
};

interface KitchenItemRowProps {
  item: KitchenOrderItem;
}

export function KitchenItemRow({ item }: KitchenItemRowProps) {
  const config = statusConfig[item.status];
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[color:var(--color-fg)]">
          <span className="font-mono font-bold tabular-nums text-[color:var(--color-fg)]">
            {item.quantity}×
          </span>{' '}
          {item.product?.name ?? 'Producto'}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
          {config.label}
        </span>
      </div>
      {item.notes && (
        <p className="mt-1 text-xs font-medium italic text-[color:var(--color-accent)]">
          → {item.notes}
        </p>
      )}
    </div>
  );
}

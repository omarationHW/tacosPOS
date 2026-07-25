import { Minus, Plus, Trash2, Pencil } from 'lucide-react';
import type { KitchenOrderItem, KitchenOrder } from '@/hooks/useKitchenOrders';

const statusConfig = {
  pending:   { label: 'Pendiente',  className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  preparing: { label: 'Preparando', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  ready:     { label: 'Listo',      className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  delivered: { label: 'Entregado',  className: 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]' },
  cancelled: { label: 'Cancelado',  className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
};

/**
 * Modifier groups que en dine-in son "lo standard de la casa" y no se
 * imprimen en cocina. Sin grasa / Sin dorar / Tipo de carne sí siguen.
 */
const HIDDEN_GROUPS_DINE_IN = new Set(['verdura', 'acompañamientos']);

interface KitchenItemRowProps {
  item: KitchenOrderItem;
  orderType: KitchenOrder['order_type'];
  /** En modo edición se muestran controles de cantidad / quitar / opciones. */
  editing?: boolean;
  /** false en bebidas: no llevan extras, no hay opciones que editar. */
  canEditModifiers?: boolean;
  busy?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function KitchenItemRow({
  item,
  orderType,
  editing = false,
  canEditModifiers = true,
  busy = false,
  onIncrement,
  onDecrement,
  onDelete,
  onEdit,
}: KitchenItemRowProps) {
  const config = statusConfig[item.status];
  const allMods = item.modifiers ?? [];
  const mods = orderType === 'dine_in'
    ? allMods.filter((m) => !HIDDEN_GROUPS_DINE_IN.has((m.group_name ?? '').trim().toLowerCase()))
    : allMods;
  return (
    <div className="py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-mono font-bold tabular-nums text-[color:var(--color-fg)]">
            {item.quantity}×
          </span>{' '}
          <span className="text-sm font-semibold text-[color:var(--color-fg)]">
            {item.product?.name ?? 'Producto'}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
          {config.label}
        </span>
      </div>
      {mods.length > 0 && (
        <ul className="mt-1 ml-5 flex flex-col gap-0.5">
          {mods.map((m) => (
            <li
              key={m.id}
              className="text-xs font-medium text-[color:var(--color-fg-muted)]"
            >
              · {m.modifier_name}
            </li>
          ))}
        </ul>
      )}
      {item.notes && (
        <p className="mt-1 ml-5 text-xs font-semibold italic text-[color:var(--color-accent)]">
          → {item.notes}
        </p>
      )}

      {editing && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDecrement}
              disabled={busy}
              aria-label="Reducir cantidad"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg)] transition-colors hover:bg-[color:var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
            >
              <Minus size={14} />
            </button>
            <span className="w-7 text-center font-mono text-sm font-semibold tabular-nums text-[color:var(--color-fg)]">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={onIncrement}
              disabled={busy}
              aria-label="Aumentar cantidad"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg)] transition-colors hover:bg-[color:var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {canEditModifiers && (
              <button
                type="button"
                onClick={onEdit}
                disabled={busy}
                aria-label="Editar opciones"
                className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
              >
                <Pencil size={12} />
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              aria-label="Quitar item"
              className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-[color:var(--color-fg-muted)] transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
            >
              <Trash2 size={12} />
              Quitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

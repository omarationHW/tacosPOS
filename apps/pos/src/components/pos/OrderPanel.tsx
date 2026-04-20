import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { Minus, Plus, ShoppingCart, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CartItemModifier {
  modifierId: string;
  name: string;
  priceOverride: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: CartItemModifier[];
  notes?: string;
  /** Unique key for cart deduplication (productId + sorted modifier ids) */
  cartKey: string;
}

export type OrderType = 'dine_in' | 'takeout' | 'delivery';

interface OrderPanelProps {
  items: CartItem[];
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  onIncrement: (cartKey: string) => void;
  onDecrement: (cartKey: string) => void;
  onUpdateNotes: (cartKey: string, notes: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

function getItemTotal(item: CartItem): number {
  const modTotal = item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
  return (item.price + modTotal) * item.quantity;
}

const ORDER_TYPES: Array<{ key: OrderType; label: string }> = [
  { key: 'dine_in', label: 'Aquí' },
  { key: 'takeout', label: 'Llevar' },
  { key: 'delivery', label: 'Domicilio' },
];

function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onUpdateNotes,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdateNotes: (notes: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(!!item.notes);
  const itemTotal = getItemTotal(item);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
      className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-3"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-[color:var(--color-fg)]">{item.name}</span>
        <span className="shrink-0 font-mono text-sm tabular-nums text-[color:var(--color-fg-muted)]">
          ${item.price.toFixed(2)}
        </span>
      </div>
      {item.modifiers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {item.modifiers.map((mod, i) => (
            <span
              key={i}
              className="rounded-full bg-[color:var(--color-bg-inset)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-fg-muted)]"
            >
              {mod.name}
              {mod.priceOverride > 0 && ` +$${mod.priceOverride.toFixed(2)}`}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QtyButton onPress={onDecrement} label={`Reducir ${item.name}`}>
            <Minus size={16} />
          </QtyButton>
          <span className="w-6 text-center font-mono text-sm font-semibold tabular-nums text-[color:var(--color-fg)]">
            {item.quantity}
          </span>
          <QtyButton onPress={onIncrement} label={`Agregar ${item.name}`}>
            <Plus size={16} />
          </QtyButton>
          <button
            onClick={() => setShowNotes(!showNotes)}
            title="Agregar nota"
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)] ${
                item.notes
                  ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]'
                  : 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-subtle)] hover:text-[color:var(--color-fg)]'
              }`}
          >
            <MessageSquare size={14} />
          </button>
        </div>
        <span className="font-mono text-base font-semibold tabular-nums text-[color:var(--color-fg)]">
          ${itemTotal.toFixed(2)}
        </span>
      </div>
      <AnimatePresence>
        {showNotes && (
          <motion.input
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            type="text"
            value={item.notes ?? ''}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Ej: Sin cebolla, término medio..."
            className="w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-xs
              text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]
              focus:border-[color:var(--color-accent)] focus:outline-none"
            autoFocus
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QtyButton({
  children,
  onPress,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onPress}
      aria-label={label}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg)] transition-colors hover:bg-[color:var(--color-border)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
    >
      {children}
    </motion.button>
  );
}

export function OrderPanel({
  items,
  orderType,
  onOrderTypeChange,
  customerName,
  onCustomerNameChange,
  onIncrement,
  onDecrement,
  onUpdateNotes,
  onClear,
  onSubmit,
  loading = false,
}: OrderPanelProps) {
  const total = items.reduce((sum, item) => sum + getItemTotal(item), 0);

  return (
    <div className="flex h-full flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
      <div className="border-b border-[color:var(--color-border)] p-3 lg:p-4">
        <h2 className="mb-3 font-display text-xl font-semibold text-[color:var(--color-fg)]">
          Pedido actual
        </h2>

        {/* Order type toggle */}
        <div
          role="radiogroup"
          aria-label="Tipo de pedido"
          className="relative mb-3 flex rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-inset)] p-1"
        >
          {ORDER_TYPES.map(({ key, label }) => {
            const active = orderType === key;
            return (
              <button
                key={key}
                role="radio"
                aria-checked={active}
                onClick={() => onOrderTypeChange(key)}
                className={`relative z-10 flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors lg:text-sm
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
                  ${active
                    ? 'text-[color:var(--color-accent-fg)]'
                    : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
                  }`}
              >
                {active && (
                  <motion.span
                    layoutId="order-type-pill"
                    className="absolute inset-0 -z-10 rounded-lg bg-[color:var(--color-accent)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="customer-name" className="shrink-0 text-xs font-medium uppercase tracking-wide text-[color:var(--color-fg-subtle)]">
            Cliente
          </label>
          <input
            id="customer-name"
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Nombre..."
            className="flex-1 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-3 py-1.5 text-sm
              text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]
              focus:border-[color:var(--color-accent)] focus:outline-none
              focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 lg:p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-[color:var(--color-fg-subtle)]">
            <ShoppingCart size={40} strokeWidth={1.5} />
            <p className="text-sm">Agrega productos al pedido</p>
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <CartItemRow
                  key={item.cartKey}
                  item={item}
                  onIncrement={() => onIncrement(item.cartKey)}
                  onDecrement={() => onDecrement(item.cartKey)}
                  onUpdateNotes={(notes) => onUpdateNotes(item.cartKey, notes)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <div className="border-t border-[color:var(--color-border)] p-3 lg:p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-[color:var(--color-fg)]">Total</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-[color:var(--color-fg)]">
            $<NumberFlow value={total} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onClear}
            disabled={items.length === 0 || loading}
            className="flex-1 gap-1.5"
          >
            <Trash2 size={16} />
            Limpiar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSubmit}
            disabled={items.length === 0}
            loading={loading}
            className="flex-[2]"
          >
            Enviar a Cocina
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
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

export type OrderType = 'dine_in' | 'takeout';

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
    <div className="rounded-lg bg-gray-800 p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-100">{item.name}</span>
        <span className="shrink-0 text-sm text-gray-400">
          ${item.price.toFixed(2)}
        </span>
      </div>
      {/* Modifiers */}
      {item.modifiers.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {item.modifiers.map((mod, i) => (
            <span key={i} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
              {mod.name}
              {mod.priceOverride > 0 && ` +$${mod.priceOverride.toFixed(2)}`}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onDecrement}
            aria-label={`Reducir ${item.name}`}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-gray-700
              text-gray-300 transition-colors hover:bg-gray-600
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Minus size={16} />
          </button>
          <span className="w-6 text-center text-sm font-medium text-gray-100">
            {item.quantity}
          </span>
          <button
            onClick={onIncrement}
            aria-label={`Agregar ${item.name}`}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-gray-700
              text-gray-300 transition-colors hover:bg-gray-600
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Plus size={16} />
          </button>
          {/* Toggle notes */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            title="Agregar nota"
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                item.notes
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300'
              }`}
          >
            <MessageSquare size={14} />
          </button>
        </div>
        <span className="text-sm font-semibold text-amber-400">
          ${itemTotal.toFixed(2)}
        </span>
      </div>
      {/* Notes input */}
      {showNotes && (
        <input
          type="text"
          value={item.notes ?? ''}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder="Ej: Sin cebolla, termino medio..."
          className="mt-2 w-full rounded-md border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-xs
            text-gray-200 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
          autoFocus
        />
      )}
    </div>
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
    <div className="flex h-full flex-col border-l border-gray-700 bg-gray-850">
      {/* Header */}
      <div className="border-b border-gray-700 p-3 lg:p-4">
        <h2 className="mb-3 text-base font-bold text-gray-100 lg:text-lg">Pedido Actual</h2>

        {/* Order type toggle */}
        <div className="mb-3 flex rounded-lg bg-gray-800 p-0.5">
          <button
            onClick={() => onOrderTypeChange('dine_in')}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
              ${orderType === 'dine_in'
                ? 'bg-amber-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            Comer Aqui
          </button>
          <button
            onClick={() => onOrderTypeChange('takeout')}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
              ${orderType === 'takeout'
                ? 'bg-amber-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            Para Llevar
          </button>
        </div>

        {/* Customer name input */}
        <div className="flex items-center gap-2">
          <label htmlFor="customer-name" className="shrink-0 text-sm text-gray-400">Cliente</label>
          <input
            id="customer-name"
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Nombre del cliente..."
            className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm
              text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900"
          />
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
            <ShoppingCart size={40} strokeWidth={1.5} />
            <p className="text-sm">Agrega productos al pedido</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <CartItemRow
                key={item.cartKey}
                item={item}
                onIncrement={() => onIncrement(item.cartKey)}
                onDecrement={() => onDecrement(item.cartKey)}
                onUpdateNotes={(notes) => onUpdateNotes(item.cartKey, notes)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700 p-3 lg:p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-100">Total</span>
          <span className="text-xl font-bold text-amber-400">${total.toFixed(2)}</span>
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

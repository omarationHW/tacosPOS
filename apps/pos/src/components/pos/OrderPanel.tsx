import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderPanelProps {
  items: CartItem[];
  mesa: string;
  onMesaChange: (mesa: string) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function OrderPanel({
  items,
  mesa,
  onMesaChange,
  onIncrement,
  onDecrement,
  onClear,
  onSubmit,
  loading = false,
}: OrderPanelProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="flex h-full flex-col border-l border-gray-700 bg-gray-850">
      {/* Header */}
      <div className="border-b border-gray-700 p-3 lg:p-4">
        <h2 className="mb-3 text-base font-bold text-gray-100 lg:text-lg">Pedido Actual</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="mesa" className="text-sm text-gray-400">Mesa</label>
          <input
            id="mesa"
            type="text"
            value={mesa}
            onChange={(e) => onMesaChange(e.target.value)}
            placeholder="#"
            className="w-20 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-center text-sm
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
              <div key={item.productId} className="rounded-lg bg-gray-800 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-gray-100">{item.name}</span>
                  <span className="shrink-0 text-sm text-gray-400">
                    ${item.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecrement(item.productId)}
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
                      onClick={() => onIncrement(item.productId)}
                      aria-label={`Agregar ${item.name}`}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-gray-700
                        text-gray-300 transition-colors hover:bg-gray-600
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-amber-400">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
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
            Cobrar y Comanda
          </Button>
        </div>
      </div>
    </div>
  );
}

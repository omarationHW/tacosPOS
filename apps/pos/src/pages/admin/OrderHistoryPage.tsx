import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLineFilter } from '@/components/BusinessLineToggle';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';

interface OrderHistoryItem {
  id: string;
  customer_name: string | null;
  status: string;
  order_type: string;
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  tip: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  items: {
    quantity: number;
    unit_price: number;
    subtotal: number;
    product_name: string;
  }[];
}

const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }> = {
  open: { label: 'Abierta', variant: 'info' },
  in_progress: { label: 'En proceso', variant: 'warning' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
};

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

export function OrderHistoryPage() {
  const resolvedLineId = useLineFilter();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  const fetchOrders = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);

    setLoading(true);

    let query = supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        status,
        order_type,
        subtotal,
        tax,
        total,
        discount,
        tip,
        payment_method,
        notes,
        created_at,
        business_line_id,
        order_items (
          quantity,
          unit_price,
          subtotal,
          product:products ( name )
        )
      `)
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (resolvedLineId) {
      query = query.eq('business_line_id', resolvedLineId);
    }

    if (search.trim()) {
      query = query.ilike('customer_name', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      setLoading(false);
      return;
    }

    const normalized: OrderHistoryItem[] = ((data ?? []) as any[]).map((order) => ({
      id: order.id,
      customer_name: order.customer_name,
      status: order.status,
      order_type: order.order_type,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      discount: order.discount ?? 0,
      tip: order.tip ?? 0,
      payment_method: order.payment_method,
      notes: order.notes,
      created_at: order.created_at,
      items: (order.order_items ?? []).map((item: any) => {
        const product = Array.isArray(item.product) ? item.product[0] : item.product;
        return {
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          product_name: product?.name ?? 'Producto',
        };
      }),
    }));

    setHasMore(normalized.length === PAGE_SIZE);

    if (reset) {
      setOrders(normalized);
    } else {
      setOrders((prev) => [...prev, ...normalized]);
    }
    setLoading(false);
  }, [resolvedLineId, search, page]);

  useEffect(() => {
    fetchOrders(true);
  }, [resolvedLineId, search]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
  };

  useEffect(() => {
    if (page > 0) fetchOrders(false);
  }, [page]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ClipboardList className="text-[color:var(--color-accent)]" size={28} />
        <h1 className="text-2xl font-bold text-[color:var(--color-fg)]">Historial de Pedidos</h1>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-[color:var(--color-fg-subtle)]" />
          <input
            type="text"
            placeholder="Buscar por nombre de cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] py-2.5 pr-3 pl-10 text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Orders list */}
      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-12 text-center">
          <ClipboardList className="mx-auto mb-3 text-[color:var(--color-fg-subtle)]" size={48} strokeWidth={1.5} />
          <p className="text-[color:var(--color-fg-muted)]">No se encontraron pedidos</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusInfo = statusLabels[order.status] ?? { label: order.status, variant: 'info' as const };
            const shortId = order.id.slice(0, 8).toUpperCase();
            const dateStr = new Date(order.created_at).toLocaleString('es-MX', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={order.id} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] overflow-hidden">
                {/* Header - clickable */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-[color:var(--color-bg-inset)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-[color:var(--color-fg-subtle)]">#{shortId}</span>
                      <span className="font-medium text-[color:var(--color-fg)]">
                        {order.customer_name || 'Sin nombre'}
                      </span>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      {order.order_type === 'takeout' && (
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                          Para Llevar
                        </span>
                      )}
                      {order.order_type === 'delivery' && (
                        <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                          A Domicilio
                        </span>
                      )}
                      {order.payment_method && (
                        <span className="rounded bg-[color:var(--color-bg-inset)] px-1.5 py-0.5 text-xs text-[color:var(--color-fg-muted)]">
                          {paymentLabels[order.payment_method] ?? order.payment_method}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--color-fg-subtle)]">
                      {dateStr} · {order.items.length} producto{order.items.length !== 1 && 's'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-[color:var(--color-accent)]">${order.total.toFixed(2)}</div>
                  </div>
                  <div className="shrink-0 text-[color:var(--color-fg-subtle)]">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-[color:var(--color-fg-muted)]">
                            {item.quantity}x {item.product_name}
                            <span className="ml-2 text-xs text-[color:var(--color-fg-subtle)]">@ ${item.unit_price.toFixed(2)}</span>
                          </span>
                          <span className="text-[color:var(--color-fg-muted)]">${item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 border-t border-[color:var(--color-border)] pt-3 text-sm">
                      <div className="flex justify-between text-[color:var(--color-fg-muted)]">
                        <span>Subtotal</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[color:var(--color-fg-muted)]">
                        <span>IVA</span>
                        <span>${order.tax.toFixed(2)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Descuento</span>
                          <span>-${order.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {order.tip > 0 && (
                        <div className="flex justify-between text-blue-400">
                          <span>Propina</span>
                          <span>+${order.tip.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="mt-1 flex justify-between font-bold text-[color:var(--color-fg)]">
                        <span>Total</span>
                        <span className="text-[color:var(--color-accent)]">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                    {order.notes && (
                      <p className="mt-2 text-xs text-[color:var(--color-fg-subtle)]">Notas: {order.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="mx-auto cursor-pointer rounded-lg bg-[color:var(--color-bg-elevated)] px-6 py-2.5 text-sm font-medium text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-bg-inset)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)] disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Cargar mas'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

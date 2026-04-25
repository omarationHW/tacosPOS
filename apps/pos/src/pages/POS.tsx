import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Rows3, Rows2, LayoutGrid as LayoutGridIcon, ArrowLeft, Plus } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useLineFilter } from '@/components/BusinessLineToggle';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { useDensity, type Density } from '@/contexts/DensityContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { OrderPanel, type CartItem, type OrderType, type CartItemModifier } from '@/components/pos/OrderPanel';
import { ModifierModal } from '@/components/pos/ModifierModal';
import { ProductSearchCommand } from '@/components/pos/ProductSearchCommand';
import type { ProductWithRelations } from '@/hooks/useProducts';

function makeCartKey(productId: string, modifiers: CartItemModifier[]): string {
  const modIds = modifiers.map((m) => m.modifierId).sort().join(',');
  return `${productId}|${modIds}`;
}

interface AppendState {
  appendOrderId: string;
  appendOrderLabel: string;
  appendOrderType: OrderType;
  appendOrderLineId: string;
}

export function POS() {
  const resolvedLineId = useLineFilter();
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { createOrder, appendItemsToOrder } = useOrders();
  const { user } = useAuth();
  const { density, setDensity } = useDensity();
  const { availableBusinessLines } = useBusinessLine();
  const location = useLocation();
  const navigate = useNavigate();

  const appendState = (location.state ?? null) as AppendState | null;
  const isAppendMode = !!appendState?.appendOrderId;

  // Append mode pins the line to the order being appended; otherwise use the user's selection.
  const effectiveLineId = isAppendMode ? appendState?.appendOrderLineId : resolvedLineId;

  // Carnitas uses sequential daily order numbers instead of customer names.
  const isCarnitasLine = useMemo(() => {
    if (!effectiveLineId) return false;
    return availableBusinessLines.find((bl) => bl.id === effectiveLineId)?.slug === 'carnitas';
  }, [effectiveLineId, availableBusinessLines]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>(appendState?.appendOrderType ?? 'dine_in');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cuando se entra en modo append, sincroniza orderType con la orden objetivo.
  useEffect(() => {
    if (appendState?.appendOrderType) setOrderType(appendState.appendOrderType);
  }, [appendState?.appendOrderType]);

  // Modifier modal state
  const [modifierProduct, setModifierProduct] = useState<ProductWithRelations | null>(null);

  const loading = productsLoading || categoriesLoading;

  // Filter by business line and active status. In append mode the line is
  // pinned to the order being appended, so the user can't accidentally add
  // a hamburguesa to a carnitas order.
  const filteredCategories = useMemo(() => {
    if (!effectiveLineId) return categories;
    return categories.filter((c) => c.business_line_id === effectiveLineId);
  }, [categories, effectiveLineId]);

  const filteredProducts = useMemo(() => {
    let active = products.filter((p) => p.is_active);
    if (effectiveLineId) {
      active = active.filter((p) => p.business_line_id === effectiveLineId);
    }
    if (selectedCategory) {
      active = active.filter((p) => p.category_id === selectedCategory);
    }
    return active;
  }, [products, selectedCategory, effectiveLineId]);

  const addToCart = (product: ProductWithRelations) => {
    const hasModifiers = product.modifier_groups && product.modifier_groups.length > 0;
    if (hasModifiers) {
      setModifierProduct(product);
      return;
    }
    addToCartWithModifiers(product, []);
  };

  const addToCartWithModifiers = (product: ProductWithRelations, modifiers: CartItemModifier[]) => {
    const cartKey = makeCartKey(product.id, modifiers);

    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          modifiers,
          cartKey,
        },
      ];
    });
  };

  const handleModifierConfirm = (modifiers: CartItemModifier[]) => {
    if (modifierProduct) {
      addToCartWithModifiers(modifierProduct, modifiers);
      setModifierProduct(null);
    }
  };

  const increment = (cartKey: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decrement = (cartKey: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const updateNotes = (cartKey: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartKey === cartKey ? { ...item, notes } : item,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cancelAppend = () => {
    navigate('/kitchen');
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('No se pudo identificar al usuario');
      return;
    }

    if (cart.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    // Modo "agregar items a un pedido existente" (desde la card de Cocina).
    if (isAppendMode && appendState) {
      setSubmitting(true);
      try {
        const total = cart.reduce((sum, item) => {
          const modTotal = item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
          return sum + (item.price + modTotal) * item.quantity;
        }, 0);
        await appendItemsToOrder(appendState.appendOrderId, cart);
        toast.success(`Items agregados a ${appendState.appendOrderLabel} — +$${total.toFixed(2)}`);
        setCart([]);
        navigate('/kitchen');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al agregar items';
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Carnitas se autonumera; hamburguesas requiere nombre.
    if (!isCarnitasLine && !customerName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    // Derive business line from active selection or from first product in cart
    const orderLineId = resolvedLineId
      ?? products.find((p) => p.id === cart[0]?.productId)?.business_line_id;

    if (!orderLineId) {
      toast.error('No se pudo determinar la linea de negocio');
      return;
    }

    setSubmitting(true);
    try {
      const notes =
        orderType === 'takeout'
          ? 'Para Llevar'
          : orderType === 'delivery'
            ? 'A Domicilio'
            : undefined;

      const result = await createOrder({
        items: cart,
        createdBy: user.id,
        customerName: isCarnitasLine ? '' : customerName.trim(),
        businessLineId: orderLineId,
        orderType,
        notes,
      });

      const total = cart.reduce((sum, item) => {
        const modTotal = item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
        return sum + (item.price + modTotal) * item.quantity;
      }, 0);

      const orderLabel = result.dailyOrderNumber
        ? `Pedido #${result.dailyOrderNumber}`
        : customerName.trim();

      if (result.appended) {
        toast.success(
          `Items agregados a ${orderLabel} — +$${total.toFixed(2)}`,
        );
      } else {
        toast.success(
          `${orderLabel} registrado — Total: $${total.toFixed(2)}`,
        );
      }
      setCart([]);
      if (isCarnitasLine) setCustomerName('');
    } catch {
      toast.error('Error al registrar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100vh)] overflow-hidden lg:-m-6">
      {/* Left: Search + Categories + Products */}
      <div className="flex flex-1 flex-col overflow-hidden p-4 lg:p-6">
        {isAppendMode && appendState && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent-soft)] px-3 py-2">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-[color:var(--color-accent)]" />
              <span className="text-sm font-semibold text-[color:var(--color-fg)]">
                Agregando items a {appendState.appendOrderLabel}
              </span>
            </div>
            <button
              onClick={cancelAppend}
              className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]"
            >
              <ArrowLeft size={14} />
              Cancelar
            </button>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between gap-3">
          <ProductSearchCommand products={filteredProducts} onSelect={addToCart} />
          <DensityPicker density={density} onChange={setDensity} />
        </div>
        <div className="mb-4">
          <CategoryTabs
            categories={filteredCategories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
        </div>
      </div>

      {/* Right: Order Panel */}
      <div className="w-[300px] shrink-0 lg:w-[360px]">
        <OrderPanel
          items={cart}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          autoNumber={isCarnitasLine || isAppendMode}
          appendLabel={isAppendMode ? appendState?.appendOrderLabel : undefined}
          submitLabel={isAppendMode ? 'Agregar a cocina' : 'Enviar a Cocina'}
          orderTypeLocked={isAppendMode}
          onIncrement={increment}
          onDecrement={decrement}
          onUpdateNotes={updateNotes}
          onClear={clearCart}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>

      {modifierProduct && (
        <ModifierModal
          product={modifierProduct}
          orderType={orderType}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierProduct(null)}
        />
      )}
    </div>
  );
}

function DensityPicker({ density, onChange }: { density: Density; onChange: (d: Density) => void }) {
  const opts: Array<{ key: Density; label: string; icon: React.ReactNode }> = [
    { key: 'compact',     label: 'Compacto', icon: <Rows3 size={16} /> },
    { key: 'normal',      label: 'Normal',   icon: <LayoutGridIcon size={16} /> },
    { key: 'comfortable', label: 'Cómodo',   icon: <Rows2 size={16} /> },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Densidad"
      className="flex shrink-0 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-1"
    >
      {opts.map(({ key, label, icon }) => {
        const active = density === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => onChange(key)}
            className={`flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
              ${active
                ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
                : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
              }`}
          >
            {icon}
            <span className="hidden lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

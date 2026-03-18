import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useLineFilter } from '@/components/BusinessLineToggle';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { OrderPanel, type CartItem, type OrderType, type CartItemModifier } from '@/components/pos/OrderPanel';
import { ModifierModal } from '@/components/pos/ModifierModal';
import type { ProductWithRelations } from '@/hooks/useProducts';

function makeCartKey(productId: string, modifiers: CartItemModifier[]): string {
  const modIds = modifiers.map((m) => m.modifierId).sort().join(',');
  return `${productId}|${modIds}`;
}

export function POS() {
  const resolvedLineId = useLineFilter();
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { createOrder } = useOrders();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modifier modal state
  const [modifierProduct, setModifierProduct] = useState<ProductWithRelations | null>(null);

  const loading = productsLoading || categoriesLoading;

  // Filter by business line and active status
  const filteredCategories = useMemo(() => {
    if (!resolvedLineId) return categories;
    return categories.filter((c) => c.business_line_id === resolvedLineId);
  }, [categories, resolvedLineId]);

  const filteredProducts = useMemo(() => {
    let active = products.filter((p) => p.is_active);
    if (resolvedLineId) {
      active = active.filter((p) => p.business_line_id === resolvedLineId);
    }
    if (selectedCategory) {
      active = active.filter((p) => p.category_id === selectedCategory);
    }
    return active;
  }, [products, selectedCategory, resolvedLineId]);

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

  const handleSubmit = async () => {
    if (!user) {
      toast.error('No se pudo identificar al usuario');
      return;
    }

    if (!customerName.trim()) {
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
      const notes = orderType === 'takeout' ? 'Para Llevar' : undefined;

      const result = await createOrder({
        items: cart,
        createdBy: user.id,
        customerName: customerName.trim(),
        businessLineId: orderLineId,
        orderType,
        notes,
      });

      const total = cart.reduce((sum, item) => {
        const modTotal = item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
        return sum + (item.price + modTotal) * item.quantity;
      }, 0);

      if (result.appended) {
        toast.success(
          `Items agregados a ${customerName} — +$${total.toFixed(2)}`,
        );
      } else {
        toast.success(
          `Pedido registrado — ${customerName} — Total: $${total.toFixed(2)}`,
        );
      }
      setCart([]);
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
      {/* Left: Categories + Products */}
      <div className="flex flex-1 flex-col overflow-hidden p-4 lg:p-6">
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
      <div className="w-[280px] shrink-0 lg:w-[340px]">
        <OrderPanel
          items={cart}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          onIncrement={increment}
          onDecrement={decrement}
          onUpdateNotes={updateNotes}
          onClear={clearCart}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>

      {/* Modifier Modal */}
      {modifierProduct && (
        <ModifierModal
          product={modifierProduct}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierProduct(null)}
        />
      )}
    </div>
  );
}

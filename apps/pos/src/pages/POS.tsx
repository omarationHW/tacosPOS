import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryTabs } from '@/components/pos/CategoryTabs';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { OrderPanel, type CartItem } from '@/components/pos/OrderPanel';
import type { ProductWithRelations } from '@/hooks/useProducts';

export function POS() {
  const { products, loading: productsLoading } = useProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { createOrder } = useOrders();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mesa, setMesa] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loading = productsLoading || categoriesLoading;

  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.is_active);
    if (!selectedCategory) return active;
    return active.filter((p) => p.category_id === selectedCategory);
  }, [products, selectedCategory]);

  const addToCart = (product: ProductWithRelations) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
      ];
    });
  };

  const increment = (productId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decrement = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => {
    setCart([]);
    setMesa('');
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('No se pudo identificar al usuario');
      return;
    }

    setSubmitting(true);
    try {
      const notes = mesa.trim() ? `Mesa ${mesa.trim()}` : undefined;
      const result = await createOrder({ items: cart, createdBy: user.id, notes });
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (result.appended) {
        toast.success(
          `Items agregados a ${notes || 'orden existente'} — +$${total.toFixed(2)}`,
        );
      } else {
        toast.success(
          `Pedido registrado — ${notes || 'Sin mesa'} — Total: $${total.toFixed(2)}`,
        );
      }
      setCart([]);
      setMesa('');
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
            categories={categories}
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
          mesa={mesa}
          onMesaChange={setMesa}
          onIncrement={increment}
          onDecrement={decrement}
          onClear={clearCart}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      </div>
    </div>
  );
}

import { getCategoryEmoji } from '@/lib/categoryEmojis';
import type { ProductWithRelations } from '@/hooks/useProducts';

interface ProductGridProps {
  products: ProductWithRelations[];
  onAddToCart: (product: ProductWithRelations) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500">
        <p>No hay productos en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-3 xl:grid-cols-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800 p-3 lg:gap-2 lg:p-4
            text-center transition-colors hover:border-amber-500/60 hover:bg-gray-750
            motion-safe:active:scale-[0.97] motion-safe:transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-12 w-12 rounded-lg object-cover lg:h-16 lg:w-16"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg lg:h-16 lg:w-16"
              style={{ backgroundColor: (product.category?.color ?? '#6b7280') + '20' }}
            >
              <span className="text-2xl lg:text-3xl">
                {getCategoryEmoji(product.category?.name ?? '')}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-100 line-clamp-2">{product.name}</span>
          <span className="text-sm font-semibold text-amber-400">
            ${product.price.toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}

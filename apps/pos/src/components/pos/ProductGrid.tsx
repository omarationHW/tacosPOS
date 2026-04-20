import { motion } from 'motion/react';
import { useDensity } from '@/contexts/DensityContext';
import type { ProductWithRelations } from '@/hooks/useProducts';

interface ProductGridProps {
  products: ProductWithRelations[];
  onAddToCart: (product: ProductWithRelations) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const { config } = useDensity();

  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[color:var(--color-fg-subtle)]">
        <p>No hay productos en esta categoría</p>
      </div>
    );
  }

  return (
    <div className={`grid ${config.gridCols} ${config.cardGap}`}>
      {products.map((product) => {
        const hasModifiers = (product.modifier_groups?.length ?? 0) > 0;
        return (
          <motion.button
            key={product.id}
            onClick={() => onAddToCart(product)}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`group relative flex min-h-[110px] cursor-pointer flex-col justify-between rounded-2xl border-2 bg-[color:var(--color-bg-elevated)] text-left transition-colors
              border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]
              ${config.cardPadding}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]`}
          >
            {hasModifiers && (
              <span
                aria-label="Producto con opciones"
                title="Tiene opciones configurables"
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[11px] font-bold leading-none text-[color:var(--color-accent-fg)] shadow-sm"
              >
                +
              </span>
            )}

            <p
              className={`pr-5 font-display font-semibold leading-tight text-[color:var(--color-fg)] line-clamp-3 ${config.titleSize}`}
            >
              {product.name}
            </p>

            <p
              className={`mt-3 font-mono font-bold tabular-nums text-[color:var(--color-fg)] ${config.priceSize}`}
            >
              ${product.price.toFixed(2)}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
}

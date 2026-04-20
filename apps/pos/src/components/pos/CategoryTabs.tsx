import { motion } from 'motion/react';
import { LayoutGrid } from 'lucide-react';
import { LucideIcon } from '@/components/ui/LucideIcon';
import type { Database } from '@/lib/database.types';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

interface CategoryTabsProps {
  categories: CategoryRow[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  const activeCategories = categories.filter((c) => c.is_active);

  const items: Array<{ id: string | null; label: string; icon: string | null }> = [
    { id: null, label: 'Todos', icon: null },
    ...activeCategories.map((c) => ({ id: c.id as string | null, label: c.name, icon: c.icon ?? null })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Categorías"
      className="flex items-center gap-2 overflow-x-auto pb-1"
    >
      {items.map((item) => {
        const isActive = selected === item.id;
        return (
          <motion.button
            key={item.id ?? '__all'}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.id)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`relative inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
              ${isActive
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
                : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-fg)]'
              }`}
          >
            {item.icon ? <LucideIcon name={item.icon} size={16} /> : <LayoutGrid size={16} />}
            {item.label}
          </motion.button>
        );
      })}
    </div>
  );
}

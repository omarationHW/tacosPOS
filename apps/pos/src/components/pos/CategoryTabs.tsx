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

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect(null)}
        className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
          ${selected === null
            ? 'bg-amber-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
      >
        <LayoutGrid size={16} />
        Todos
      </button>
      {activeCategories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            ${selected === cat.id
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
        >
          {cat.icon && <LucideIcon name={cat.icon} size={16} />}
          {cat.name}
        </button>
      ))}
    </div>
  );
}

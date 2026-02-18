import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ProductWithRelations } from '@/hooks/useProducts';
import type { CartItemModifier } from './OrderPanel';

interface ModifierModalProps {
  product: ProductWithRelations;
  onConfirm: (modifiers: CartItemModifier[]) => void;
  onClose: () => void;
}

export function ModifierModal({ product, onConfirm, onClose }: ModifierModalProps) {
  // Track selected modifier IDs per group
  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const pmg of product.modifier_groups) {
      init[pmg.modifier_group_id] = new Set();
    }
    return init;
  });

  const toggleModifier = (groupId: string, modifierId: string, maxSelect: number) => {
    setSelections((prev) => {
      const groupSet = new Set(prev[groupId]);
      if (groupSet.has(modifierId)) {
        groupSet.delete(modifierId);
      } else {
        // If max_select is 1, replace selection
        if (maxSelect === 1) {
          groupSet.clear();
        }
        // If at max, don't add
        if (groupSet.size < maxSelect) {
          groupSet.add(modifierId);
        }
      }
      return { ...prev, [groupId]: groupSet };
    });
  };

  const isValid = () => {
    for (const pmg of product.modifier_groups) {
      const mg = pmg.modifier_group;
      const selected = selections[pmg.modifier_group_id]?.size ?? 0;
      if (mg.is_required && selected < mg.min_select) return false;
    }
    return true;
  };

  const handleConfirm = () => {
    const modifiers: CartItemModifier[] = [];
    for (const pmg of product.modifier_groups) {
      const selectedIds = selections[pmg.modifier_group_id] ?? new Set();
      for (const mod of pmg.modifier_group.modifiers) {
        if (selectedIds.has(mod.id)) {
          modifiers.push({
            modifierId: mod.id,
            name: mod.name,
            priceOverride: typeof mod.price_override === 'number' ? mod.price_override : 0,
          });
        }
      }
    }
    onConfirm(modifiers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 p-4">
          <div>
            <h3 className="text-lg font-bold text-gray-100">{product.name}</h3>
            <p className="text-sm text-amber-400">${product.price.toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modifier groups */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {product.modifier_groups.map((pmg) => {
            const mg = pmg.modifier_group;
            const selectedIds = selections[pmg.modifier_group_id] ?? new Set();
            const activeModifiers = mg.modifiers.filter((m) => m.is_active);

            return (
              <div key={pmg.id} className="mb-4 last:mb-0">
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-200">{mg.name}</h4>
                  {mg.is_required && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-400">
                      Requerido
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {mg.max_select === 1 ? 'Elige 1' : `Hasta ${mg.max_select}`}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {activeModifiers.map((mod) => {
                    const isSelected = selectedIds.has(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleModifier(pmg.modifier_group_id, mod.id, mg.max_select)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                          ${isSelected
                            ? 'border border-amber-500 bg-amber-500/10 text-gray-100'
                            : 'border border-gray-600 bg-gray-750 text-gray-300 hover:bg-gray-700'
                          }`}
                      >
                        <span className="font-medium">{mod.name}</span>
                        {typeof mod.price_override === 'number' && mod.price_override > 0 && (
                          <span className="text-xs text-gray-400">+${mod.price_override.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-700 p-4">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!isValid()}
            className="flex-1"
          >
            Agregar al Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}

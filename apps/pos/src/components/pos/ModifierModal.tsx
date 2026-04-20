import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ProductWithRelations } from '@/hooks/useProducts';
import type { CartItemModifier } from './OrderPanel';

interface ModifierModalProps {
  product: ProductWithRelations;
  onConfirm: (modifiers: CartItemModifier[]) => void;
  onClose: () => void;
}

export function ModifierModal({ product, onConfirm, onClose }: ModifierModalProps) {
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
        if (maxSelect === 1) groupSet.clear();
        if (groupSet.size < maxSelect) groupSet.add(modifierId);
      }
      return { ...prev, [groupId]: groupSet };
    });
  };

  const isValid = useMemo(() => {
    for (const pmg of product.modifier_groups) {
      const mg = pmg.modifier_group;
      const selected = selections[pmg.modifier_group_id]?.size ?? 0;
      if (mg.is_required && selected < mg.min_select) return false;
    }
    return true;
  }, [product, selections]);

  const liveTotal = useMemo(() => {
    let extra = 0;
    for (const pmg of product.modifier_groups) {
      const selectedIds = selections[pmg.modifier_group_id] ?? new Set();
      for (const mod of pmg.modifier_group.modifiers) {
        if (selectedIds.has(mod.id)) extra += mod.price_override ?? 0;
      }
    }
    return product.price + extra;
  }, [product, selections]);

  const handleConfirm = () => {
    const modifiers: CartItemModifier[] = [];
    for (const pmg of product.modifier_groups) {
      const selectedIds = selections[pmg.modifier_group_id] ?? new Set();
      for (const mod of pmg.modifier_group.modifiers) {
        if (selectedIds.has(mod.id)) {
          modifiers.push({
            modifierId: mod.id,
            name: mod.name,
            priceOverride: mod.price_override ?? 0,
          });
        }
      }
    }
    onConfirm(modifiers);
  };

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[color:var(--color-overlay)] backdrop-blur-sm"
          />
        </Dialog.Overlay>

        <Dialog.Content asChild>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] shadow-2xl
              md:inset-x-auto md:left-1/2 md:w-[560px] md:-translate-x-1/2"
          >
            {/* Grab handle */}
            <div className="flex items-center justify-center pt-3 pb-1">
              <span aria-hidden className="h-1 w-10 rounded-full bg-[color:var(--color-border-strong)]" />
            </div>

            <div className="flex items-start justify-between gap-3 px-6 pb-4">
              <div>
                <Dialog.Title className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">
                  {product.name}
                </Dialog.Title>
                {product.description && (
                  <Dialog.Description className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
                    {product.description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                className="-mr-2 cursor-pointer rounded-full p-2 text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
              >
                <X size={20} />
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="flex flex-col gap-6">
                {product.modifier_groups.map((pmg) => {
                  const mg = pmg.modifier_group;
                  const selectedIds = selections[pmg.modifier_group_id] ?? new Set();
                  const activeModifiers = mg.modifiers.filter((m) => m.is_active);
                  const selectedCount = selectedIds.size;
                  const counterLabel =
                    mg.max_select === 1
                      ? 'Selecciona 1'
                      : `Hasta ${mg.max_select} · ${selectedCount} seleccionado${selectedCount === 1 ? '' : 's'}`;

                  return (
                    <section key={pmg.id}>
                      <header className="mb-2 flex items-center gap-2">
                        <h4 className="font-display text-base font-semibold text-[color:var(--color-fg)]">
                          {mg.name}
                        </h4>
                        {mg.is_required && (
                          <span className="rounded-full bg-[color:var(--color-danger)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-danger)]">
                            Requerido
                          </span>
                        )}
                        <span className="text-[11px] text-[color:var(--color-fg-subtle)]">
                          {counterLabel}
                        </span>
                      </header>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {activeModifiers.map((mod) => {
                          const isSelected = selectedIds.has(mod.id);
                          const hasPrice = (mod.price_override ?? 0) > 0;
                          return (
                            <motion.button
                              key={mod.id}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleModifier(pmg.modifier_group_id, mod.id, mg.max_select)}
                              className={`relative flex min-h-[56px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
                                ${isSelected
                                  ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]'
                                  : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] hover:border-[color:var(--color-border-strong)]'
                                }`}
                            >
                              <span className="font-semibold text-[color:var(--color-fg)]">{mod.name}</span>
                              <span className="flex items-center gap-2">
                                {hasPrice && (
                                  <span className="font-mono text-xs font-semibold tabular-nums text-[color:var(--color-fg-muted)]">
                                    +${(mod.price_override ?? 0).toFixed(2)}
                                  </span>
                                )}
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.span
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                      className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
                                    >
                                      <Check size={13} strokeWidth={3} />
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 border-t border-[color:var(--color-border)] px-6 py-4">
              <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                disabled={!isValid}
                className="flex-[2]"
              >
                <span>Agregar</span>
                <span className="font-mono tabular-nums">
                  $<NumberFlow value={liveTotal} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                </span>
              </Button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

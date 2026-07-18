import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ProductWithRelations } from '@/hooks/useProducts';
import type { CartItemModifier, OrderType } from './OrderPanel';

interface MontoModalProps {
  product: ProductWithRelations;
  orderType: OrderType;
  /** Devuelve el monto escrito y los modifiers (ej. tipo de carne) elegidos. */
  onConfirm: (amount: number, modifiers: CartItemModifier[]) => void;
  onClose: () => void;
}

const QUICK_AMOUNTS = [100, 150, 200, 250, 300, 500];

/**
 * Modal para capturar un MONTO libre de carnitas ($ que escribe el cliente)
 * junto con el tipo de carne. Se usa para el producto "Otro monto" (precio 0)
 * de la categoría "Por monto".
 */
export function MontoModal({ product, orderType, onConfirm, onClose }: MontoModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const pmg of product.modifier_groups) init[pmg.modifier_group_id] = new Set();
    return init;
  });

  const amount = Math.round((parseFloat(amountStr) || 0) * 100) / 100;

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

  const modifiersValid = useMemo(() => {
    for (const pmg of product.modifier_groups) {
      const mg = pmg.modifier_group;
      const selected = selections[pmg.modifier_group_id]?.size ?? 0;
      if (mg.is_required && selected < mg.min_select) return false;
    }
    return true;
  }, [product, selections]);

  const isValid = amount > 0 && modifiersValid;

  const handleConfirm = () => {
    if (!isValid) return;
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
    onConfirm(amount, modifiers);
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
            <div className="flex items-center justify-center pt-3 pb-1">
              <span aria-hidden className="h-1 w-10 rounded-full bg-[color:var(--color-border-strong)]" />
            </div>

            <div className="flex items-start justify-between gap-3 px-6 pb-4">
              <div>
                <Dialog.Title className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">
                  {product.name}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
                  Escribe el monto y elige el tipo de carne
                </Dialog.Description>
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
                {/* Monto */}
                <section>
                  <label
                    htmlFor="monto-input"
                    className="mb-2 block font-display text-base font-semibold text-[color:var(--color-fg)]"
                  >
                    Monto
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl font-bold text-[color:var(--color-fg-muted)]">
                      $
                    </span>
                    <input
                      id="monto-input"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0"
                      autoFocus
                      className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] py-4 pl-10 pr-4 font-mono text-3xl font-bold tabular-nums text-[color:var(--color-fg)]
                        placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none
                        focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountStr(String(amt))}
                        className="cursor-pointer rounded-full bg-[color:var(--color-bg-inset)] px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Grupos de modifiers (tipo de carne) */}
                {product.modifier_groups.map((pmg) => {
                  const mg = pmg.modifier_group;
                  const selectedIds = selections[pmg.modifier_group_id] ?? new Set();
                  const activeModifiers = mg.modifiers.filter((m) => m.is_active);
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
                      </header>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {activeModifiers.map((mod) => {
                          const isSelected = selectedIds.has(mod.id);
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
                              {isSelected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              )}
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
                  $<NumberFlow value={amount} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                </span>
              </Button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** True si el producto es el "monto libre" (precio 0 en categoría de montos). */
export function isCustomMontoProduct(product: ProductWithRelations): boolean {
  const catName = product.category?.name?.toLowerCase() ?? '';
  return Number(product.price) === 0 && catName.includes('monto');
}

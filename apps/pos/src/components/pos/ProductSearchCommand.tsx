import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { motion } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';
import type { ProductWithRelations } from '@/hooks/useProducts';

interface ProductSearchCommandProps {
  products: ProductWithRelations[];
  onSelect: (product: ProductWithRelations) => void;
}

/**
 * Global product search. Opens with / or Ctrl/Cmd + K.
 * Fuzzy-filters the active-line product list; selecting a product
 * invokes onSelect (which in POS.tsx either adds to cart or opens
 * the modifier sheet).
 */
export function ProductSearchCommand({ products, onSelect }: ProductSearchCommandProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // / when not typing in an input
      if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const active = useMemo(() => products.filter((p) => p.is_active), [products]);

  const pickAndClose = (product: ProductWithRelations) => {
    onSelect(product);
    setOpen(false);
  };

  return (
    <>
      <TriggerButton onOpen={() => setOpen(true)} />

      <Dialog.Root open={open} onOpenChange={setOpen}>
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
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="fixed left-1/2 top-[18%] z-50 w-[min(720px,90vw)] -translate-x-1/2"
            >
              <Dialog.Title className="sr-only">Buscar producto</Dialog.Title>
              <Command
                label="Buscar producto"
                className="overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] shadow-2xl"
              >
                <div className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
                  <Search size={20} className="text-[color:var(--color-fg-subtle)]" />
                  <Command.Input
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Buscar por nombre..."
                    autoFocus
                    className="flex-1 bg-transparent text-base text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:outline-none"
                  />
                  <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-0.5 font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                    ESC
                  </kbd>
                </div>
                <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                  <Command.Empty className="flex flex-col items-center gap-2 p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
                    <Sparkles size={24} className="text-[color:var(--color-fg-subtle)]" />
                    <p>Sin resultados</p>
                    <p className="text-xs">Prueba con otro término o revisa la ortografía.</p>
                  </Command.Empty>

                  {active.map((p) => {
                    const searchValue = `${p.name} ${p.category?.name ?? ''}`.toLowerCase();
                    return (
                      <Command.Item
                        key={p.id}
                        value={searchValue}
                        onSelect={() => pickAndClose(p)}
                        className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[color:var(--color-fg)] transition-colors
                          data-[selected=true]:bg-[color:var(--color-accent-soft)] data-[selected=true]:text-[color:var(--color-fg)]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)] group-data-[selected=true]:bg-[color:var(--color-accent)] group-data-[selected=true]:text-[color:var(--color-accent-fg)]">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 font-medium">{p.name}</span>
                        <span className="text-xs text-[color:var(--color-fg-subtle)]">
                          {p.category?.name}
                        </span>
                        <span className="font-mono text-sm tabular-nums text-[color:var(--color-fg-muted)]">
                          ${p.price.toFixed(2)}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.List>
                <div className="flex items-center justify-between border-t border-[color:var(--color-border)] px-4 py-2 text-[11px] text-[color:var(--color-fg-subtle)]">
                  <span>
                    <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono">↑↓</kbd>{' '}
                    navegar
                  </span>
                  <span>
                    <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono">↵</kbd>{' '}
                    agregar
                  </span>
                </div>
              </Command>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function TriggerButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Buscar producto"
      className="flex cursor-pointer items-center gap-3 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-4 py-2 text-sm text-[color:var(--color-fg-muted)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-fg)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
    >
      <Search size={16} />
      <span>Buscar producto...</span>
      <kbd className="ml-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1.5 py-0.5 font-mono text-[11px]">
        /
      </kbd>
    </button>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

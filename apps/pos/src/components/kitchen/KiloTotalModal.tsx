import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Scale } from 'lucide-react';

interface KiloTotalModalProps {
  open: boolean;
  currentTotal: number;
  orderLabel: string;
  busy?: boolean;
  onConfirm: (finalTotal: number) => void;
  onCancel: () => void;
}

/** Modal para capturar el precio final (por peso) al entregar un pedido por kilo. */
export function KiloTotalModal({ open, currentTotal, orderLabel, busy, onConfirm, onCancel }: KiloTotalModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(currentTotal > 0 ? String(currentTotal) : '');
  }, [open, currentTotal]);

  const parsed = parseFloat(value);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const confirm = () => {
    if (valid && !busy) onConfirm(Math.round(parsed * 100) / 100);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={busy ? undefined : onCancel}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-[color:var(--color-bg-elevated)] p-6 shadow-xl"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <Scale className="text-[color:var(--color-accent)]" size={24} />
              <h2 className="font-display text-lg font-semibold text-[color:var(--color-fg)]">
                Precio final del pedido
              </h2>
            </div>
            <p className="mb-4 text-sm text-[color:var(--color-fg-muted)]">
              {orderLabel} · lista:{' '}
              <span className="font-mono tabular-nums">${currentTotal.toFixed(2)}</span>
            </p>

            <label
              htmlFor="kilo-total"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[color:var(--color-fg-subtle)]"
            >
              ¿Cuánto fue el total? (al pesar)
            </label>
            <div className="relative mb-5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-[color:var(--color-fg-muted)]">
                $
              </span>
              <input
                id="kilo-total"
                type="number"
                inputMode="decimal"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirm();
                }}
                placeholder="0.00"
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-3 pl-9 pr-3
                  text-2xl font-bold tabular-nums text-[color:var(--color-fg)]
                  focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex-1 rounded-xl border border-[color:var(--color-border)] py-3 text-sm font-semibold text-[color:var(--color-fg-muted)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={!valid || busy}
                className="flex-1 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {busy ? 'Entregando…' : 'Entregar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { Receipt, Banknote, CreditCard, ArrowLeft, Percent, DollarSign, Smartphone, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useOpenTabs, type OpenTab } from '@/hooks/useOpenTabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

type DiscountMode = 'fixed' | 'percent';

const TYPE_BADGES: Record<'takeout' | 'delivery', { label: string; className: string }> = {
  takeout:  { label: 'Para Llevar', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  delivery: { label: 'A Domicilio', className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
};

export function Cuentas() {
  const { tabs, loading, closeTab } = useOpenTabs();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [successPulse, setSuccessPulse] = useState(false);

  const [discountMode, setDiscountMode] = useState<DiscountMode>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [tipValue, setTipValue] = useState('');

  const selected = tabs.find((t) => (t.customerName ?? t.orderIds[0]) === selectedKey) ?? null;

  const selectTab = (tab: OpenTab) => {
    setSelectedKey(tab.customerName ?? tab.orderIds[0]);
    setDiscountMode('fixed');
    setDiscountValue('');
    setTipValue('');
  };

  const computeDiscount = (subtotal: number): number => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountMode === 'percent') {
      return Math.round(Math.min(val, 100) / 100 * subtotal * 100) / 100;
    }
    return Math.min(val, subtotal);
  };

  const handlePay = async (tab: OpenTab, method: 'cash' | 'card' | 'transfer') => {
    setPaying(true);
    try {
      const discount = computeDiscount(tab.subtotal);
      const tip = parseFloat(tipValue) || 0;
      await closeTab(tab, method, { discount, tip });
      const finalTotal = tab.total - discount + tip;
      const methodLabel = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'Transferencia';
      setSuccessPulse(true);
      setTimeout(() => setSuccessPulse(false), 1500);
      toast.success(
        `${tab.mesa} cobrada — $${finalTotal.toFixed(2)} (${methodLabel})`,
      );
      setTimeout(() => {
        setSelectedKey(null);
        setDiscountValue('');
        setTipValue('');
      }, 650);
    } catch {
      toast.error('Error al cobrar la cuenta');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const liveTotal = selected ? selected.total - computeDiscount(selected.subtotal) + (parseFloat(tipValue) || 0) : 0;

  return (
    <div className="-m-4 flex h-[calc(100vh)] overflow-hidden lg:-m-6">
      {/* Left: tabs list */}
      <div className={`flex flex-1 flex-col overflow-hidden border-r border-[color:var(--color-border)] p-4 lg:p-6
        ${selected ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="mb-5 flex items-center gap-3">
          <Receipt className="text-[color:var(--color-accent)]" size={28} />
          <h1 className="font-display text-3xl font-semibold text-[color:var(--color-fg)]">Cuentas</h1>
          {tabs.length > 0 && (
            <span className="rounded-full bg-[color:var(--color-accent-soft)] px-3 py-0.5 text-sm font-semibold text-[color:var(--color-accent)]">
              {tabs.length}
            </span>
          )}
        </div>

        {tabs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[color:var(--color-fg-subtle)]">
            <Receipt size={48} strokeWidth={1.5} />
            <p>No hay cuentas abiertas</p>
            <p className="text-sm">Los pedidos sin cobrar aparecerán aquí</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence initial={false}>
              {tabs.map((tab) => {
                const tabKey = tab.customerName ?? tab.orderIds[0];
                const badge = tab.orderType === 'takeout' ? TYPE_BADGES.takeout : tab.orderType === 'delivery' ? TYPE_BADGES.delivery : null;
                const isActive = selectedKey === tabKey;
                return (
                  <motion.button
                    key={tabKey}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectTab(tab)}
                    className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
                      ${isActive
                        ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]'
                        : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] hover:border-[color:var(--color-accent)]'
                      }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-display text-lg font-semibold text-[color:var(--color-fg)] line-clamp-1">
                        {tab.mesa}
                      </span>
                      <span className="text-xs text-[color:var(--color-fg-subtle)]">
                        {tab.orderIds.length}
                      </span>
                    </div>
                    {badge && (
                      <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                    <div className="text-xs text-[color:var(--color-fg-muted)]">
                      {tab.items.length} producto{tab.items.length !== 1 && 's'}
                    </div>
                    <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[color:var(--color-fg)]">
                      ${tab.total.toFixed(2)}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Right: detail */}
      <div className={`flex shrink-0 flex-col bg-[color:var(--color-bg-elevated)]
        ${selected ? 'flex w-full lg:w-[420px]' : 'hidden lg:flex lg:w-[420px]'}`}
      >
        <AnimatePresence>
          {successPulse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[color:var(--color-bg)]/90 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="flex h-32 w-32 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] shadow-2xl"
              >
                <Check size={72} strokeWidth={3} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[color:var(--color-fg-subtle)]">
            <ArrowLeft size={32} strokeWidth={1.5} />
            <p className="text-sm">Selecciona una cuenta para cobrar</p>
          </div>
        ) : (
          <>
            <div className="border-b border-[color:var(--color-border)] p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedKey(null)}
                  aria-label="Volver"
                  className="cursor-pointer rounded-lg p-2 text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="font-display text-xl font-semibold text-[color:var(--color-fg)]">{selected.mesa}</h2>
                  <p className="text-xs text-[color:var(--color-fg-muted)]">
                    {selected.orderIds.length} pedido{selected.orderIds.length !== 1 && 's'}
                    {selected.orderType === 'takeout' && ' · Para Llevar'}
                    {selected.orderType === 'delivery' && ' · A Domicilio'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto flex max-w-lg flex-col gap-2">
                {selected.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-[color:var(--color-bg)] px-3 py-2.5"
                  >
                    <div>
                      <span className="text-sm font-semibold text-[color:var(--color-fg)]">
                        {item.quantity}× {item.productName}
                      </span>
                      <span className="ml-2 font-mono text-xs tabular-nums text-[color:var(--color-fg-subtle)]">
                        @ ${item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-[color:var(--color-fg)]">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[color:var(--color-border)] p-4">
              <div className="mx-auto max-w-lg space-y-3">
                {/* Discount */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
                    Descuento
                  </label>
                  <div className="flex gap-2">
                    <div className="flex rounded-lg bg-[color:var(--color-bg)] p-0.5">
                      <DiscountModeButton active={discountMode === 'fixed'} onClick={() => setDiscountMode('fixed')}>
                        <DollarSign size={14} />
                      </DiscountModeButton>
                      <DiscountModeButton active={discountMode === 'percent'} onClick={() => setDiscountMode('percent')}>
                        <Percent size={14} />
                      </DiscountModeButton>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountMode === 'percent' ? '0%' : '$0.00'}
                      className="flex-1 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1.5 font-mono text-sm tabular-nums text-[color:var(--color-fg)]
                        placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tip */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
                    Propina
                  </label>
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {[0, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            if (pct === 0) setTipValue('');
                            else setTipValue((Math.round(selected.subtotal * pct) / 100).toFixed(2));
                          }}
                          className="cursor-pointer rounded-md bg-[color:var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)]"
                        >
                          {pct === 0 ? 'Sin' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tipValue}
                      onChange={(e) => setTipValue(e.target.value)}
                      placeholder="$0.00"
                      className="flex-1 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1.5 font-mono text-sm tabular-nums text-[color:var(--color-fg)]
                        placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-xl bg-[color:var(--color-bg)] p-3 font-mono text-sm tabular-nums">
                  <TotalRow label="Subtotal" value={selected.subtotal} muted />
                  <TotalRow label="IVA (16%)" value={selected.tax} muted />
                  {computeDiscount(selected.subtotal) > 0 && (
                    <TotalRow label="Descuento" value={-computeDiscount(selected.subtotal)} tone="success" />
                  )}
                  {(parseFloat(tipValue) || 0) > 0 && (
                    <TotalRow label="Propina" value={parseFloat(tipValue) || 0} tone="info" />
                  )}
                  <div className="mt-2 flex items-baseline justify-between border-t border-[color:var(--color-border)] pt-2">
                    <span className="font-display text-base font-semibold text-[color:var(--color-fg)]">Total</span>
                    <span className="text-2xl font-bold text-[color:var(--color-fg)]">
                      $<NumberFlow value={liveTotal} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="primary" loading={paying} onClick={() => handlePay(selected, 'cash')} className="flex-1 gap-1.5">
                    <Banknote size={18} /> Efectivo
                  </Button>
                  <Button variant="secondary" loading={paying} onClick={() => handlePay(selected, 'card')} className="flex-1 gap-1.5">
                    <CreditCard size={18} /> Tarjeta
                  </Button>
                  <Button variant="secondary" loading={paying} onClick={() => handlePay(selected, 'transfer')} className="flex-1 gap-1.5">
                    <Smartphone size={18} /> Transf.
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DiscountModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
        ${active
          ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
          : 'text-[color:var(--color-fg-muted)]'
        }`}
    >
      {children}
    </button>
  );
}

function TotalRow({
  label,
  value,
  muted = false,
  tone,
}: {
  label: string;
  value: number;
  muted?: boolean;
  tone?: 'success' | 'info';
}) {
  const color = tone === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'info'
      ? 'text-sky-600 dark:text-sky-400'
      : muted
        ? 'text-[color:var(--color-fg-muted)]'
        : 'text-[color:var(--color-fg)]';
  return (
    <div className={`flex items-baseline justify-between py-0.5 ${color}`}>
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}</span>
    </div>
  );
}

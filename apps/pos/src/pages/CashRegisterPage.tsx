import { useState } from 'react';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCashRegister } from '@/hooks/useCashRegister';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

const movementLabels: Record<string, { label: string; color: string }> = {
  sale:       { label: 'Venta',    color: 'text-emerald-600 dark:text-emerald-400' },
  deposit:    { label: 'Depósito', color: 'text-sky-600 dark:text-sky-400' },
  tip:        { label: 'Propina',  color: 'text-amber-600 dark:text-amber-400' },
  withdrawal: { label: 'Retiro',   color: 'text-red-600 dark:text-red-400' },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function CashRegisterPage() {
  const {
    activeSession,
    movements,
    history,
    loading,
    summary,
    openSession,
    closeSession,
    addMovement,
  } = useCashRegister();

  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [movType, setMovType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [movAmount, setMovAmount] = useState('');
  const [movDesc, setMovDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);

  const handleOpen = async () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Ingresa un monto inicial válido');
      return;
    }
    setBusy(true);
    try {
      await openSession(amount);
      setOpeningAmount('');
      toast.success(`Turno abierto con $${amount.toFixed(2)}`);
    } catch {
      toast.error('Error al abrir turno');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Ingresa el monto real en caja');
      return;
    }
    setBusy(true);
    try {
      await closeSession(amount, closingNotes);
      setClosingAmount('');
      setClosingNotes('');
      setShowCloseForm(false);
      toast.success('Turno cerrado');
    } catch {
      toast.error('Error al cerrar turno');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMovement = async () => {
    const amount = parseFloat(movAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setBusy(true);
    try {
      await addMovement(movType, amount, movDesc);
      setMovAmount('');
      setMovDesc('');
      toast.success(`${movType === 'deposit' ? 'Depósito' : 'Retiro'} registrado`);
    } catch {
      toast.error('Error al registrar movimiento');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Wallet className="text-[color:var(--color-accent)]" size={32} />
        <h1 className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">Caja</h1>
        {activeSession && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Turno abierto
          </span>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        {(['current', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
              ${tab === t
                ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
                : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
              }`}
          >
            {t === 'current' ? 'Turno actual' : 'Historial'}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <>
          {!activeSession ? (
            <div className="mx-auto max-w-md rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-6">
              <div className="mb-5 text-center">
                <Wallet className="mx-auto mb-2 text-[color:var(--color-fg-subtle)]" size={48} strokeWidth={1.5} />
                <h2 className="font-display text-xl font-semibold text-[color:var(--color-fg)]">Abrir turno</h2>
                <p className="text-sm text-[color:var(--color-fg-muted)]">Ingresa el monto inicial en caja</p>
              </div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-subtle)]">Monto inicial</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="$0.00"
                className="mb-4 w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-3 text-center font-mono text-2xl font-bold tabular-nums
                  text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
              <Button variant="primary" size="lg" loading={busy} onClick={handleOpen} className="w-full">
                Abrir turno
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <StatTile label="Apertura"  value={activeSession.opening_amount} />
                <StatTile label="Ventas"    value={summary.sales}      tone="success" />
                <StatTile label="Propinas"  value={summary.tips}       tone="accent" />
                <StatTile label="Depósitos" value={summary.deposits}   tone="info" />
                <StatTile label="Retiros"   value={summary.withdrawals} tone="danger" />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                    Esperado en caja
                  </span>
                  <span className="font-mono text-4xl font-bold tabular-nums text-[color:var(--color-fg)]">
                    $<NumberFlow value={summary.expected} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                  </span>
                </div>
              </motion.div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Add movement */}
                <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <h3 className="mb-3 font-display text-base font-semibold text-[color:var(--color-fg)]">Registrar movimiento</h3>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMovType('deposit')}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-semibold transition-colors
                        ${movType === 'deposit'
                          ? 'bg-sky-600 text-white'
                          : 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
                        }`}
                    >
                      <ArrowDownCircle size={18} />
                      Depósito
                    </button>
                    <button
                      onClick={() => setMovType('withdrawal')}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-semibold transition-colors
                        ${movType === 'withdrawal'
                          ? 'bg-red-600 text-white'
                          : 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
                        }`}
                    >
                      <ArrowUpCircle size={18} />
                      Retiro
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    placeholder="Monto"
                    className="mb-2 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-sm tabular-nums
                      text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={movDesc}
                    onChange={(e) => setMovDesc(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="mb-3 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm
                      text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
                  />
                  <Button variant="primary" loading={busy} onClick={handleAddMovement} className="w-full">
                    Registrar
                  </Button>
                </div>

                {/* Movements */}
                <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4 lg:col-span-2">
                  <h3 className="mb-3 font-display text-base font-semibold text-[color:var(--color-fg)]">Movimientos del turno</h3>
                  {movements.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[color:var(--color-fg-subtle)]">Sin movimientos aún</p>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto xl:max-h-[440px]">
                      {movements.map((mov) => {
                        const meta = movementLabels[mov.type] ?? { label: mov.type, color: 'text-[color:var(--color-fg-muted)]' };
                        return (
                          <div key={mov.id} className="flex items-center justify-between rounded-lg bg-[color:var(--color-bg)] px-3 py-2.5">
                            <div className="min-w-0">
                              <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                              {mov.description && (
                                <span className="ml-2 text-xs text-[color:var(--color-fg-subtle)]">{mov.description}</span>
                              )}
                              <div className="text-[11px] text-[color:var(--color-fg-subtle)]">{formatTime(mov.created_at)}</div>
                            </div>
                            <span className={`font-mono text-sm font-bold tabular-nums
                              ${mov.type === 'withdrawal' ? 'text-red-600 dark:text-red-400' : 'text-[color:var(--color-fg)]'}`}
                            >
                              {mov.type === 'withdrawal' ? '-' : '+'}${mov.amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Close session */}
              <div>
                {!showCloseForm ? (
                  <Button variant="danger" size="lg" onClick={() => setShowCloseForm(true)} className="w-full">
                    Cerrar turno
                  </Button>
                ) : (
                  <div className="rounded-2xl border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 p-5">
                    <h3 className="mb-3 font-display text-base font-semibold text-[color:var(--color-fg)]">Cerrar turno</h3>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-subtle)]">Monto real en caja</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                      placeholder="$0.00"
                      className="mb-3 w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-3 text-center font-mono text-2xl font-bold tabular-nums
                        text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-subtle)]">Notas (opcional)</label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Observaciones del turno..."
                      className="mb-3 w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm
                        text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setShowCloseForm(false)} className="flex-1">Cancelar</Button>
                      <Button variant="danger" loading={busy} onClick={handleClose} className="flex-1">Confirmar cierre</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-12 text-center">
              <Clock className="mx-auto mb-3 text-[color:var(--color-fg-subtle)]" size={48} strokeWidth={1.5} />
              <p className="text-[color:var(--color-fg-muted)]">No hay cortes anteriores</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((session) => (
                <div key={session.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-display font-semibold text-[color:var(--color-fg)]">{formatDate(session.opened_at)}</span>
                      <span className="mx-2 text-[color:var(--color-fg-subtle)]">–</span>
                      <span className="text-[color:var(--color-fg-muted)]">
                        {session.closed_at ? formatDate(session.closed_at) : 'Abierto'}
                      </span>
                    </div>
                    {session.difference != null && (
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums
                        ${session.difference === 0
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : session.difference > 0
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {session.difference === 0 ? (
                          <><CheckCircle size={12} /> Cuadra</>
                        ) : (
                          <><XCircle size={12} /> {session.difference > 0 ? '+' : ''}${session.difference.toFixed(2)}</>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <HistoryField label="Apertura" value={`$${session.opening_amount.toFixed(2)}`} />
                    <HistoryField label="Esperado" value={session.expected_amount != null ? `$${session.expected_amount.toFixed(2)}` : '—'} />
                    <HistoryField label="Real"     value={session.closing_amount != null ? `$${session.closing_amount.toFixed(2)}` : '—'} />
                    <HistoryField label="Abrió"    value={session.opener_name ?? '—'} />
                  </div>
                  {session.notes && <p className="mt-2 text-xs text-[color:var(--color-fg-subtle)]">{session.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'info' | 'danger' | 'accent';
}) {
  const color = tone === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'info'
      ? 'text-sky-600 dark:text-sky-400'
      : tone === 'danger'
        ? 'text-red-600 dark:text-red-400'
        : tone === 'accent'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-[color:var(--color-fg)]';
  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
      <div className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${color}`}>
        $<NumberFlow value={value} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
      </div>
    </div>
  );
}

function HistoryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">{label}</div>
      <div className="text-sm font-semibold text-[color:var(--color-fg)]">{value}</div>
    </div>
  );
}

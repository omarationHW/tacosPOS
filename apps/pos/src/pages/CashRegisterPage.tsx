import { useState } from 'react';
import {
  Wallet,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCashRegister, type CashMovement } from '@/hooks/useCashRegister';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

const movementLabels: Record<string, { label: string; color: string }> = {
  sale: { label: 'Venta', color: 'text-green-400' },
  deposit: { label: 'Deposito', color: 'text-blue-400' },
  tip: { label: 'Propina', color: 'text-amber-400' },
  withdrawal: { label: 'Retiro', color: 'text-red-400' },
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  const handleOpenSession = async () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Ingresa un monto inicial valido');
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

  const handleCloseSession = async () => {
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
      toast.error('Ingresa un monto valido');
      return;
    }
    setBusy(true);
    try {
      await addMovement(movType, amount, movDesc);
      setMovAmount('');
      setMovDesc('');
      toast.success(`${movType === 'deposit' ? 'Deposito' : 'Retiro'} registrado`);
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
        <Wallet className="text-amber-500" size={28} />
        <h1 className="text-2xl font-bold text-gray-100">Caja</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab('current')}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors
            ${tab === 'current' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          Turno Actual
        </button>
        <button
          onClick={() => setTab('history')}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors
            ${tab === 'history' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
        >
          Historial de Cortes
        </button>
      </div>

      {tab === 'current' && (
        <>
          {!activeSession ? (
            /* Open session form */
            <div className="mx-auto max-w-md rounded-xl border border-gray-700 bg-gray-800 p-6">
              <div className="mb-4 text-center">
                <Wallet className="mx-auto mb-2 text-gray-500" size={48} strokeWidth={1.5} />
                <h2 className="text-lg font-bold text-gray-100">Abrir Turno</h2>
                <p className="text-sm text-gray-400">Ingresa el monto inicial en caja</p>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm text-gray-400">Monto Inicial</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="$0.00"
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-center text-xl font-bold
                    text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <Button
                variant="primary"
                size="lg"
                loading={busy}
                onClick={handleOpenSession}
                className="w-full"
              >
                Abrir Turno
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Summary cards */}
              <div className="lg:col-span-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="mb-1 text-xs text-gray-400">Apertura</div>
                    <div className="text-xl font-bold text-gray-100">${activeSession.opening_amount.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="mb-1 text-xs text-green-400">Ventas</div>
                    <div className="text-xl font-bold text-green-400">${summary.sales.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="mb-1 text-xs text-amber-400">Propinas</div>
                    <div className="text-xl font-bold text-amber-400">${summary.tips.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="mb-1 text-xs text-blue-400">Depositos</div>
                    <div className="text-xl font-bold text-blue-400">${summary.deposits.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                    <div className="mb-1 text-xs text-red-400">Retiros</div>
                    <div className="text-xl font-bold text-red-400">${summary.withdrawals.toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Esperado en Caja</span>
                    <span className="text-2xl font-bold text-amber-400">${summary.expected.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Add movement form */}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <h3 className="mb-3 text-sm font-bold text-gray-100">Registrar Movimiento</h3>
                <div className="mb-3 flex gap-1.5">
                  <button
                    onClick={() => setMovType('deposit')}
                    className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${movType === 'deposit' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    <ArrowDownCircle size={16} className="mx-auto mb-1" />
                    Deposito
                  </button>
                  <button
                    onClick={() => setMovType('withdrawal')}
                    className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${movType === 'withdrawal' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    <ArrowUpCircle size={16} className="mx-auto mb-1" />
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
                  className="mb-2 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm
                    text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  placeholder="Descripcion (opcional)"
                  className="mb-3 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm
                    text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
                <Button
                  variant="primary"
                  size="md"
                  loading={busy}
                  onClick={handleAddMovement}
                  className="w-full"
                >
                  Registrar
                </Button>
              </div>

              {/* Movements list */}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
                <h3 className="mb-3 text-sm font-bold text-gray-100">Movimientos del Turno</h3>
                {movements.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">Sin movimientos aun</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <div className="flex flex-col gap-2">
                      {movements.map((mov) => {
                        const meta = movementLabels[mov.type] ?? { label: mov.type, color: 'text-gray-400' };
                        return (
                          <div key={mov.id} className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2.5">
                            <div>
                              <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                              {mov.description && (
                                <span className="ml-2 text-xs text-gray-500">{mov.description}</span>
                              )}
                              <div className="text-xs text-gray-500">{formatTime(mov.created_at)}</div>
                            </div>
                            <span className={`text-sm font-bold ${mov.type === 'withdrawal' ? 'text-red-400' : 'text-gray-100'}`}>
                              {mov.type === 'withdrawal' ? '-' : '+'}${mov.amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Close session */}
              <div className="lg:col-span-3">
                {!showCloseForm ? (
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={() => setShowCloseForm(true)}
                    className="w-full"
                  >
                    Cerrar Turno
                  </Button>
                ) : (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <h3 className="mb-3 text-sm font-bold text-gray-100">Cerrar Turno</h3>
                    <div className="mb-3">
                      <label className="mb-1 block text-sm text-gray-400">Monto real en caja</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={closingAmount}
                        onChange={(e) => setClosingAmount(e.target.value)}
                        placeholder="$0.00"
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-center text-xl font-bold
                          text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="mb-1 block text-sm text-gray-400">Notas (opcional)</label>
                      <input
                        type="text"
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        placeholder="Observaciones del turno..."
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm
                          text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="md" onClick={() => setShowCloseForm(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button variant="danger" size="md" loading={busy} onClick={handleCloseSession} className="flex-1">
                        Confirmar Cierre
                      </Button>
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
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-12 text-center">
              <Clock className="mx-auto mb-3 text-gray-600" size={48} strokeWidth={1.5} />
              <p className="text-gray-400">No hay cortes anteriores</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((session) => (
                <div key={session.id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-gray-100">
                        {formatDate(session.opened_at)}
                      </span>
                      <span className="mx-2 text-gray-500">-</span>
                      <span className="text-sm text-gray-400">
                        {session.closed_at ? formatDate(session.closed_at) : 'Abierto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {session.difference != null && (
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                          ${session.difference === 0
                            ? 'bg-green-500/20 text-green-400'
                            : session.difference > 0
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
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
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div>
                      <div className="text-xs text-gray-500">Apertura</div>
                      <div className="text-sm font-medium text-gray-200">${session.opening_amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Esperado</div>
                      <div className="text-sm font-medium text-gray-200">
                        ${session.expected_amount?.toFixed(2) ?? '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Real</div>
                      <div className="text-sm font-medium text-gray-200">
                        ${session.closing_amount?.toFixed(2) ?? '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Abrio</div>
                      <div className="text-sm font-medium text-gray-200">{session.opener_name}</div>
                    </div>
                  </div>
                  {session.notes && (
                    <p className="mt-2 text-xs text-gray-500">{session.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

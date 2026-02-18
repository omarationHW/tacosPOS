import { useState } from 'react';
import { Receipt, Banknote, CreditCard, ArrowLeft, Percent, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOpenTabs, type OpenTab } from '@/hooks/useOpenTabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

type DiscountMode = 'fixed' | 'percent';

export function Cuentas() {
  const { tabs, loading, closeTab } = useOpenTabs();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // Discount & tip state
  const [discountMode, setDiscountMode] = useState<DiscountMode>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [tipValue, setTipValue] = useState('');

  const selected = tabs.find((t) => (t.tableId ?? t.orderIds[0]) === selectedKey) ?? null;

  const selectTab = (tab: OpenTab) => {
    setSelectedKey(tab.tableId ?? tab.orderIds[0]);
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

  const handlePay = async (tab: OpenTab, method: 'cash' | 'card') => {
    setPaying(true);
    try {
      const discount = computeDiscount(tab.subtotal);
      const tip = parseFloat(tipValue) || 0;
      await closeTab(tab, method, { discount, tip });
      const finalTotal = tab.total - discount + tip;
      toast.success(
        `${tab.mesa} cobrada — $${finalTotal.toFixed(2)} (${method === 'cash' ? 'Efectivo' : 'Tarjeta'})`,
      );
      setSelectedKey(null);
      setDiscountValue('');
      setTipValue('');
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

  return (
    <div className="-m-4 flex h-[calc(100vh)] overflow-hidden lg:-m-6">
      {/* Left: Mesa list */}
      <div className={`flex flex-1 flex-col overflow-hidden border-r border-gray-700 p-4 lg:p-6
        ${selected ? 'hidden lg:flex' : 'flex'}`}
      >
        <div className="mb-4 flex items-center gap-3 lg:mb-6">
          <Receipt className="text-amber-500" size={28} />
          <h1 className="text-2xl font-bold text-gray-100">Cuentas</h1>
          {tabs.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-sm font-medium text-amber-400">
              {tabs.length} abierta{tabs.length !== 1 && 's'}
            </span>
          )}
        </div>

        {tabs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
            <Receipt size={48} strokeWidth={1.5} />
            <p>No hay cuentas abiertas</p>
            <p className="text-sm">Las mesas con pedidos sin cobrar apareceran aqui</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            {tabs.map((tab) => {
              const tabKey = tab.tableId ?? tab.orderIds[0];
              return (
                <button
                  key={tabKey}
                  onClick={() => selectTab(tab)}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition-colors hover:border-amber-500/60 lg:p-4
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                    ${selectedKey === tabKey
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-700 bg-gray-800 hover:bg-gray-750'
                    }`}
                >
                  <div className="mb-1 flex items-center justify-between lg:mb-2">
                    <span className="text-base font-bold text-gray-100 lg:text-lg">{tab.mesa}</span>
                    <span className="text-xs text-gray-500">
                      {tab.orderIds.length} pedido{tab.orderIds.length !== 1 && 's'}
                    </span>
                  </div>
                  {tab.orderType === 'takeout' && (
                    <span className="mb-1 inline-block rounded bg-blue-500/20 px-1.5 py-0.5 text-xs font-medium text-blue-400">
                      Para Llevar
                    </span>
                  )}
                  <div className="mb-1 text-sm text-gray-400">
                    {tab.items.length} producto{tab.items.length !== 1 && 's'}
                  </div>
                  <div className="text-lg font-bold text-amber-400 lg:text-xl">
                    ${tab.total.toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Bill detail */}
      <div className={`flex shrink-0 flex-col bg-gray-850
        ${selected ? 'flex w-full lg:w-[380px]' : 'hidden lg:flex lg:w-[380px]'}`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-500">
            <ArrowLeft size={32} strokeWidth={1.5} />
            <p className="text-sm">Selecciona una mesa para ver la cuenta</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedKey(null)}
                    aria-label="Volver a la lista de cuentas"
                    className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-lg font-bold text-gray-100">{selected.mesa}</h2>
                    <p className="text-xs text-gray-500">
                      {selected.orderIds.length} pedido{selected.orderIds.length !== 1 && 's'}
                      {selected.orderType === 'takeout' && ' · Para Llevar'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto flex max-w-lg flex-col gap-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-gray-100">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        @ ${item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-300">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount & Tip + Totals */}
            <div className="border-t border-gray-700 p-4">
              <div className="mx-auto max-w-lg">
                {/* Discount */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-400">Descuento</label>
                  <div className="flex gap-1.5">
                    <div className="flex rounded-lg bg-gray-800 p-0.5">
                      <button
                        onClick={() => setDiscountMode('fixed')}
                        className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors
                          ${discountMode === 'fixed' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}
                      >
                        <DollarSign size={14} />
                      </button>
                      <button
                        onClick={() => setDiscountMode('percent')}
                        className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors
                          ${discountMode === 'percent' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}
                      >
                        <Percent size={14} />
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountMode === 'percent' ? '0%' : '$0.00'}
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100
                        placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tip */}
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-400">Propina</label>
                  <div className="flex gap-1.5">
                    <div className="flex gap-1">
                      {[0, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => {
                            if (pct === 0) {
                              setTipValue('');
                            } else {
                              const tipAmt = Math.round(selected.subtotal * pct) / 100;
                              setTipValue(tipAmt.toFixed(2));
                            }
                          }}
                          className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors
                            ${pct === 0 ? 'bg-gray-700 text-gray-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100
                        placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Totals */}
                <div className="mb-1 flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>${selected.subtotal.toFixed(2)}</span>
                </div>
                <div className="mb-1 flex justify-between text-sm text-gray-400">
                  <span>IVA (16%)</span>
                  <span>${selected.tax.toFixed(2)}</span>
                </div>
                {computeDiscount(selected.subtotal) > 0 && (
                  <div className="mb-1 flex justify-between text-sm text-green-400">
                    <span>Descuento</span>
                    <span>-${computeDiscount(selected.subtotal).toFixed(2)}</span>
                  </div>
                )}
                {(parseFloat(tipValue) || 0) > 0 && (
                  <div className="mb-1 flex justify-between text-sm text-blue-400">
                    <span>Propina</span>
                    <span>+${(parseFloat(tipValue) || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="mb-4 flex justify-between">
                  <span className="text-lg font-bold text-gray-100">Total</span>
                  <span className="text-xl font-bold text-amber-400">
                    ${(selected.total - computeDiscount(selected.subtotal) + (parseFloat(tipValue) || 0)).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    loading={paying}
                    onClick={() => handlePay(selected, 'cash')}
                    className="flex-1 gap-1.5"
                  >
                    <Banknote size={18} />
                    Efectivo
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    loading={paying}
                    onClick={() => handlePay(selected, 'card')}
                    className="flex-1 gap-1.5"
                  >
                    <CreditCard size={18} />
                    Tarjeta
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

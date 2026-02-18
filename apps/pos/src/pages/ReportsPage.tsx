import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, FileText } from 'lucide-react';
import {
  useReports,
  type DailySales,
  type ProductSales,
  type PaymentMethodSales,
  type HourlySales,
  type CashCutSummary,
} from '@/hooks/useReports';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { SalesChart } from '@/components/reports/SalesChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { exportCsv } from '@/lib/exportCsv';
import { exportPdf } from '@/lib/exportPdf';

type ReportTab = 'sales' | 'products' | 'payments' | 'hours' | 'cuts';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function monthAgoStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function toISOStart(date: string): string {
  return `${date}T00:00:00`;
}

function toISOEnd(date: string): string {
  return `${date}T23:59:59`;
}

function formatDateRange(start: string, end: string): string {
  return `${start} al ${end}`;
}

export function ReportsPage() {
  const {
    getSalesByPeriod,
    getTopProducts,
    getAverageTicket,
    getSalesByPaymentMethod,
    getSalesByHour,
    getCashCutHistory,
  } = useReports();
  const [tab, setTab] = useState<ReportTab>('sales');
  const [startDate, setStartDate] = useState(weekAgoStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  // Report data
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [avgTicket, setAvgTicket] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSales[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);
  const [cashCuts, setCashCuts] = useState<CashCutSummary[]>([]);

  const handlePreset = (preset: 'today' | 'week' | 'month') => {
    setEndDate(todayStr());
    if (preset === 'today') setStartDate(todayStr());
    else if (preset === 'week') setStartDate(weekAgoStr());
    else setStartDate(monthAgoStr());
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const start = toISOStart(startDate);
    const end = toISOEnd(endDate);

    if (tab === 'sales') {
      const [sales, avg] = await Promise.all([
        getSalesByPeriod(start, end),
        getAverageTicket(start, end),
      ]);
      setDailySales(sales);
      setAvgTicket(avg);
    } else if (tab === 'products') {
      const prods = await getTopProducts(start, end);
      setTopProducts(prods);
    } else if (tab === 'payments') {
      const methods = await getSalesByPaymentMethod(start, end);
      setPaymentMethods(methods);
    } else if (tab === 'hours') {
      const hours = await getSalesByHour(start, end);
      setHourlySales(hours);
    } else if (tab === 'cuts') {
      const cuts = await getCashCutHistory();
      setCashCuts(cuts);
    }

    setLoading(false);
  }, [tab, startDate, endDate, getSalesByPeriod, getAverageTicket, getTopProducts, getSalesByPaymentMethod, getSalesByHour, getCashCutHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'sales', label: 'Ventas' },
    { key: 'products', label: 'Productos' },
    { key: 'payments', label: 'Met. de Pago' },
    { key: 'hours', label: 'Horas Pico' },
    { key: 'cuts', label: 'Cortes de Caja' },
  ];

  const totalSales = dailySales.reduce((s, d) => s + d.total, 0);
  const totalOrders = dailySales.reduce((s, d) => s + d.orderCount, 0);
  const periodStr = formatDateRange(startDate, endDate);

  // --- Export helpers ---
  const exportSalesCsv = () =>
    exportCsv('ventas-por-dia', ['Fecha', 'Total', 'Ordenes'], dailySales.map((d) => [d.date, d.total, d.orderCount]));

  const exportSalesPdf = () =>
    exportPdf({
      filename: 'ventas-por-dia',
      title: 'Reporte de Ventas por Dia',
      period: periodStr,
      headers: ['Fecha', 'Total ($)', 'Ordenes'],
      rows: dailySales.map((d) => [d.date, `$${d.total.toFixed(2)}`, d.orderCount]),
      summary: [
        { label: 'Total Ventas', value: `$${totalSales.toFixed(2)}` },
        { label: 'Total Ordenes', value: String(totalOrders) },
        { label: 'Ticket Promedio', value: `$${avgTicket.toFixed(2)}` },
      ],
    });

  const exportProductsCsv = () =>
    exportCsv('productos-mas-vendidos', ['Producto', 'Cantidad', 'Ingresos'], topProducts.map((p) => [p.name, p.totalQty, p.totalRevenue]));

  const exportProductsPdf = () =>
    exportPdf({
      filename: 'productos-mas-vendidos',
      title: 'Productos Mas Vendidos',
      period: periodStr,
      headers: ['Producto', 'Cantidad', 'Ingresos ($)'],
      rows: topProducts.map((p) => [p.name, p.totalQty, `$${p.totalRevenue.toFixed(2)}`]),
    });

  const exportPaymentsCsv = () =>
    exportCsv('ventas-por-metodo', ['Metodo', 'Total', 'Transacciones'], paymentMethods.map((p) => [p.method, p.total, p.count]));

  const exportPaymentsPdf = () =>
    exportPdf({
      filename: 'ventas-por-metodo',
      title: 'Ventas por Metodo de Pago',
      period: periodStr,
      headers: ['Metodo', 'Total ($)', 'Transacciones'],
      rows: paymentMethods.map((p) => [p.method, `$${p.total.toFixed(2)}`, p.count]),
    });

  const exportHoursCsv = () =>
    exportCsv('ventas-por-hora', ['Hora', 'Total', 'Ordenes'], hourlySales.map((h) => [`${h.hour}:00`, h.total, h.count]));

  const exportHoursPdf = () =>
    exportPdf({
      filename: 'ventas-por-hora',
      title: 'Ventas por Hora',
      period: periodStr,
      headers: ['Hora', 'Total ($)', 'Ordenes'],
      rows: hourlySales.map((h) => [`${String(h.hour).padStart(2, '0')}:00`, `$${h.total.toFixed(2)}`, h.count]),
    });

  const exportCutsCsv = () =>
    exportCsv('cortes-de-caja', ['Apertura', 'Cierre', 'Monto Inicial', 'Esperado', 'Real', 'Diferencia', 'Operador'],
      cashCuts.map((c) => [c.openedAt, c.closedAt, c.openingAmount, c.expected, c.closingAmount, c.difference, c.openerName]));

  const exportCutsPdf = () =>
    exportPdf({
      filename: 'cortes-de-caja',
      title: 'Historial de Cortes de Caja',
      headers: ['Apertura', 'Cierre', 'Inicio ($)', 'Esperado ($)', 'Real ($)', 'Diferencia ($)', 'Operador'],
      rows: cashCuts.map((c) => [
        new Date(c.openedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        new Date(c.closedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        `$${c.openingAmount.toFixed(2)}`,
        `$${c.expected.toFixed(2)}`,
        `$${c.closingAmount.toFixed(2)}`,
        `$${c.difference.toFixed(2)}`,
        c.openerName,
      ]),
    });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="text-amber-500" size={28} />
        <h1 className="text-2xl font-bold text-gray-100">Reportes</h1>
      </div>

      {/* Report tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors
              ${tab === t.key
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date filter (not for cuts) */}
      {tab !== 'cuts' && (
        <div className="mb-6">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onPreset={handlePreset}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Sales report */}
          {tab === 'sales' && (
            <div>
              {/* Summary cards */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-gray-400">Total Ventas</div>
                  <div className="text-2xl font-bold text-amber-400">${totalSales.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-gray-400">Ordenes</div>
                  <div className="text-2xl font-bold text-gray-100">{totalOrders}</div>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-gray-400">Ticket Promedio</div>
                  <div className="text-2xl font-bold text-gray-100">${avgTicket.toFixed(2)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-100">Ventas por Dia</h3>
                  <ExportButtons onCsv={exportSalesCsv} onPdf={exportSalesPdf} />
                </div>
                <SalesChart
                  data={dailySales.map((d) => ({ label: d.date.slice(5), value: d.total }))}
                />
              </div>
            </div>
          )}

          {/* Products report */}
          {tab === 'products' && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-100">Productos Mas Vendidos</h3>
                <ExportButtons onCsv={exportProductsCsv} onPdf={exportProductsPdf} />
              </div>
              <SalesChart
                data={topProducts.map((p) => ({ label: p.name, value: p.totalQty }))}
                formatValue={(v) => `${v} uds`}
                color="bg-green-500"
              />
            </div>
          )}

          {/* Payment methods report */}
          {tab === 'payments' && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-100">Ventas por Metodo de Pago</h3>
                <ExportButtons onCsv={exportPaymentsCsv} onPdf={exportPaymentsPdf} />
              </div>
              {paymentMethods.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Sin datos</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {paymentMethods.map((pm) => (
                    <div key={pm.method} className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-100">{pm.method}</div>
                        <div className="text-xs text-gray-500">{pm.count} transacciones</div>
                      </div>
                      <div className="text-lg font-bold text-amber-400">${pm.total.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hourly sales report */}
          {tab === 'hours' && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-100">Ventas por Hora</h3>
                <ExportButtons onCsv={exportHoursCsv} onPdf={exportHoursPdf} />
              </div>
              <SalesChart
                data={hourlySales.map((h) => ({
                  label: `${String(h.hour).padStart(2, '0')}:00`,
                  value: h.total,
                }))}
                color="bg-blue-500"
              />
            </div>
          )}

          {/* Cash cuts report */}
          {tab === 'cuts' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-100">Historial de Cortes</h3>
                <ExportButtons onCsv={exportCutsCsv} onPdf={exportCutsPdf} />
              </div>
              {cashCuts.length === 0 ? (
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-12 text-center">
                  <p className="text-gray-500">No hay cortes registrados</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cashCuts.map((cut) => (
                    <div key={cut.id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-gray-300">
                          {new Date(cut.openedAt).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium
                          ${cut.difference === 0
                            ? 'bg-green-500/20 text-green-400'
                            : cut.difference > 0
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {cut.difference === 0 ? 'Cuadra' : `${cut.difference > 0 ? '+' : ''}$${cut.difference.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-xs text-gray-500">Apertura</div>
                          <div className="text-sm font-medium text-gray-200">${cut.openingAmount.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Esperado</div>
                          <div className="text-sm font-medium text-gray-200">${cut.expected.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Real</div>
                          <div className="text-sm font-medium text-gray-200">${cut.closingAmount.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Operador</div>
                          <div className="text-sm font-medium text-gray-200">{cut.openerName}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Small reusable export button group */
function ExportButtons({ onCsv, onPdf }: { onCsv: () => void; onPdf: () => void }) {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={onCsv} className="gap-1">
        <Download size={14} /> CSV
      </Button>
      <Button variant="ghost" size="sm" onClick={onPdf} className="gap-1">
        <FileText size={14} /> PDF
      </Button>
    </div>
  );
}

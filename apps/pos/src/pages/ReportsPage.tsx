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
import { useLineFilter } from '@/components/BusinessLineToggle';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { SalesChart } from '@/components/reports/SalesChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { exportCsv } from '@/lib/exportCsv';
import { exportPdf } from '@/lib/exportPdf';

type ReportTab = 'sales' | 'products' | 'payments' | 'hours' | 'cuts';

interface LineSalesData {
  lineName: string;
  lineId: string;
  totalSales: number;
  totalOrders: number;
  avgTicket: number;
  dailySales: DailySales[];
  topProducts: ProductSales[];
  paymentMethods: PaymentMethodSales[];
  hourlySales: HourlySales[];
  cashCuts: CashCutSummary[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function weekAgoStr(): string {
  const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
}
function monthAgoStr(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10);
}
function toISOStart(date: string): string { return `${date}T00:00:00`; }
function toISOEnd(date: string): string { return `${date}T23:59:59`; }
function formatDateRange(start: string, end: string): string { return `${start} al ${end}`; }

export function ReportsPage() {
  const {
    getSalesByPeriod, getTopProducts, getAverageTicket,
    getSalesByPaymentMethod, getSalesByHour, getCashCutHistory,
  } = useReports();
  const resolvedLineId = useLineFilter();
  const { availableBusinessLines, isAllLines } = useBusinessLine();

  const [tab, setTab] = useState<ReportTab>('sales');
  const [startDate, setStartDate] = useState(weekAgoStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  // Single-line data
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [avgTicket, setAvgTicket] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSales[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);
  const [cashCuts, setCashCuts] = useState<CashCutSummary[]>([]);

  // Per-line data (when "Todas")
  const [perLineData, setPerLineData] = useState<LineSalesData[]>([]);

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

    if (isAllLines && availableBusinessLines.length > 1) {
      // Fetch per-line data
      const lineResults = await Promise.all(
        availableBusinessLines.map(async (bl) => {
          const [sales, avg, prods, methods, hours, cuts] = await Promise.all([
            tab === 'sales' ? getSalesByPeriod(start, end, bl.id) : Promise.resolve([]),
            tab === 'sales' ? getAverageTicket(start, end, bl.id) : Promise.resolve(0),
            tab === 'products' ? getTopProducts(start, end, bl.id) : Promise.resolve([]),
            tab === 'payments' ? getSalesByPaymentMethod(start, end, bl.id) : Promise.resolve([]),
            tab === 'hours' ? getSalesByHour(start, end, bl.id) : Promise.resolve([]),
            tab === 'cuts' ? getCashCutHistory(bl.id) : Promise.resolve([]),
          ]);
          return {
            lineName: bl.name,
            lineId: bl.id,
            totalSales: sales.reduce((s, d) => s + d.total, 0),
            totalOrders: sales.reduce((s, d) => s + d.orderCount, 0),
            avgTicket: avg,
            dailySales: sales,
            topProducts: prods,
            paymentMethods: methods,
            hourlySales: hours,
            cashCuts: cuts,
          } as LineSalesData;
        }),
      );
      setPerLineData(lineResults);

      // Also set combined data for totals
      if (tab === 'sales') {
        const allSales = await getSalesByPeriod(start, end, null);
        const allAvg = await getAverageTicket(start, end, null);
        setDailySales(allSales);
        setAvgTicket(allAvg);
      }
    } else {
      setPerLineData([]);
      if (tab === 'sales') {
        const [sales, avg] = await Promise.all([
          getSalesByPeriod(start, end, resolvedLineId),
          getAverageTicket(start, end, resolvedLineId),
        ]);
        setDailySales(sales);
        setAvgTicket(avg);
      } else if (tab === 'products') {
        setTopProducts(await getTopProducts(start, end, resolvedLineId));
      } else if (tab === 'payments') {
        setPaymentMethods(await getSalesByPaymentMethod(start, end, resolvedLineId));
      } else if (tab === 'hours') {
        setHourlySales(await getSalesByHour(start, end, resolvedLineId));
      } else if (tab === 'cuts') {
        setCashCuts(await getCashCutHistory(resolvedLineId));
      }
    }

    setLoading(false);
  }, [tab, startDate, endDate, resolvedLineId, isAllLines, availableBusinessLines, getSalesByPeriod, getAverageTicket, getTopProducts, getSalesByPaymentMethod, getSalesByHour, getCashCutHistory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reportTabs: { key: ReportTab; label: string }[] = [
    { key: 'sales', label: 'Ventas' },
    { key: 'products', label: 'Productos' },
    { key: 'payments', label: 'Met. de Pago' },
    { key: 'hours', label: 'Horas Pico' },
    { key: 'cuts', label: 'Cortes de Caja' },
  ];

  const totalSales = dailySales.reduce((s, d) => s + d.total, 0);
  const totalOrders = dailySales.reduce((s, d) => s + d.orderCount, 0);
  const periodStr = formatDateRange(startDate, endDate);
  const showPerLine = isAllLines && perLineData.length > 1;

  // --- Export helpers ---
  const totalCash = dailySales.reduce((s, d) => s + d.cash, 0);
  const totalCard = dailySales.reduce((s, d) => s + d.card, 0);
  const totalTransfer = dailySales.reduce((s, d) => s + d.transfer, 0);

  const exportSalesCsv = () =>
    exportCsv('ventas-por-dia', ['Fecha', 'Total', 'Efectivo', 'Tarjeta', 'Transferencia', 'Ordenes'],
      dailySales.map((d) => [d.date, d.total, d.cash, d.card, d.transfer, d.orderCount]));
  const exportSalesPdf = () =>
    exportPdf({
      filename: 'ventas-por-dia', title: 'Reporte de Ventas por Dia', period: periodStr,
      headers: ['Fecha', 'Total ($)', 'Efectivo ($)', 'Tarjeta ($)', 'Transf. ($)', 'Ordenes'],
      rows: dailySales.map((d) => [d.date, `$${d.total.toFixed(2)}`, `$${d.cash.toFixed(2)}`, `$${d.card.toFixed(2)}`, `$${d.transfer.toFixed(2)}`, d.orderCount]),
      summary: [
        { label: 'Total Ventas', value: `$${totalSales.toFixed(2)}` },
        { label: 'Efectivo', value: `$${totalCash.toFixed(2)}` },
        { label: 'Tarjeta', value: `$${totalCard.toFixed(2)}` },
        { label: 'Transferencia', value: `$${totalTransfer.toFixed(2)}` },
        { label: 'Total Ordenes', value: String(totalOrders) },
        { label: 'Ticket Promedio', value: `$${avgTicket.toFixed(2)}` },
      ],
    });
  const exportProductsCsv = () =>
    exportCsv('productos-mas-vendidos', ['Producto', 'Cantidad', 'Ingresos'], topProducts.map((p) => [p.name, p.totalQty, p.totalRevenue]));
  const exportProductsPdf = () =>
    exportPdf({
      filename: 'productos-mas-vendidos', title: 'Productos Mas Vendidos', period: periodStr,
      headers: ['Producto', 'Cantidad', 'Ingresos ($)'],
      rows: topProducts.map((p) => [p.name, p.totalQty, `$${p.totalRevenue.toFixed(2)}`]),
    });
  const exportPaymentsCsv = () =>
    exportCsv('ventas-por-metodo', ['Metodo', 'Total', 'Transacciones'], paymentMethods.map((p) => [p.method, p.total, p.count]));
  const exportPaymentsPdf = () =>
    exportPdf({
      filename: 'ventas-por-metodo', title: 'Ventas por Metodo de Pago', period: periodStr,
      headers: ['Metodo', 'Total ($)', 'Transacciones'],
      rows: paymentMethods.map((p) => [p.method, `$${p.total.toFixed(2)}`, p.count]),
    });
  const exportHoursCsv = () =>
    exportCsv('ventas-por-hora', ['Hora', 'Total', 'Ordenes'], hourlySales.map((h) => [`${h.hour}:00`, h.total, h.count]));
  const exportHoursPdf = () =>
    exportPdf({
      filename: 'ventas-por-hora', title: 'Ventas por Hora', period: periodStr,
      headers: ['Hora', 'Total ($)', 'Ordenes'],
      rows: hourlySales.map((h) => [`${String(h.hour).padStart(2, '0')}:00`, `$${h.total.toFixed(2)}`, h.count]),
    });
  const exportCutsCsv = () =>
    exportCsv('cortes-de-caja', ['Apertura', 'Cierre', 'Monto Inicial', 'Esperado', 'Real', 'Diferencia', 'Operador'],
      cashCuts.map((c) => [c.openedAt, c.closedAt, c.openingAmount, c.expected, c.closingAmount, c.difference, c.openerName]));
  const exportCutsPdf = () =>
    exportPdf({
      filename: 'cortes-de-caja', title: 'Historial de Cortes de Caja',
      headers: ['Apertura', 'Cierre', 'Inicio ($)', 'Esperado ($)', 'Real ($)', 'Diferencia ($)', 'Operador'],
      rows: cashCuts.map((c) => [
        new Date(c.openedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        new Date(c.closedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        `$${c.openingAmount.toFixed(2)}`, `$${c.expected.toFixed(2)}`,
        `$${c.closingAmount.toFixed(2)}`, `$${c.difference.toFixed(2)}`, c.openerName,
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
        {reportTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date filter (not for cuts) */}
      {tab !== 'cuts' && (
        <div className="mb-6">
          <DateRangeFilter
            startDate={startDate} endDate={endDate}
            onStartChange={setStartDate} onEndChange={setEndDate}
            onPreset={handlePreset}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* ========== SALES ========== */}
          {tab === 'sales' && (
            <div>
              {/* Per-line breakdown when "Todas" */}
              {showPerLine && (
                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                      <div className="mb-2 text-sm font-bold text-gray-300">{ld.lineName}</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-gray-500">Ventas</div>
                          <div className="text-lg font-bold text-amber-400">${ld.totalSales.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Ordenes</div>
                          <div className="text-lg font-bold text-gray-100">{ld.totalOrders}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Ticket Prom.</div>
                          <div className="text-lg font-bold text-gray-100">${ld.avgTicket.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Combined summary */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-gray-400">{showPerLine ? 'Total Combinado' : 'Total Ventas'}</div>
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

              {/* Payment method totals */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-green-400">Efectivo</div>
                  <div className="text-xl font-bold text-green-400">${totalCash.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-blue-400">Tarjeta</div>
                  <div className="text-xl font-bold text-blue-400">${totalCard.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="text-xs text-purple-400">Transferencia</div>
                  <div className="text-xl font-bold text-purple-400">${totalTransfer.toFixed(2)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-100">Ventas por Dia</h3>
                  <ExportButtons onCsv={exportSalesCsv} onPdf={exportSalesPdf} />
                </div>
                <SalesChart data={dailySales.map((d) => ({ label: d.date.slice(5), value: d.total }))} />

                {/* Daily breakdown table */}
                {dailySales.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-left text-xs text-gray-500">
                          <th className="pb-2">Fecha</th>
                          <th className="pb-2 text-right">Total</th>
                          <th className="pb-2 text-right">Efectivo</th>
                          <th className="pb-2 text-right">Tarjeta</th>
                          <th className="pb-2 text-right">Transf.</th>
                          <th className="pb-2 text-right">Ordenes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySales.map((d) => (
                          <tr key={d.date} className="border-b border-gray-700/50">
                            <td className="py-2 text-gray-300">{d.date}</td>
                            <td className="py-2 text-right font-medium text-amber-400">${d.total.toFixed(2)}</td>
                            <td className="py-2 text-right text-green-400">${d.cash.toFixed(2)}</td>
                            <td className="py-2 text-right text-blue-400">${d.card.toFixed(2)}</td>
                            <td className="py-2 text-right text-purple-400">${d.transfer.toFixed(2)}</td>
                            <td className="py-2 text-right text-gray-400">{d.orderCount}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td className="pt-2 text-gray-200">Total</td>
                          <td className="pt-2 text-right text-amber-400">${totalSales.toFixed(2)}</td>
                          <td className="pt-2 text-right text-green-400">${totalCash.toFixed(2)}</td>
                          <td className="pt-2 text-right text-blue-400">${totalCard.toFixed(2)}</td>
                          <td className="pt-2 text-right text-purple-400">${totalTransfer.toFixed(2)}</td>
                          <td className="pt-2 text-right text-gray-300">{totalOrders}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== PRODUCTS ========== */}
          {tab === 'products' && (
            <div>
              {showPerLine ? (
                <div className="flex flex-col gap-6">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                      <h3 className="mb-3 text-sm font-bold text-gray-100">{ld.lineName} — Mas Vendidos</h3>
                      <SalesChart
                        data={ld.topProducts.map((p) => ({ label: p.name, value: p.totalQty }))}
                        formatValue={(v) => `${v} uds`}
                        color="bg-green-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
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
            </div>
          )}

          {/* ========== PAYMENTS ========== */}
          {tab === 'payments' && (
            <div>
              {showPerLine ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                      <h3 className="mb-3 text-sm font-bold text-gray-100">{ld.lineName}</h3>
                      {ld.paymentMethods.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500">Sin datos</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {ld.paymentMethods.map((pm) => (
                            <div key={pm.method} className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-2.5">
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
                  ))}
                </div>
              ) : (
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
            </div>
          )}

          {/* ========== HOURS ========== */}
          {tab === 'hours' && (
            <div>
              {showPerLine ? (
                <div className="flex flex-col gap-6">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                      <h3 className="mb-3 text-sm font-bold text-gray-100">{ld.lineName} — Horas Pico</h3>
                      <SalesChart
                        data={ld.hourlySales.map((h) => ({
                          label: `${String(h.hour).padStart(2, '0')}:00`, value: h.total,
                        }))}
                        color="bg-blue-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-100">Ventas por Hora</h3>
                    <ExportButtons onCsv={exportHoursCsv} onPdf={exportHoursPdf} />
                  </div>
                  <SalesChart
                    data={hourlySales.map((h) => ({
                      label: `${String(h.hour).padStart(2, '0')}:00`, value: h.total,
                    }))}
                    color="bg-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* ========== CASH CUTS ========== */}
          {tab === 'cuts' && (
            <div>
              {showPerLine ? (
                <div className="flex flex-col gap-6">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId}>
                      <h3 className="mb-3 text-sm font-bold text-gray-100">{ld.lineName} — Cortes</h3>
                      {ld.cashCuts.length === 0 ? (
                        <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center">
                          <p className="text-gray-500">No hay cortes</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {ld.cashCuts.map((cut) => (
                            <CutCard key={cut.id} cut={cut} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
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
                        <CutCard key={cut.id} cut={cut} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CutCard({ cut }: { cut: CashCutSummary }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-300">
          {new Date(cut.openedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
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
  );
}

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

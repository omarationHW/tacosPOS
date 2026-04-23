import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, FileText } from 'lucide-react';
import {
  useReports,
  type DailySales,
  type ProductSales,
  type PaymentMethodSales,
  type HourlySales,
  type CashCutSummary,
  type StaffSales,
} from '@/hooks/useReports';
import { useLineFilter } from '@/components/BusinessLineToggle';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { SalesChart } from '@/components/reports/SalesChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { exportCsv } from '@/lib/exportCsv';
import { exportPdf } from '@/lib/exportPdf';

type ReportTab = 'sales' | 'products' | 'payments' | 'hours' | 'staff' | 'cuts';

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
  staffSales: StaffSales[];
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
    getSalesByStaff,
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
  const [staffSales, setStaffSales] = useState<StaffSales[]>([]);
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
          const [sales, avg, prods, methods, hours, staff, cuts] = await Promise.all([
            tab === 'sales' ? getSalesByPeriod(start, end, bl.id) : Promise.resolve([]),
            tab === 'sales' ? getAverageTicket(start, end, bl.id) : Promise.resolve(0),
            tab === 'products' ? getTopProducts(start, end, bl.id) : Promise.resolve([]),
            tab === 'payments' ? getSalesByPaymentMethod(start, end, bl.id) : Promise.resolve([]),
            tab === 'hours' ? getSalesByHour(start, end, bl.id) : Promise.resolve([]),
            tab === 'staff' ? getSalesByStaff(start, end, bl.id) : Promise.resolve([]),
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
            staffSales: staff,
            cashCuts: cuts,
          } as LineSalesData;
        }),
      );
      setPerLineData(lineResults);

      // Combined data for totals / top-level exports
      if (tab === 'sales') {
        const allSales = await getSalesByPeriod(start, end, null);
        const allAvg = await getAverageTicket(start, end, null);
        setDailySales(allSales);
        setAvgTicket(allAvg);
      } else if (tab === 'staff') {
        setStaffSales(await getSalesByStaff(start, end, null));
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
      } else if (tab === 'staff') {
        setStaffSales(await getSalesByStaff(start, end, resolvedLineId));
      } else if (tab === 'cuts') {
        setCashCuts(await getCashCutHistory(resolvedLineId));
      }
    }

    setLoading(false);
  }, [tab, startDate, endDate, resolvedLineId, isAllLines, availableBusinessLines, getSalesByPeriod, getAverageTicket, getTopProducts, getSalesByPaymentMethod, getSalesByHour, getCashCutHistory, getSalesByStaff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reportTabs: { key: ReportTab; label: string }[] = [
    { key: 'sales', label: 'Ventas' },
    { key: 'products', label: 'Productos' },
    { key: 'payments', label: 'Met. de Pago' },
    { key: 'hours', label: 'Horas Pico' },
    { key: 'staff', label: 'Por Personal' },
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
  const salesRowsFor = (data: DailySales[]) =>
    data.map((d) => [d.date, `$${d.total.toFixed(2)}`, `$${d.cash.toFixed(2)}`, `$${d.card.toFixed(2)}`, `$${d.transfer.toFixed(2)}`, d.orderCount] as (string | number)[]);
  const salesSummaryFor = (data: DailySales[], avg: number) => {
    const total = data.reduce((s, d) => s + d.total, 0);
    const cash = data.reduce((s, d) => s + d.cash, 0);
    const card = data.reduce((s, d) => s + d.card, 0);
    const transfer = data.reduce((s, d) => s + d.transfer, 0);
    const orders = data.reduce((s, d) => s + d.orderCount, 0);
    return [
      { label: 'Total Ventas', value: `$${total.toFixed(2)}` },
      { label: 'Efectivo', value: `$${cash.toFixed(2)}` },
      { label: 'Tarjeta', value: `$${card.toFixed(2)}` },
      { label: 'Transferencia', value: `$${transfer.toFixed(2)}` },
      { label: 'Total Ordenes', value: String(orders) },
      { label: 'Ticket Promedio', value: `$${avg.toFixed(2)}` },
    ];
  };
  const exportSalesPdf = () =>
    exportPdf({
      filename: 'ventas-por-dia', title: 'Reporte de Ventas por Dia', period: periodStr,
      headers: ['Fecha', 'Total ($)', 'Efectivo ($)', 'Tarjeta ($)', 'Transf. ($)', 'Ordenes'],
      rows: salesRowsFor(dailySales),
      summary: salesSummaryFor(dailySales, avgTicket),
      sections: showPerLine
        ? perLineData.map((ld) => ({
            title: ld.lineName,
            headers: ['Fecha', 'Total ($)', 'Efectivo ($)', 'Tarjeta ($)', 'Transf. ($)', 'Ordenes'],
            rows: salesRowsFor(ld.dailySales),
            summary: salesSummaryFor(ld.dailySales, ld.avgTicket),
          }))
        : undefined,
    });
  const exportProductsCsv = () =>
    exportCsv('productos-mas-vendidos', ['Producto', 'Cantidad', 'Ingresos'], topProducts.map((p) => [p.name, p.totalQty, p.totalRevenue]));
  const productsRowsFor = (prods: ProductSales[]) =>
    prods.map((p) => [p.name, p.totalQty, `$${p.totalRevenue.toFixed(2)}`] as (string | number)[]);
  const exportProductsPdf = () =>
    exportPdf({
      filename: 'productos-mas-vendidos', title: 'Productos Mas Vendidos', period: periodStr,
      headers: ['Producto', 'Cantidad', 'Ingresos ($)'],
      rows: productsRowsFor(topProducts),
      sections: showPerLine
        ? perLineData.map((ld) => ({
            title: ld.lineName,
            headers: ['Producto', 'Cantidad', 'Ingresos ($)'],
            rows: productsRowsFor(ld.topProducts),
          }))
        : undefined,
    });
  const exportPaymentsCsv = () =>
    exportCsv('ventas-por-metodo', ['Metodo', 'Total', 'Transacciones'], paymentMethods.map((p) => [p.method, p.total, p.count]));
  const paymentsRowsFor = (data: PaymentMethodSales[]) =>
    data.map((p) => [p.method, `$${p.total.toFixed(2)}`, p.count] as (string | number)[]);
  const exportPaymentsPdf = () =>
    exportPdf({
      filename: 'ventas-por-metodo', title: 'Ventas por Metodo de Pago', period: periodStr,
      headers: ['Metodo', 'Total ($)', 'Transacciones'],
      rows: paymentsRowsFor(paymentMethods),
      sections: showPerLine
        ? perLineData.map((ld) => ({
            title: ld.lineName,
            headers: ['Metodo', 'Total ($)', 'Transacciones'],
            rows: paymentsRowsFor(ld.paymentMethods),
          }))
        : undefined,
    });
  const exportHoursCsv = () =>
    exportCsv('ventas-por-hora', ['Hora', 'Total', 'Ordenes'], hourlySales.map((h) => [`${h.hour}:00`, h.total, h.count]));
  const hoursRowsFor = (data: HourlySales[]) =>
    data.map((h) => [`${String(h.hour).padStart(2, '0')}:00`, `$${h.total.toFixed(2)}`, h.count] as (string | number)[]);
  const exportHoursPdf = () =>
    exportPdf({
      filename: 'ventas-por-hora', title: 'Ventas por Hora', period: periodStr,
      headers: ['Hora', 'Total ($)', 'Ordenes'],
      rows: hoursRowsFor(hourlySales),
      sections: showPerLine
        ? perLineData.map((ld) => ({
            title: ld.lineName,
            headers: ['Hora', 'Total ($)', 'Ordenes'],
            rows: hoursRowsFor(ld.hourlySales),
          }))
        : undefined,
    });
  const roleLabel = (r: string) => {
    switch (r) {
      case 'admin': return 'Admin';
      case 'cashier': return 'Cajero';
      case 'waiter': return 'Mesero';
      case 'kitchen': return 'Cocina';
      default: return r || '—';
    }
  };

  const exportStaffCsv = () =>
    exportCsv('ventas-por-personal', ['Nombre', 'Rol', 'Ordenes', 'Total', 'Ticket Prom.'],
      staffSales.map((s) => [s.name, roleLabel(s.role), s.orderCount, s.totalSales, s.avgTicket]));
  const exportStaffPdf = () =>
    exportPdf({
      filename: 'ventas-por-personal', title: 'Ventas por Personal', period: periodStr,
      headers: ['Nombre', 'Rol', 'Ordenes', 'Total ($)', 'Ticket Prom. ($)'],
      rows: staffSales.map((s) => [s.name, roleLabel(s.role), s.orderCount, `$${s.totalSales.toFixed(2)}`, `$${s.avgTicket.toFixed(2)}`]),
      sections: showPerLine
        ? perLineData.map((ld) => ({
            title: ld.lineName,
            headers: ['Nombre', 'Rol', 'Ordenes', 'Total ($)', 'Ticket Prom. ($)'],
            rows: ld.staffSales.map((s) => [s.name, roleLabel(s.role), s.orderCount, `$${s.totalSales.toFixed(2)}`, `$${s.avgTicket.toFixed(2)}`]),
          }))
        : undefined,
    });

  const exportCutsCsv = () =>
    exportCsv('cortes-de-caja', ['Apertura', 'Cierre', 'Monto Inicial', 'Esperado', 'Real', 'Diferencia', 'Operador'],
      cashCuts.map((c) => [c.openedAt, c.closedAt, c.openingAmount, c.expected, c.closingAmount, c.difference, c.openerName]));
  const cutsRowsFor = (data: CashCutSummary[]) =>
    data.map((c) => [
      new Date(c.openedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      new Date(c.closedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      `$${c.openingAmount.toFixed(2)}`, `$${c.expected.toFixed(2)}`,
      `$${c.closingAmount.toFixed(2)}`, `$${c.difference.toFixed(2)}`, c.openerName,
    ] as (string | number)[]);
  const exportCutsPdf = () =>
    exportPdf({
      filename: 'cortes-de-caja', title: 'Historial de Cortes de Caja',
      headers: ['Apertura', 'Cierre', 'Inicio ($)', 'Esperado ($)', 'Real ($)', 'Diferencia ($)', 'Operador'],
      rows: cutsRowsFor(cashCuts),
      sections: showPerLine
        ? perLineData.map((ld) => ({
            title: ld.lineName,
            headers: ['Apertura', 'Cierre', 'Inicio ($)', 'Esperado ($)', 'Real ($)', 'Diferencia ($)', 'Operador'],
            rows: cutsRowsFor(ld.cashCuts),
          }))
        : undefined,
    });

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="text-[color:var(--color-accent)]" size={28} />
        <h1 className="text-2xl font-bold text-[color:var(--color-fg)]">Reportes</h1>
      </div>

      {/* Report tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {reportTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-[color:var(--color-accent)] text-white' : 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)]'}`}
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
                    <div key={ld.lineId} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                      <div className="mb-2 text-sm font-bold text-[color:var(--color-fg-muted)]">{ld.lineName}</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-[color:var(--color-fg-subtle)]">Ventas</div>
                          <div className="text-lg font-bold text-[color:var(--color-accent)]">${ld.totalSales.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[color:var(--color-fg-subtle)]">Ordenes</div>
                          <div className="text-lg font-bold text-[color:var(--color-fg)]">{ld.totalOrders}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[color:var(--color-fg-subtle)]">Ticket Prom.</div>
                          <div className="text-lg font-bold text-[color:var(--color-fg)]">${ld.avgTicket.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Combined summary */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="text-xs text-[color:var(--color-fg-muted)]">{showPerLine ? 'Total Combinado' : 'Total Ventas'}</div>
                  <div className="text-2xl font-bold text-[color:var(--color-accent)]">${totalSales.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="text-xs text-[color:var(--color-fg-muted)]">Ordenes</div>
                  <div className="text-2xl font-bold text-[color:var(--color-fg)]">{totalOrders}</div>
                </div>
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="text-xs text-[color:var(--color-fg-muted)]">Ticket Promedio</div>
                  <div className="text-2xl font-bold text-[color:var(--color-fg)]">${avgTicket.toFixed(2)}</div>
                </div>
              </div>

              {/* Payment method totals */}
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="text-xs text-green-400">Efectivo</div>
                  <div className="text-xl font-bold text-green-400">${totalCash.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="text-xs text-blue-400">Tarjeta</div>
                  <div className="text-xl font-bold text-blue-400">${totalCard.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="text-xs text-purple-400">Transferencia</div>
                  <div className="text-xl font-bold text-purple-400">${totalTransfer.toFixed(2)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[color:var(--color-fg)]">Ventas por Dia</h3>
                  <ExportButtons onCsv={exportSalesCsv} onPdf={exportSalesPdf} />
                </div>
                <SalesChart data={dailySales.map((d) => ({ label: d.date.slice(5), value: d.total }))} />

                {/* Daily breakdown table */}
                {dailySales.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[color:var(--color-border)] text-left text-xs text-[color:var(--color-fg-subtle)]">
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
                          <tr key={d.date} className="border-b border-[color:var(--color-border)]/50">
                            <td className="py-2 text-[color:var(--color-fg-muted)]">{d.date}</td>
                            <td className="py-2 text-right font-medium text-[color:var(--color-accent)]">${d.total.toFixed(2)}</td>
                            <td className="py-2 text-right text-green-400">${d.cash.toFixed(2)}</td>
                            <td className="py-2 text-right text-blue-400">${d.card.toFixed(2)}</td>
                            <td className="py-2 text-right text-purple-400">${d.transfer.toFixed(2)}</td>
                            <td className="py-2 text-right text-[color:var(--color-fg-muted)]">{d.orderCount}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td className="pt-2 text-[color:var(--color-fg)]">Total</td>
                          <td className="pt-2 text-right text-[color:var(--color-accent)]">${totalSales.toFixed(2)}</td>
                          <td className="pt-2 text-right text-green-400">${totalCash.toFixed(2)}</td>
                          <td className="pt-2 text-right text-blue-400">${totalCard.toFixed(2)}</td>
                          <td className="pt-2 text-right text-purple-400">${totalTransfer.toFixed(2)}</td>
                          <td className="pt-2 text-right text-[color:var(--color-fg-muted)]">{totalOrders}</td>
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
                    <div key={ld.lineId} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                      <h3 className="mb-3 text-sm font-bold text-[color:var(--color-fg)]">{ld.lineName} — Más Vendidos</h3>
                      <TopProductsList products={ld.topProducts} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-4 py-3">
                    <span className="text-sm font-semibold text-[color:var(--color-fg)]">
                      Exportar consolidado + desglose por línea
                    </span>
                    <ExportButtons onCsv={exportProductsCsv} onPdf={exportProductsPdf} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[color:var(--color-fg)]">Productos Más Vendidos</h3>
                    <ExportButtons onCsv={exportProductsCsv} onPdf={exportProductsPdf} />
                  </div>
                  <TopProductsList products={topProducts} />
                </div>
              )}
            </div>
          )}

          {/* ========== PAYMENTS ========== */}
          {tab === 'payments' && (
            <div>
              {showPerLine ? (
                <div className="flex flex-col gap-6">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                      <h3 className="mb-3 text-sm font-bold text-[color:var(--color-fg)]">{ld.lineName} — Métodos de Pago</h3>
                      <PaymentsList methods={ld.paymentMethods} />
                    </div>
                  ))}
                  <PerLineExportRow onCsv={exportPaymentsCsv} onPdf={exportPaymentsPdf} />
                </div>
              ) : (
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[color:var(--color-fg)]">Ventas por Método de Pago</h3>
                    <ExportButtons onCsv={exportPaymentsCsv} onPdf={exportPaymentsPdf} />
                  </div>
                  <PaymentsList methods={paymentMethods} />
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
                    <div key={ld.lineId} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                      <h3 className="mb-3 text-sm font-bold text-[color:var(--color-fg)]">{ld.lineName} — Horas Pico</h3>
                      <HoursList data={ld.hourlySales} />
                    </div>
                  ))}
                  <PerLineExportRow onCsv={exportHoursCsv} onPdf={exportHoursPdf} />
                </div>
              ) : (
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[color:var(--color-fg)]">Ventas por Hora</h3>
                    <ExportButtons onCsv={exportHoursCsv} onPdf={exportHoursPdf} />
                  </div>
                  <HoursList data={hourlySales} />
                </div>
              )}
            </div>
          )}

          {/* ========== STAFF ========== */}
          {tab === 'staff' && (
            <div>
              {showPerLine ? (
                <div className="flex flex-col gap-6">
                  {perLineData.map((ld) => (
                    <div key={ld.lineId} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                      <h3 className="mb-3 text-sm font-bold text-[color:var(--color-fg)]">{ld.lineName} — Por Personal</h3>
                      <StaffList data={ld.staffSales} roleLabel={roleLabel} />
                    </div>
                  ))}
                  <PerLineExportRow onCsv={exportStaffCsv} onPdf={exportStaffPdf} />
                </div>
              ) : (
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[color:var(--color-fg)]">Ventas por Personal</h3>
                    <ExportButtons onCsv={exportStaffCsv} onPdf={exportStaffPdf} />
                  </div>
                  <StaffList data={staffSales} roleLabel={roleLabel} />
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
                    <div key={ld.lineId} className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                      <h3 className="mb-3 text-sm font-bold text-[color:var(--color-fg)]">{ld.lineName} — Cortes</h3>
                      <CutsList cuts={ld.cashCuts} />
                    </div>
                  ))}
                  <PerLineExportRow onCsv={exportCutsCsv} onPdf={exportCutsPdf} />
                </div>
              ) : (
                <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[color:var(--color-fg)]">Historial de Cortes</h3>
                    <ExportButtons onCsv={exportCutsCsv} onPdf={exportCutsPdf} />
                  </div>
                  <CutsList cuts={cashCuts} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TopProductsList({ products }: { products: ProductSales[] }) {
  if (products.length === 0) return <EmptyState message="Sin ventas para el periodo seleccionado" />;
  const maxQty = Math.max(...products.map((p) => p.totalQty));
  const totalQty = products.reduce((s, p) => s + p.totalQty, 0);
  return (
    <ol className="flex flex-col gap-2">
      {products.map((p, i) => {
        const pct = (p.totalQty / maxQty) * 100;
        const share = totalQty === 0 ? 0 : (p.totalQty / totalQty) * 100;
        return (
          <RankedCard
            key={p.name}
            rank={i + 1}
            isTop={i === 0}
            title={p.name}
            right={
              <>
                <span className="text-base font-bold text-[color:var(--color-fg)]">
                  {p.totalQty} <span className="text-xs font-normal text-[color:var(--color-fg-subtle)]">uds</span>
                </span>
                <span className="text-xs text-[color:var(--color-accent)]">
                  ${p.totalRevenue.toFixed(2)}
                </span>
                <span className="w-12 text-right text-xs text-[color:var(--color-fg-subtle)]">
                  {share.toFixed(1)}%
                </span>
              </>
            }
            pct={pct}
          />
        );
      })}
    </ol>
  );
}

function PerLineExportRow({ onCsv, onPdf }: { onCsv: () => void; onPdf: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-4 py-3">
      <span className="text-sm font-semibold text-[color:var(--color-fg)]">
        Exportar consolidado + desglose por línea
      </span>
      <ExportButtons onCsv={onCsv} onPdf={onPdf} />
    </div>
  );
}

function RankedCard({
  rank,
  isTop,
  title,
  subtitle,
  right,
  pct,
}: {
  rank: number;
  isTop: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right: React.ReactNode;
  pct: number;
}) {
  return (
    <li className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums
            ${isTop
              ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]'
              : 'bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]'}`}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold text-[color:var(--color-fg)]">{title}</div>
              {subtitle && (
                <div className="mt-0.5 text-xs text-[color:var(--color-fg-subtle)]">{subtitle}</div>
              )}
            </div>
            <div className="flex items-baseline gap-3 font-mono tabular-nums">{right}</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[color:var(--color-bg-inset)]">
            <div
              className="h-full rounded-full bg-[color:var(--color-accent)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-[color:var(--color-fg-subtle)]">{message}</p>
  );
}

function PaymentsList({ methods }: { methods: PaymentMethodSales[] }) {
  if (methods.length === 0) return <EmptyState message="Sin ventas para el periodo seleccionado" />;
  const maxTotal = Math.max(...methods.map((m) => m.total));
  const grandTotal = methods.reduce((s, m) => s + m.total, 0);
  return (
    <ol className="flex flex-col gap-2">
      {methods.map((pm, i) => {
        const pct = maxTotal === 0 ? 0 : (pm.total / maxTotal) * 100;
        const share = grandTotal === 0 ? 0 : (pm.total / grandTotal) * 100;
        return (
          <RankedCard
            key={pm.method}
            rank={i + 1}
            isTop={i === 0}
            title={pm.method}
            subtitle={`${pm.count} transacciones`}
            right={
              <>
                <span className="text-base font-bold text-[color:var(--color-accent)]">
                  ${pm.total.toFixed(2)}
                </span>
                <span className="w-12 text-right text-xs text-[color:var(--color-fg-subtle)]">
                  {share.toFixed(1)}%
                </span>
              </>
            }
            pct={pct}
          />
        );
      })}
    </ol>
  );
}

function StaffList({
  data,
  roleLabel,
}: {
  data: StaffSales[];
  roleLabel: (r: string) => string;
}) {
  if (data.length === 0) return <EmptyState message="Sin ventas asignadas a personal en el rango seleccionado" />;
  const maxSales = Math.max(...data.map((s) => s.totalSales));
  const grandTotal = data.reduce((s, x) => s + x.totalSales, 0);
  return (
    <ol className="flex flex-col gap-2">
      {data.map((s, i) => {
        const pct = maxSales === 0 ? 0 : (s.totalSales / maxSales) * 100;
        const share = grandTotal === 0 ? 0 : (s.totalSales / grandTotal) * 100;
        return (
          <RankedCard
            key={s.profileId}
            rank={i + 1}
            isTop={i === 0}
            title={s.name}
            subtitle={`${roleLabel(s.role)} · ${s.orderCount} órdenes · Ticket prom. $${s.avgTicket.toFixed(2)}`}
            right={
              <>
                <span className="text-base font-bold text-[color:var(--color-accent)]">
                  ${s.totalSales.toFixed(2)}
                </span>
                <span className="w-12 text-right text-xs text-[color:var(--color-fg-subtle)]">
                  {share.toFixed(1)}%
                </span>
              </>
            }
            pct={pct}
          />
        );
      })}
    </ol>
  );
}

function HoursList({ data }: { data: HourlySales[] }) {
  if (data.length === 0) return <EmptyState message="Sin ventas para el periodo seleccionado" />;
  const maxTotal = Math.max(...data.map((h) => h.total));
  return (
    <div className="flex flex-col gap-1.5">
      {data.map((h) => {
        const pct = maxTotal === 0 ? 0 : (h.total / maxTotal) * 100;
        return (
          <div key={h.hour} className="flex items-center gap-3">
            <span className="w-14 shrink-0 font-mono text-xs font-semibold tabular-nums text-[color:var(--color-fg-muted)]">
              {String(h.hour).padStart(2, '0')}:00
            </span>
            <div className="flex-1">
              <div className="h-6 overflow-hidden rounded bg-[color:var(--color-bg-inset)]">
                <div
                  className="h-full rounded bg-[color:var(--color-accent)] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="w-20 shrink-0 text-right font-mono text-xs font-semibold tabular-nums text-[color:var(--color-fg)]">
              ${h.total.toFixed(2)}
            </span>
            <span className="w-14 shrink-0 text-right text-xs text-[color:var(--color-fg-subtle)]">
              {h.count} ord.
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CutsList({ cuts }: { cuts: CashCutSummary[] }) {
  if (cuts.length === 0) return <EmptyState message="No hay cortes registrados" />;
  return (
    <ol className="flex flex-col gap-2">
      {cuts.map((cut, i) => (
        <CutRow key={cut.id} cut={cut} rank={i + 1} />
      ))}
    </ol>
  );
}

function CutRow({ cut, rank }: { cut: CashCutSummary; rank: number }) {
  const balanced = cut.difference === 0;
  const positive = cut.difference > 0;
  const diffClass = balanced
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    : positive
      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
      : 'bg-red-500/15 text-red-600 dark:text-red-400';
  return (
    <li className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-inset)] font-mono text-xs font-bold tabular-nums text-[color:var(--color-fg-muted)]">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[color:var(--color-fg)]">
                {new Date(cut.openedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="mt-0.5 text-xs text-[color:var(--color-fg-subtle)]">
                {cut.openerName || '—'} · {new Date(cut.openedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {new Date(cut.closedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${diffClass}`}>
              {balanced ? 'Cuadra' : `${positive ? '+' : ''}$${cut.difference.toFixed(2)}`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center sm:grid-cols-4">
            <CutMetric label="Apertura" value={`$${cut.openingAmount.toFixed(2)}`} />
            <CutMetric label="Esperado" value={`$${cut.expected.toFixed(2)}`} />
            <CutMetric label="Real" value={`$${cut.closingAmount.toFixed(2)}`} accent />
            <CutMetric label="Operador" value={cut.openerName || '—'} />
          </div>
        </div>
      </div>
    </li>
  );
}

function CutMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-sm font-semibold tabular-nums ${accent ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-fg)]'}`}>
        {value}
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

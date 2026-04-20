interface BarData {
  label: string;
  value: number;
}

interface SalesChartProps {
  data: BarData[];
  formatValue?: (val: number) => string;
  color?: string;
}

export function SalesChart({
  data,
  formatValue = (v) => `$${v.toFixed(2)}`,
  color = 'bg-[color:var(--color-accent)]',
}: SalesChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[color:var(--color-fg-subtle)]">Sin datos para el periodo seleccionado</p>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-right text-xs text-[color:var(--color-fg-muted)] truncate" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1">
            <div className="h-6 overflow-hidden rounded bg-[color:var(--color-bg-inset)]">
              <div
                className={`h-full rounded ${color} transition-all duration-300`}
                style={{ width: `${(item.value / maxVal) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-24 shrink-0 text-right text-xs font-medium text-[color:var(--color-fg-muted)]">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

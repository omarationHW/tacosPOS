interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  onPreset: (preset: 'today' | 'week' | 'month') => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onPreset,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {[
          { key: 'today' as const, label: 'Hoy' },
          { key: 'week' as const, label: 'Semana' },
          { key: 'month' as const, label: 'Mes' },
        ].map((preset) => (
          <button
            key={preset.key}
            onClick={() => onPreset(preset.key)}
            className="cursor-pointer rounded-lg bg-[color:var(--color-bg-inset)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-fg-muted)] transition-colors
              hover:bg-[color:var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-1.5 text-sm text-[color:var(--color-fg)]
          focus:border-[color:var(--color-accent)] focus:outline-none"
      />
      <span className="text-[color:var(--color-fg-subtle)]">-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-1.5 text-sm text-[color:var(--color-fg)]
          focus:border-[color:var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}

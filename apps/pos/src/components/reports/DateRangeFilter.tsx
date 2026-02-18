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
            className="cursor-pointer rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors
              hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100
          focus:border-amber-500 focus:outline-none"
      />
      <span className="text-gray-500">-</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100
          focus:border-amber-500 focus:outline-none"
      />
    </div>
  );
}

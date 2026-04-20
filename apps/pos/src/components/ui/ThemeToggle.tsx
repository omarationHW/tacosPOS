import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const MODES = [
  { key: 'light',  label: 'Claro',    icon: Sun },
  { key: 'system', label: 'Sistema',  icon: Monitor },
  { key: 'dark',   label: 'Oscuro',   icon: Moon },
] as const;

interface ThemeToggleProps {
  /** When true, render as a single icon cycling through modes (for tight spaces). */
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { mode, setMode } = useTheme();

  if (collapsed) {
    const current = MODES.find((m) => m.key === mode) ?? MODES[1];
    const nextIdx = (MODES.indexOf(current) + 1) % MODES.length;
    const Icon = current.icon;
    return (
      <button
        onClick={() => setMode(MODES[nextIdx].key)}
        title={`Tema: ${current.label} · click para cambiar`}
        aria-label={`Tema actual: ${current.label}. Click para cambiar.`}
        className="flex h-9 w-full cursor-pointer items-center justify-center rounded-lg text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
      >
        <Icon size={18} />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema visual"
      className="flex rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-inset)] p-0.5"
    >
      {MODES.map(({ key, label, icon: Icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            onClick={() => setMode(key)}
            role="radio"
            aria-checked={active}
            title={label}
            aria-label={label}
            className={`flex h-8 flex-1 cursor-pointer items-center justify-center rounded-full transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
              ${active
                ? 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)] shadow-sm'
                : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
              }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

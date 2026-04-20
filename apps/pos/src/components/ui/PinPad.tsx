import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Delete } from 'lucide-react';

interface PinPadProps {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  onComplete?: (pin: string) => void;
  /** Shows a shake animation + resets value when this changes to true */
  errorSignal?: number;
  disabled?: boolean;
  /** Visual density — "sm" fits in tighter layouts (e.g. tablet landscape login). */
  size?: 'sm' | 'md';
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const SIZE = {
  sm: { key: 56, gap: 'gap-3', stack: 'gap-6', dot: 'h-4 w-4', dotGap: 'gap-4' },
  md: { key: 72, gap: 'gap-4', stack: 'gap-8', dot: 'h-5 w-5', dotGap: 'gap-5' },
} as const;

export function PinPad({
  length = 4,
  value,
  onChange,
  onComplete,
  errorSignal = 0,
  disabled = false,
  size = 'md',
}: PinPadProps) {
  const [shaking, setShaking] = useState(false);
  const s = SIZE[size];

  useEffect(() => {
    if (errorSignal === 0) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 500);
    return () => clearTimeout(t);
  }, [errorSignal]);

  const press = (digit: string) => {
    if (disabled || value.length >= length) return;
    const next = value + digit;
    onChange(next);
    if (next.length === length) {
      onComplete?.(next);
    }
  };

  const erase = () => {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') erase();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled]);

  const dots = useMemo(() => Array.from({ length }, (_, i) => i < value.length), [value, length]);

  return (
    <div className={`flex flex-col items-center ${s.stack}`}>
      <motion.div
        animate={shaking ? { x: [0, -12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className={`flex items-center ${s.dotGap}`}
        aria-label={`PIN de ${length} dígitos`}
      >
        {dots.map((filled, i) => (
          <motion.span
            key={i}
            className={`relative inline-flex ${s.dot} items-center justify-center rounded-full border-2`}
            animate={{
              borderColor: shaking
                ? 'var(--color-danger)'
                : filled
                  ? 'var(--color-accent)'
                  : 'var(--color-border-strong)',
              backgroundColor: filled
                ? shaking
                  ? 'var(--color-danger)'
                  : 'var(--color-accent)'
                : 'transparent',
              scale: filled ? 1.1 : 1,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        ))}
      </motion.div>

      <div className={`grid grid-cols-3 ${s.gap}`}>
        {KEYS.map((k) => (
          <KeypadButton key={k} sizePx={s.key} onPress={() => press(k)} disabled={disabled}>
            {k}
          </KeypadButton>
        ))}
        <div aria-hidden style={{ height: s.key, width: s.key }} />
        <KeypadButton sizePx={s.key} onPress={() => press('0')} disabled={disabled}>
          0
        </KeypadButton>
        <KeypadButton
          sizePx={s.key}
          onPress={erase}
          disabled={disabled || value.length === 0}
          variant="icon"
          ariaLabel="Borrar último dígito"
        >
          <Delete size={size === 'sm' ? 20 : 24} />
        </KeypadButton>
      </div>

      <div className="h-5">
        <AnimatePresence>
          {shaking && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium text-[color:var(--color-danger)]"
            >
              PIN incorrecto
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onPress,
  disabled,
  variant = 'digit',
  ariaLabel,
  sizePx,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'digit' | 'icon';
  ariaLabel?: string;
  sizePx: number;
}) {
  return (
    <motion.button
      onClick={onPress}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      style={{ height: sizePx, width: sizePx }}
      className={`flex cursor-pointer select-none items-center justify-center rounded-full border text-2xl font-medium transition-colors
        disabled:cursor-not-allowed disabled:opacity-40
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]
        ${variant === 'digit'
          ? 'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-inset)]'
          : 'border-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]'
        }`}
    >
      {children}
    </motion.button>
  );
}

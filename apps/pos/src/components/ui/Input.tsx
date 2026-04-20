import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[color:var(--color-fg-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-3 py-2.5 text-[color:var(--color-fg)]
            placeholder:text-[color:var(--color-fg-subtle)] transition-colors
            focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent-ring)]
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : helper ? (
          <p className="text-xs text-[color:var(--color-fg-subtle)]">{helper}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      className={`rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-4 shadow-sm
        ${onClick ? 'cursor-pointer transition-colors hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-bg-inset)]' : ''}
        ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

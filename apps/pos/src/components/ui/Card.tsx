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
      className={`rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-sm
        ${onClick ? 'cursor-pointer transition-colors hover:border-gray-600 hover:bg-gray-750' : ''}
        ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

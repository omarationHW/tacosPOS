import { useBusinessLine } from '@/contexts/BusinessLineContext';

/** Returns the resolved business_line_id or null (for 'all') — reactive to context changes */
export function useLineFilter(): string | null {
  const { activeBusinessLine, isAllLines } = useBusinessLine();
  if (isAllLines) return null;
  return activeBusinessLine?.id ?? null;
}

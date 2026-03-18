import { Navigate } from 'react-router';
import { useBusinessLine } from '@/contexts/BusinessLineContext';

interface Props {
  children: React.ReactNode;
}

export function BusinessLineGuard({ children }: Props) {
  const { activeBusinessLine, isAllLines } = useBusinessLine();

  if (!activeBusinessLine && !isAllLines) {
    return <Navigate to="/select-line" replace />;
  }

  return <>{children}</>;
}

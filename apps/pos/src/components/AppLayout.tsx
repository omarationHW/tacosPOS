import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { useBusinessLine } from '@/contexts/BusinessLineContext';

export function AppLayout() {
  const { activeBusinessLine, isAllLines } = useBusinessLine();

  useEffect(() => {
    const body = document.body;
    body.classList.remove('line-hamburguesas', 'line-carnitas', 'line-all');
    if (isAllLines) body.classList.add('line-all');
    else if (activeBusinessLine?.slug === 'hamburguesas') body.classList.add('line-hamburguesas');
    else if (activeBusinessLine?.slug === 'carnitas') body.classList.add('line-carnitas');
  }, [activeBusinessLine, isAllLines]);

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[color:var(--color-bg)] p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}

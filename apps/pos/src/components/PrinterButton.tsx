import { Printer, PrinterCheck, Loader2 } from 'lucide-react';
import { usePrinter } from '@/contexts/PrinterContext';

/**
 * Control de la impresora.
 *
 * Vive en el Sidebar además de en Cocina: cuando el negocio opera con UNA sola
 * tablet, la caja tiene que poder enlazar la impresora sin ir a la pantalla de
 * Cocina. Si ninguna tablet está enlazada, la comanda automática no sale — de
 * ahí que el estado "desconectada" se muestre en ámbar y no en gris: es una
 * advertencia, no un dato neutro.
 *
 * - `variant="pill"`: cápsula suelta (encabezado de Cocina).
 * - `variant="nav"`: fila del menú lateral.
 */
export function PrinterButton({
  variant = 'pill',
  collapsed = false,
}: {
  variant?: 'pill' | 'nav';
  collapsed?: boolean;
}) {
  const { status, deviceName, connect, disconnect } = usePrinter();
  const isNav = variant === 'nav';

  if (status === 'unsupported') {
    if (isNav) return null; // en el menú no aporta nada: no hay nada que hacer
    return (
      <span className="text-sm text-[color:var(--color-fg-subtle)]">
        Impresión no disponible en este navegador
      </span>
    );
  }

  const base = isNav
    ? 'flex w-full cursor-pointer items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)] ' +
      (collapsed ? 'justify-center px-0' : 'justify-center px-0 lg:justify-start lg:px-3')
    : 'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium';

  const label = (text: string) =>
    isNav ? (
      collapsed ? null : <span className="hidden lg:inline">{text}</span>
    ) : (
      text
    );

  if (status === 'connected') {
    return (
      <button
        onClick={disconnect}
        title={deviceName ?? 'Impresora conectada'}
        className={`${base} ${
          isNav
            ? 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`}
      >
        <PrinterCheck size={isNav ? 20 : 16} />
        {label('Impresora lista')}
      </button>
    );
  }

  if (status === 'connecting') {
    return (
      <button
        disabled
        className={`${base} ${
          isNav
            ? 'text-[color:var(--color-fg-muted)]'
            : 'border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-[color:var(--color-fg)] opacity-60'
        }`}
      >
        <Loader2 size={isNav ? 20 : 16} className="animate-spin" />
        {label('Conectando…')}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      title="Sin impresora: las comandas no se imprimen solas. Toca para conectar."
      className={`${base} ${
        isNav
          ? 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
      }`}
    >
      <Printer size={isNav ? 20 : 16} />
      {label('Conectar impresora')}
    </button>
  );
}

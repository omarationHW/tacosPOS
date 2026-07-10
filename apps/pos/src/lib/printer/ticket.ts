// ============================================================
// Constructor de la COMANDA DE COCINA (bytes ESC/POS) para navegador.
// Reutiliza el formato validado del print-agent, con logo.
// ============================================================

import { CMD, SEP, build, centerText, formatRow } from './escpos';
import { LOGO_RASTER } from './logo';

export interface ComandaItem {
  quantity: number;
  product_name: string;
  notes?: string | null;
  modifiers?: { name: string }[];
}

export interface ComandaOrder {
  id: string;
  daily_order_number: number | null;
  order_type: 'dine_in' | 'takeout' | 'delivery';
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  pickup_at?: string | null;
  table_name?: string | null;
  business_line_name?: string | null;
  items: ComandaItem[];
  appended?: boolean;
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: 'COMER AQUI',
  takeout: 'PARA LLEVAR',
  delivery: 'A DOMICILIO',
};

function shortTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/** Construye los bytes ESC/POS de la comanda (con logo). */
export function buildComanda(order: ComandaOrder): Uint8Array {
  const parts: Array<number[] | string> = [];
  parts.push(CMD.INIT, CMD.CODEPAGE);

  // Logo (ya centrado por relleno) + título.
  parts.push(LOGO_RASTER, '\n');
  parts.push(CMD.CENTER, CMD.BOLD_ON, 'COMANDA COCINA\n', CMD.BOLD_OFF, CMD.LEFT);
  if (order.business_line_name) {
    parts.push(order.business_line_name.toUpperCase() + '\n');
  }

  // Datos del pedido
  parts.push(SEP + '\n');
  const orderLabel =
    order.daily_order_number != null
      ? `#${order.daily_order_number}`
      : `#${order.id.slice(0, 6).toUpperCase()}`;
  const tipo = ORDER_TYPE_LABEL[order.order_type] ?? '';
  parts.push(formatRow(`Orden: ${orderLabel}`, tipo) + '\n');
  if (order.table_name) parts.push(`Mesa: ${order.table_name}\n`);
  if (order.customer_name) parts.push(`Cliente: ${order.customer_name}\n`);
  parts.push(formatRow('Hora:', shortTime(order.created_at)) + '\n');
  if (order.pickup_at) parts.push(formatRow('Entrega:', shortTime(order.pickup_at)) + '\n');

  // Items
  parts.push(SEP + '\n');
  for (const item of order.items) {
    parts.push(CMD.BOLD_ON, `${item.quantity}x ${item.product_name}\n`, CMD.BOLD_OFF);
    for (const mod of item.modifiers ?? []) parts.push(`   + ${mod.name}\n`);
    if (item.notes) parts.push(`   >> ${item.notes}\n`);
  }
  parts.push(SEP + '\n');

  // Nota del pedido
  if (order.notes) {
    parts.push(`Nota: ${order.notes}\n`);
    parts.push(SEP + '\n');
  }

  // Pie
  const stamp = order.appended ? '*** AGREGADO ***' : '*** NUEVA ***';
  parts.push(CMD.CENTER, CMD.BOLD_ON, centerText(stamp) + '\n', CMD.BOLD_OFF, CMD.LEFT);
  parts.push(CMD.feed(4), CMD.CUT);

  return build(parts);
}

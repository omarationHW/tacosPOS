// ============================================================
// Constructor de la COMANDA DE COCINA (bytes ESC/POS) para navegador.
// Reutiliza el formato validado del print-agent, con logo.
// ============================================================

import { CMD, SEP, build, centerText, formatRow } from './escpos';
import { LOGO_RASTER } from './logo';
import { orderNoteText } from '../orderNotes';

export interface ComandaItem {
  quantity: number;
  product_name: string;
  notes?: string | null;
  modifiers?: { name: string; group?: string | null }[];
  /** Total de la línea (precio × cantidad, incluye modificadores). */
  subtotal?: number;
  /** Categoría del producto: distingue los pedidos "por monto", que se empacan
   *  siempre y por lo tanto sí llevan salsas y verdura en la comanda. */
  category_name?: string | null;
}

// Grupos que se ocultan en pedidos "Comer Aquí" (dine_in), igual que en la
// pantalla de cocina (KitchenItemRow). "Con todo" pertenece a "Verdura".
const HIDDEN_GROUPS_DINE_IN = new Set(['verdura', 'acompañamientos']);

function visibleModifiers(item: ComandaItem, orderType: string) {
  const mods = item.modifiers ?? [];
  // Un pedido por monto se empaca aunque sea "aquí": en caja SÍ se preguntan
  // salsas y verdura (ver MontoModal / ModifierModal), así que ocultarlas en la
  // comanda dejaba a cocina sin la mitad de la instrucción.
  const alwaysPacked = (item.category_name ?? '').toLowerCase().includes('monto');
  if (orderType !== 'dine_in' || alwaysPacked) return mods;
  return mods.filter((m) => !HIDDEN_GROUPS_DINE_IN.has((m.group ?? '').trim().toLowerCase()));
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
  /** Cajero que tomó la orden. Se imprime como "Atendió:". */
  cashier_name?: string | null;
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
  if (order.cashier_name) parts.push(`Atendio: ${order.cashier_name}\n`);
  parts.push(formatRow('Hora:', shortTime(order.created_at)) + '\n');
  if (order.pickup_at) parts.push(formatRow('Entrega:', shortTime(order.pickup_at)) + '\n');

  // Items
  parts.push(SEP + '\n');
  for (const item of order.items) {
    parts.push(CMD.BOLD_ON, `${item.quantity}x ${item.product_name}\n`, CMD.BOLD_OFF);
    for (const mod of visibleModifiers(item, order.order_type)) parts.push(`   + ${mod.name}\n`);
    if (item.notes) parts.push(`   >> ${item.notes}\n`);
  }
  parts.push(SEP + '\n');

  // Total (suma de los productos de esta comanda)
  const total = order.items.reduce((sum, it) => sum + (it.subtotal ?? 0), 0);
  if (total > 0) {
    parts.push(CMD.BOLD_ON, formatRow('TOTAL:', `$${total.toFixed(2)}`) + '\n', CMD.BOLD_OFF);
    parts.push(SEP + '\n');
  }

  // Nota del pedido (resaltada: es una indicación para cocina).
  const orderNote = orderNoteText(order.notes);
  if (orderNote) {
    parts.push(CMD.BOLD_ON, `NOTA: ${orderNote}\n`, CMD.BOLD_OFF);
    parts.push(SEP + '\n');
  }

  // Pie
  const stamp = order.appended ? '*** AGREGADO ***' : '*** NUEVA ***';
  parts.push(CMD.CENTER, CMD.BOLD_ON, centerText(stamp) + '\n', CMD.BOLD_OFF, CMD.LEFT);
  // Pie más largo para que sea fácil de cortar/tomar.
  parts.push(CMD.feed(8), CMD.CUT);

  return build(parts);
}

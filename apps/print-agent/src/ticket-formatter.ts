// ============================================================
// Kitchen Ticket Formatter
// ============================================================
// Formats order data into a plain-text ticket suitable for
// thermal printing via ESC/POS commands.
//
// Ticket layout (58mm / 32 char width):
//
//   ================================
//        TAQUERIA LA ANDALUZA
//           COMANDA COCINA
//   ================================
//   Orden: #ABC123
//   Mesa: Mesa 3           Comer Aqui
//   Hora: 14:35
//   --------------------------------
//   2x Taco al Pastor
//      + Extra cebolla
//      + Sin cilantro
//   1x Quesadilla Queso
//   3x Agua de Horchata
//   --------------------------------
//           *** NUEVA ***
//   ================================
//
// ============================================================

import { COMMANDS, formatRow } from './escpos';

interface TicketOrderItem {
  quantity: number;
  unit_price: number;
  product: { name: string } | { name: string }[];
  order_item_modifiers?: { modifier_name: string; price_override: number }[];
}

interface TicketOrder {
  id: string;
  notes: string | null;
  order_type: 'dine_in' | 'takeout';
  created_at: string;
  table?: { name: string } | { name: string }[] | null;
  order_items: TicketOrderItem[];
}

const WIDTH = 32;

export function formatKitchenTicket(order: TicketOrder): string {
  const lines: string[] = [];
  const shortId = order.id.slice(0, 6).toUpperCase();
  const time = new Date(order.created_at).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const table = Array.isArray(order.table) ? order.table[0] : order.table;
  const tableName = table?.name ?? null;
  const orderTypeLabel = order.order_type === 'takeout' ? 'PARA LLEVAR' : 'COMER AQUI';

  // Header
  lines.push(COMMANDS.DOUBLE_LINE);
  lines.push(centerText('TAQUERIA LA ANDALUZA'));
  lines.push(centerText('COMANDA COCINA'));
  lines.push(COMMANDS.DOUBLE_LINE);

  // Order info
  lines.push(formatRow('Orden:', `#${shortId}`, WIDTH));
  if (tableName) {
    lines.push(formatRow('Mesa:', tableName, WIDTH));
  }
  lines.push(formatRow('Tipo:', orderTypeLabel, WIDTH));
  lines.push(formatRow('Hora:', time, WIDTH));

  if (order.notes && order.notes !== tableName && order.notes !== 'Para Llevar') {
    lines.push(`Nota: ${order.notes}`);
  }

  lines.push(COMMANDS.LINE);

  // Items
  for (const item of order.order_items) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const name = product?.name ?? 'Producto';
    lines.push(`${item.quantity}x ${name}`);

    // Modifiers
    if (item.order_item_modifiers) {
      for (const mod of item.order_item_modifiers) {
        const priceStr = mod.price_override > 0 ? ` +$${mod.price_override.toFixed(2)}` : '';
        lines.push(`   + ${mod.modifier_name}${priceStr}`);
      }
    }
  }

  lines.push(COMMANDS.LINE);
  lines.push(centerText('*** NUEVA ***'));
  lines.push(COMMANDS.DOUBLE_LINE);
  lines.push(''); // Extra blank line before cut

  return lines.join('\n');
}

// /**
//  * Format a customer receipt (with prices and totals)
//  * TODO: Uncomment and customize when ready for customer receipts
//  */
// export function formatCustomerReceipt(order: TicketOrder & {
//   subtotal: number;
//   tax: number;
//   total: number;
//   discount: number;
//   tip: number;
//   payment_method: string;
// }): string {
//   const lines: string[] = [];
//   const shortId = order.id.slice(0, 6).toUpperCase();
//
//   lines.push(COMMANDS.DOUBLE_LINE);
//   lines.push(centerText('TAQUERIA LA ANDALUZA'));
//   lines.push(centerText('Ticket de Venta'));
//   lines.push(COMMANDS.DOUBLE_LINE);
//
//   lines.push(formatRow('Orden:', `#${shortId}`, WIDTH));
//   lines.push(formatRow('Fecha:', new Date(order.created_at).toLocaleDateString('es-MX'), WIDTH));
//   lines.push(COMMANDS.LINE);
//
//   for (const item of order.order_items) {
//     const product = Array.isArray(item.product) ? item.product[0] : item.product;
//     const name = product?.name ?? 'Producto';
//     const total = item.quantity * item.unit_price;
//     lines.push(formatRow(`${item.quantity}x ${name}`, `$${total.toFixed(2)}`, WIDTH));
//   }
//
//   lines.push(COMMANDS.LINE);
//   lines.push(formatRow('Subtotal:', `$${order.subtotal.toFixed(2)}`, WIDTH));
//   lines.push(formatRow('IVA 16%:', `$${order.tax.toFixed(2)}`, WIDTH));
//
//   if (order.discount > 0) {
//     lines.push(formatRow('Descuento:', `-$${order.discount.toFixed(2)}`, WIDTH));
//   }
//   if (order.tip > 0) {
//     lines.push(formatRow('Propina:', `$${order.tip.toFixed(2)}`, WIDTH));
//   }
//
//   lines.push(COMMANDS.DOUBLE_LINE);
//   lines.push(formatRow('TOTAL:', `$${order.total.toFixed(2)}`, WIDTH));
//   lines.push(COMMANDS.DOUBLE_LINE);
//
//   const methodLabel = order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta';
//   lines.push(formatRow('Pago:', methodLabel, WIDTH));
//
//   lines.push('');
//   lines.push(centerText('Gracias por su preferencia'));
//   lines.push(centerText('Taqueria La Andaluza'));
//   lines.push('');
//
//   return lines.join('\n');
// }

function centerText(text: string): string {
  if (text.length >= WIDTH) return text.slice(0, WIDTH);
  const padding = Math.floor((WIDTH - text.length) / 2);
  return ' '.repeat(padding) + text;
}

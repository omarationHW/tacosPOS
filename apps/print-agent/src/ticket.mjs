// ============================================================
// Formateo de la COMANDA DE COCINA (ESC/POS, 48 chars, 80mm)
// ============================================================
// Se construye como un único string con \n explícitos (patrón probado
// en test-comanda.mjs). Los separadores son cortos a propósito: una
// barra sólida de ancho completo atora la ANJET80.

import { CMD, SEP, formatRow, centerText } from './escpos.mjs';
import { LOGO_RASTER } from './logo.mjs';

const ORDER_TYPE_LABEL = {
  dine_in: 'COMER AQUI',
  takeout: 'PARA LLEVAR',
  delivery: 'A DOMICILIO',
};

/** Hora corta HH:MM (24h). */
function shortTime(iso) {
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

/**
 * Construye una comanda de cocina imprimible.
 *
 * @param {object}   p
 * @param {string}   p.restaurantName
 * @param {object}   p.order   { id, daily_order_number, order_type, customer_name,
 *                               notes, created_at, pickup_at, table_name, business_line_name }
 * @param {Array}    p.items   [{ quantity, notes, product_name, modifiers:[{name, group}] }]
 * @param {boolean} [p.appended] true si son items agregados a un pedido existente
 * @returns {string} contenido ESC/POS (latin1)
 */
export function formatComanda({ restaurantName, order, items, appended = false }) {
  let t = CMD.INIT + CMD.CODEPAGE;

  // Cabecera: logo (ya centrado por relleno en logo.mjs) + título.
  // El logo incluye "La Andaluza / Cortes Premium", así que no repetimos
  // el nombre como texto. Si algún día no hay logo, usar restaurantName.
  t += LOGO_RASTER + '\n';
  t += CMD.CENTER + CMD.BOLD_ON + 'COMANDA COCINA\n' + CMD.BOLD_OFF + CMD.LEFT;
  if (order.business_line_name) {
    t += String(order.business_line_name).toUpperCase() + '\n';
  }

  // Datos del pedido
  t += CMD.LEFT + SEP + '\n';
  const orderLabel =
    order.daily_order_number != null
      ? `#${order.daily_order_number}`
      : `#${String(order.id ?? '').slice(0, 6).toUpperCase()}`;
  const tipo = ORDER_TYPE_LABEL[order.order_type] ?? '';
  t += formatRow(`Orden: ${orderLabel}`, tipo) + '\n';
  if (order.table_name) t += `Mesa: ${order.table_name}\n`;
  if (order.customer_name) t += `Cliente: ${order.customer_name}\n`;
  t += formatRow('Hora:', shortTime(order.created_at)) + '\n';
  if (order.pickup_at) t += formatRow('Entrega:', shortTime(order.pickup_at)) + '\n';

  // Items
  t += SEP + '\n';
  for (const item of items) {
    t += CMD.BOLD_ON + `${item.quantity}x ${item.product_name}\n` + CMD.BOLD_OFF;
    for (const mod of item.modifiers ?? []) {
      t += `   + ${mod.name}\n`;
    }
    if (item.notes) t += `   >> ${item.notes}\n`;
  }
  t += SEP + '\n';

  // Total (suma de los productos de esta comanda)
  const total = items.reduce((s, it) => s + (it.subtotal ?? 0), 0);
  if (total > 0) {
    t += CMD.BOLD_ON + formatRow('TOTAL:', `$${total.toFixed(2)}`) + '\n' + CMD.BOLD_OFF;
    t += SEP + '\n';
  }

  // Nota del pedido
  if (order.notes) {
    t += `Nota: ${order.notes}\n`;
    t += SEP + '\n';
  }

  // Pie
  const stamp = appended ? '*** AGREGADO ***' : '*** NUEVA ***';
  t += CMD.CENTER + CMD.BOLD_ON + stamp + '\n' + CMD.BOLD_OFF + CMD.LEFT;
  t += CMD.FEED(8);
  t += CMD.CUT;

  return t;
}

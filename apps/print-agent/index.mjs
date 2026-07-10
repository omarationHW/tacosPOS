// ============================================================
// TacosPOS · Print Agent (comanda de cocina automática)
// ============================================================
// Proceso local que corre junto al POS. Escucha inserciones de
// order_items en Supabase Realtime y manda la comanda a la
// impresora térmica ANJET80 por red (TCP 9100).
//
// Ejecutar (Node 24+, sin build):
//   node --env-file=apps/print-agent/.env apps/print-agent/index.mjs
//
// Config en apps/print-agent/.env (ver .env.example).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { formatComanda } from './src/ticket.mjs';
import { printRaw } from './src/escpos.mjs';

// ---------- Config ----------
const cfg = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
  printerIp: process.env.PRINTER_IP,
  printerPort: parseInt(process.env.PRINTER_PORT || '9100', 10),
  restaurantName: process.env.RESTAURANT_NAME || 'La Andaluza',
  businessLineId: process.env.BUSINESS_LINE_ID || null, // opcional: filtrar por línea
  debounceMs: parseInt(process.env.PRINT_DEBOUNCE_MS || '1200', 10),
  chunk: parseInt(process.env.PRINT_CHUNK || '48', 10),
  delayMs: parseInt(process.env.PRINT_DELAY_MS || '25', 10),
};

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}
if (!cfg.supabaseUrl) fail('Falta SUPABASE_URL');
if (!cfg.supabaseKey) fail('Falta SUPABASE_SERVICE_KEY (o SUPABASE_KEY)');
if (!cfg.printerIp) fail('Falta PRINTER_IP');

const supabase = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- Estado ----------
const pending = new Map();          // order_id -> { itemIds:Set, timer }
const printedItemIds = new Set();   // evita reimprimir el mismo item

// ---------- Normalización del query anidado ----------
function normalizeItem(row) {
  const product = Array.isArray(row.product) ? row.product[0] : row.product;
  const modifiers = (row.modifiers ?? []).map((m) => {
    const modRel = Array.isArray(m.modifier) ? m.modifier[0] : m.modifier;
    const groupRel = modRel?.modifier_group;
    const group = Array.isArray(groupRel) ? groupRel[0] : groupRel;
    return { name: m.modifier_name, group: group?.name ?? null };
  });
  return {
    id: row.id,
    quantity: row.quantity,
    notes: row.notes,
    product_name: product?.name ?? 'Producto',
    modifiers,
  };
}

// ---------- Impresión de un pedido ----------
async function printOrder(orderId, newItemIds) {
  // Traer el pedido con su relación de mesa y línea de negocio.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(`
      id, status, notes, customer_name, daily_order_number,
      order_type, pickup_at, created_at, business_line_id,
      table:tables ( name ),
      business_line:business_lines ( name )
    `)
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    log('⚠️  No se pudo leer el pedido', orderId, orderErr?.message ?? '');
    return;
  }

  // Filtro opcional por línea de negocio (una impresora por línea).
  if (cfg.businessLineId && order.business_line_id !== cfg.businessLineId) {
    log(`⏭️  Pedido ${orderId} de otra línea, se ignora.`);
    return;
  }

  // Traer TODOS los items del pedido (para distinguir nuevos vs existentes).
  const { data: itemRows, error: itemsErr } = await supabase
    .from('order_items')
    .select(`
      id, quantity, status, notes, sent_to_kitchen_at,
      product:products ( name ),
      modifiers:order_item_modifiers (
        modifier_name,
        modifier:modifiers ( modifier_group:modifier_groups ( name ) )
      )
    `)
    .eq('order_id', orderId)
    .neq('status', 'cancelled');

  if (itemsErr || !itemRows) {
    log('⚠️  No se pudieron leer los items de', orderId, itemsErr?.message ?? '');
    return;
  }

  const allItems = itemRows.map(normalizeItem);
  const newItems = allItems.filter((i) => newItemIds.has(i.id));
  if (newItems.length === 0) {
    log('⏭️  Sin items nuevos para imprimir en', orderId);
    return;
  }
  const appended = allItems.length > newItems.length;

  const table = Array.isArray(order.table) ? order.table[0] : order.table;
  const bl = Array.isArray(order.business_line) ? order.business_line[0] : order.business_line;

  const ticket = formatComanda({
    restaurantName: cfg.restaurantName,
    order: {
      id: order.id,
      daily_order_number: order.daily_order_number,
      order_type: order.order_type,
      customer_name: order.customer_name,
      notes: order.notes,
      created_at: order.created_at,
      pickup_at: order.pickup_at,
      table_name: table?.name ?? null,
      business_line_name: bl?.name ?? null,
    },
    items: newItems,
    appended,
  });

  try {
    await printRaw(cfg.printerIp, cfg.printerPort, ticket, {
      chunk: cfg.chunk,
      delayMs: cfg.delayMs,
    });
    newItems.forEach((i) => printedItemIds.add(i.id));
    log(`🖨️  Comanda impresa (${appended ? 'AGREGADO' : 'NUEVA'}) pedido ${order.daily_order_number ?? orderId} · ${newItems.length} item(s)`);
  } catch (err) {
    log('❌ Error al imprimir', orderId, err.message);
    // No marcamos como impreso -> se puede reintentar manualmente.
  }
}

// ---------- Debounce por pedido ----------
function scheduleOrder(orderId, itemId) {
  if (printedItemIds.has(itemId)) return;

  let entry = pending.get(orderId);
  if (!entry) {
    entry = { itemIds: new Set(), timer: null };
    pending.set(orderId, entry);
  }
  entry.itemIds.add(itemId);

  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    const ids = entry.itemIds;
    pending.delete(orderId);
    printOrder(orderId, ids).catch((e) => log('❌', e.message));
  }, cfg.debounceMs);
}

// ---------- Suscripción Realtime ----------
function subscribe() {
  const channel = supabase
    .channel('print-agent')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'order_items' },
      (payload) => {
        const row = payload.new;
        if (!row?.order_id || !row?.id) return;
        scheduleOrder(row.order_id, row.id);
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') log('🟢 Escuchando pedidos nuevos...');
      else if (status === 'CHANNEL_ERROR') log('🔴 Error de canal Realtime');
      else if (status === 'TIMED_OUT') log('🟠 Timeout de suscripción, reintentando...');
    });
  return channel;
}

// ---------- Arranque ----------
log('🖨️  Print Agent iniciando...');
log(`   Impresora : ${cfg.printerIp}:${cfg.printerPort}`);
log(`   Restaurante: ${cfg.restaurantName}`);
log(`   Filtro línea: ${cfg.businessLineId ?? '(todas)'}`);

let channel = subscribe();

process.on('SIGINT', async () => {
  log('🔴 Cerrando print agent...');
  try { await supabase.removeChannel(channel); } catch {}
  process.exit(0);
});

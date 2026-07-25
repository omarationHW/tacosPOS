// ============================================================
// Nota a nivel de pedido (orders.notes).
//
// Históricamente este campo guardaba la etiqueta del tipo de pedido
// ("Para Llevar" / "A Domicilio"), que ya viene duplicada en `order_type`.
// Hoy guarda la nota que escribe el cajero. Estos helpers ignoran los
// valores heredados para que no se muestren ni se impriman como si fueran
// una nota del cliente.
// ============================================================

const LEGACY_TYPE_NOTES = new Set(['para llevar', 'a domicilio']);

/** Nota real del pedido, o null si está vacía o es una etiqueta heredada. */
export function orderNoteText(notes: string | null | undefined): string | null {
  const n = (notes ?? '').trim();
  if (!n) return null;
  if (LEGACY_TYPE_NOTES.has(n.toLowerCase())) return null;
  return n;
}

/**
 * Combina la nota existente de un pedido con una nueva (al agregar items a un
 * pedido abierto). Devuelve `undefined` cuando no hay nada que actualizar.
 */
export function mergeOrderNotes(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | undefined {
  const add = (incoming ?? '').trim();
  if (!add) return undefined;

  const current = orderNoteText(existing);
  if (!current) return add;
  if (current.toLowerCase().includes(add.toLowerCase())) return undefined;
  return `${current} | ${add}`;
}

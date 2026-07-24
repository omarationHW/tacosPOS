// ============================================================
// Reglas de precio del carrito.
//
// Además de sumar los modificadores (aditivo), aquí vive la regla especial del
// TACO MIXTO: si el taco lleva "Barriga" combinada con al menos otra carne,
// cuesta $30. La barriga sola (una sola carne) se queda en el precio base ($25).
// El grupo de carnes es multi-select, así que esto no se puede expresar solo con
// el price_override de cada modificador (que es aditivo).
// ============================================================

import type { CartItemModifier } from '@/components/pos/OrderPanel';

/** Nombre (normalizado) del grupo de cortes de carne. */
const MEAT_GROUP = 'tipo de carne';

/** Precio de un taco mixto cuando lleva barriga + otra carne. */
export const MIXTO_BARRIGA_COMBO_PRICE = 30;

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function isMeatCut(m: CartItemModifier): boolean {
  return norm(m.group) === MEAT_GROUP;
}

/**
 * Aplica la regla del taco mixto sobre un precio base, dados los modificadores.
 * Devuelve el precio base ajustado (sin sumar aún los otros modificadores).
 */
export function adjustedBasePrice(basePrice: number, modifiers: CartItemModifier[]): number {
  const cuts = modifiers.filter(isMeatCut);
  const hasBarriga = cuts.some((m) => norm(m.name).includes('barriga'));
  // Barriga + al menos otra carne → $30 (solo sube, nunca baja el precio base).
  if (hasBarriga && cuts.length >= 2 && basePrice < MIXTO_BARRIGA_COMBO_PRICE) {
    return MIXTO_BARRIGA_COMBO_PRICE;
  }
  return basePrice;
}

/** Precio unitario efectivo: precio base ajustado + suma de modificadores. */
export function effectiveUnitPrice(item: { price: number; modifiers: CartItemModifier[] }): number {
  const base = adjustedBasePrice(item.price, item.modifiers);
  const mods = item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
  return base + mods;
}

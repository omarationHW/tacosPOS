// ============================================================
// Reglas de precio del carrito.
//
// Además de sumar los modificadores (aditivo), aquí vive la regla especial del
// TACO MIXTO: si el taco combina un corte caro (Barriga o Costilla) con al menos
// otra carne, cuesta $30. Ese corte solo (una sola carne) se queda en el precio
// base del producto ($25 en el Taco Mixto). El grupo de carnes es multi-select,
// así que esto no se puede expresar solo con el price_override de cada
// modificador (que es aditivo).
// ============================================================

import type { CartItemModifier } from '@/components/pos/OrderPanel';

/** Nombre (normalizado) del grupo de cortes de carne. */
const MEAT_GROUP = 'tipo de carne';

/** Precio de un taco mixto cuando lleva un corte caro + otra carne. */
export const MIXTO_COMBO_PRICE = 30;

/**
 * Cortes que encarecen el taco mixto: combinados con cualquier otra carne, el
 * taco cuesta $30. Se comparan por substring para cubrir todas las variantes
 * ("Costilla (hueso)", "Costilla (sin hueso)", ...).
 */
const PREMIUM_CUTS = ['barriga', 'costilla'];

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
  const hasPremiumCut = cuts.some((m) => {
    const name = norm(m.name);
    return PREMIUM_CUTS.some((cut) => name.includes(cut));
  });
  // Corte caro + al menos otra carne → $30 (solo sube, nunca baja el precio base).
  if (hasPremiumCut && cuts.length >= 2 && basePrice < MIXTO_COMBO_PRICE) {
    return MIXTO_COMBO_PRICE;
  }
  return basePrice;
}

/** Precio unitario efectivo: precio base ajustado + suma de modificadores. */
export function effectiveUnitPrice(item: { price: number; modifiers: CartItemModifier[] }): number {
  const base = adjustedBasePrice(item.price, item.modifiers);
  const mods = item.modifiers.reduce((s, m) => s + m.priceOverride, 0);
  return base + mods;
}

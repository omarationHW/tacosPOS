// ============================================================
// Pedidos de carnitas POR MONTO ("dame $200 de carnitas").
//
// Viven en la categoría "Por monto": botones de montos fijos ($100, $150, ...)
// más el producto "Otro monto" (precio 0) donde el cajero escribe la cantidad.
//
// Estos pedidos SIEMPRE se empacan (aunque el pedido sea "aquí"), así que a
// diferencia de un taco hay que preguntar salsas, verdura y preparación en
// cualquier tipo de orden: los extras nunca se auto-resuelven ni se ocultan.
// ============================================================

/** Forma mínima de un producto para decidir si es "por monto". */
export interface MontoCheckProduct {
  price: number | string;
  category?: { name: string } | null;
}

/** True si el producto pertenece a la categoría de montos de carnitas. */
export function isMontoProduct(product: MontoCheckProduct | null | undefined): boolean {
  const catName = product?.category?.name?.toLowerCase() ?? '';
  return catName.includes('monto');
}

/** True si el producto es el "monto libre" (precio 0 en categoría de montos). */
export function isCustomMontoProduct(product: MontoCheckProduct): boolean {
  return Number(product.price) === 0 && isMontoProduct(product);
}

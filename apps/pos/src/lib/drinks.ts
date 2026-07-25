// ============================================================
// Regla: LAS BEBIDAS NO LLEVAN EXTRAS.
//
// Aguas, refrescos, Boing, cervezas, jugos... no se acompañan de salsas,
// verdura, acompañamientos ni ningún otro modificador. Los grupos de
// modificadores se asignan por producto en la base de datos y varias bebidas
// los heredaron, así que la regla vive aquí y se aplica en todos lados:
// al agregar al carrito (POS) y al editar el pedido (Cocina y Cuentas).
//
// Solo aplica a bebidas: cualquier otro producto sigue mostrando sus extras.
// ============================================================

/** Forma mínima de un producto para decidir si es bebida. */
export interface DrinkCheckProduct {
  name: string;
  category?: { name: string } | null;
}

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/** Categorías cuyos productos siempre son bebida. */
const DRINK_CATEGORY_PATTERNS: RegExp[] = [
  /bebida/,
  /\baguas?\b/,
  /refresco/,
  /cerveza/,
  /jugo/,
  /licuado/,
  /coctel/,
  /michelada/,
];

/**
 * Bebidas identificables por nombre, por si el producto quedó en otra
 * categoría. Con límites de palabra para no confundir "agua" con "aguachile".
 */
const DRINK_NAME_PATTERNS: RegExp[] = [
  /\bboing\b/,
  /\baguas?\b/,
  /\brefresco\b/,
  /\bcerveza\b/,
  /\bjugo\b/,
  /\bhorchata\b/,
  /\bjamaica\b/,
  /\bmichelada\b/,
  /\bchelada\b/,
  /\blimonada\b/,
  /\bnaranjada\b/,
  /\bcoca\b/,
  /\bcoca-cola\b/,
  /\bsprite\b/,
  /\bfanta\b/,
  /\bsidral\b/,
  /\bmundet\b/,
  /\bmanzanita\b/,
  /\bjarrito(s)?\b/,
  /\bsquirt\b/,
  /\bpepsi\b/,
  /\bfresca\b/,
  /\b7\s*up\b/,
  /\bseven\s*up\b/,
  /\btopo\s*chico\b/,
  /\bciel\b/,
  /\bbonafont\b/,
  /\bepura\b/,
];

/** True si el producto es una bebida (y por lo tanto no lleva extras). */
export function isDrinkProduct(product: DrinkCheckProduct | null | undefined): boolean {
  if (!product) return false;
  const category = norm(product.category?.name);
  if (category && DRINK_CATEGORY_PATTERNS.some((re) => re.test(category))) return true;
  const name = norm(product.name);
  return DRINK_NAME_PATTERNS.some((re) => re.test(name));
}

/**
 * Grupos de modificadores que realmente aplican a un producto.
 * Para las bebidas siempre es una lista vacía.
 */
export function applicableModifierGroups<T>(
  product: DrinkCheckProduct & { modifier_groups?: T[] | null },
): T[] {
  if (isDrinkProduct(product)) return [];
  return product.modifier_groups ?? [];
}

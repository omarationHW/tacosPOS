// ============================================================
// ESC/POS para navegador (Web Bluetooth) — impresora ANJET80
// ============================================================
// Misma receta validada que el print-agent:
//  - 80mm = 48 caracteres.
//  - Codepage WPC1252 (ESC t 16) + bytes latin1 => acentos/ñ correctos.
//  - Separadores cortos (barras sólidas de ancho completo atoran la impresora).
// Aquí trabajamos con bytes (Uint8Array) porque BLE transmite binario.
// ============================================================

const ESC = 0x1b;
const GS = 0x1d;

export const WIDTH = 48;
export const SEP = '-'.repeat(32);

export const CMD = {
  INIT: [ESC, 0x40],
  CODEPAGE: [ESC, 0x74, 0x10], // ESC t 16 = WPC1252
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  CENTER: [ESC, 0x61, 0x01],
  LEFT: [ESC, 0x61, 0x00],
  BIG: [ESC, 0x21, 0x30],
  NORMAL: [ESC, 0x21, 0x00],
  CUT: [GS, 0x56, 0x01],
  feed: (n: number): number[] => [ESC, 0x64, n & 0xff],
};

/** Convierte texto a bytes latin1 (cada char -> su code point & 0xFF). */
export function latin1(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) out.push(str.charCodeAt(i) & 0xff);
  return out;
}

/** Trunca/rellena a un ancho fijo. */
export function padText(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const t = String(text).slice(0, width);
  return align === 'right' ? t.padStart(width) : t.padEnd(width);
}

/** Fila de dos columnas (etiqueta izq, valor der). */
export function formatRow(label: string, value: string, width = WIDTH): string {
  const v = String(value);
  const labelWidth = Math.max(0, width - v.length - 1);
  return `${padText(label, labelWidth)} ${v}`;
}

/** Centra texto en el ancho del ticket. */
export function centerText(text: string, width = WIDTH): string {
  const t = String(text);
  if (t.length >= width) return t.slice(0, width);
  const pad = Math.floor((width - t.length) / 2);
  return ' '.repeat(pad) + t;
}

/**
 * Ensambla partes (arrays de bytes o texto latin1) en un solo Uint8Array.
 * Los strings se codifican como latin1; los arrays de números pasan tal cual.
 */
export function build(parts: Array<number[] | string>): Uint8Array {
  const chunks: number[][] = parts.map((p) => (typeof p === 'string' ? latin1(p) : p));
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

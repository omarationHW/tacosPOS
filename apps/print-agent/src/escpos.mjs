// ============================================================
// ESC/POS para impresora térmica ANJET80 (Qian QTP-BTWF-01)
// Impresión por RED (TCP raw al puerto 9100). Sin drivers.
// ============================================================
// Receta validada (ver memoria printer-anjet80-config):
//  - 80mm @ 203dpi = 48 caracteres por línea.
//  - Codepage WPC1252 (ESC t 16) + texto latin1 => acentos y ñ correctos.
//  - Enviar en chunks pequeños con pausa (buffer chico) o TRUNCA el ticket.
//  - NUNCA líneas sólidas de ancho completo (48 '='): atoran/resetean la
//    impresora (brown-out). Usar separadores cortos de guiones.
//  - La impresora cuelga la conexión (ECONNRESET) tras recibir: es normal.
// ============================================================

import net from 'node:net';

const ESC = '\x1B';
const GS = '\x1D';

export const WIDTH = 48;                 // caracteres por línea (Fuente A, 80mm)
export const SEP = '-'.repeat(32);       // separador SEGURO (no usar 48 sólidos)

export const CMD = {
  INIT: `${ESC}@`,
  CODEPAGE: `${ESC}t\x10`,       // ESC t 16 = WPC1252 (acentos/ñ con latin1)
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  CENTER: `${ESC}a\x01`,
  LEFT: `${ESC}a\x00`,
  RIGHT: `${ESC}a\x02`,
  BIG: `${ESC}!\x30`,            // doble ancho + alto
  NORMAL: `${ESC}!\x00`,
  FEED: (n) => `${ESC}d${String.fromCharCode(n)}`,
  CUT: `${GS}V\x01`,            // corte parcial (auto-cutter)
};

/** Trunca/rellena texto a un ancho fijo. */
export function padText(text, width, align = 'left') {
  const t = String(text).slice(0, width);
  return align === 'right' ? t.padStart(width) : t.padEnd(width);
}

/** Fila de dos columnas: etiqueta a la izquierda, valor a la derecha. */
export function formatRow(label, value, width = WIDTH) {
  const v = String(value);
  const labelWidth = Math.max(0, width - v.length - 1);
  return `${padText(label, labelWidth)} ${v}`;
}

/** Centra un texto en el ancho del ticket. */
export function centerText(text, width = WIDTH) {
  const t = String(text);
  if (t.length >= width) return t.slice(0, width);
  const pad = Math.floor((width - t.length) / 2);
  return ' '.repeat(pad) + t;
}

/**
 * Envía datos ESC/POS crudos a la impresora por TCP (puerto 9100).
 * Envía en chunks con pausa (buffer chico de la ANJET) y trata el
 * ECONNRESET post-envío como éxito.
 *
 * @param {string} host  IP de la impresora
 * @param {number} port  puerto (default 9100)
 * @param {string} data  contenido ESC/POS (string latin1)
 * @param {{chunk?:number, delayMs?:number, closeMs?:number, timeoutMs?:number}} opts
 * @returns {Promise<void>}
 */
export function printRaw(host, port, data, opts = {}) {
  const chunk = opts.chunk ?? 24;
  const delayMs = opts.delayMs ?? 50;
  const closeMs = opts.closeMs ?? 2500;
  const timeoutMs = opts.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    const buf = Buffer.from(data, 'latin1');
    let sent = 0;
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve();
    };

    const socket = net.createConnection({ host, port }, async () => {
      try {
        socket.setNoDelay(true);
        for (let off = 0; off < buf.length; off += chunk) {
          await new Promise((r) => socket.write(buf.subarray(off, off + chunk), r));
          await new Promise((r) => setTimeout(r, delayMs));
        }
        sent = buf.length;
        setTimeout(() => socket.end(), closeMs);
      } catch (err) {
        done(err);
      }
    });

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => {
      socket.destroy();
      done(new Error(`Timeout imprimiendo en ${host}:${port}`));
    });
    socket.on('close', () => done());
    socket.on('error', (err) => {
      // ECONNRESET tras enviar todo = la impresora colgó tras recibir. Normal.
      if (err.code === 'ECONNRESET' && sent > 0) return done();
      done(err);
    });
  });
}

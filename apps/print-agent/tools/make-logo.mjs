// ============================================================
// Convertidor de logo PNG -> raster ESC/POS (GS v 0) embebible.
// Sin dependencias externas: decodifica PNG con zlib de Node.
//
// Uso:
//   node apps/print-agent/tools/make-logo.mjs <input.png> [threshold]
//
// Genera apps/print-agent/src/logo.mjs (raster en base64) y muestra
// un preview ASCII en consola para revisar antes de imprimir.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2];
const threshold = parseInt(process.argv[3] || '200', 10); // luminancia < thr => negro
if (!inputPath) { console.error('Falta el PNG de entrada'); process.exit(1); }

// ---------- Decodificar PNG (8-bit) ----------
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('No es PNG');
  let off = 8;
  let width, height, bitDepth, colorType;
  const idat = [];
  let palette = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len; // len + type(4) + data + crc(4)
  }
  if (bitDepth !== 8) throw new Error('Solo soporto bitDepth 8, este es ' + bitDepth);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error('colorType no soportado: ' + colorType);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride); // sin filtros, mismos canales
  let p = 0; // posición en raw (incluye byte de filtro por fila)
  const paeth = (a, b, c) => {
    const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[p++];
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let val;
      switch (filter) {
        case 0: val = rawByte; break;
        case 1: val = rawByte + a; break;
        case 2: val = rawByte + b; break;
        case 3: val = rawByte + ((a + b) >> 1); break;
        case 4: val = rawByte + paeth(a, b, c); break;
        default: throw new Error('Filtro PNG desconocido: ' + filter);
      }
      out[y * stride + x] = val & 0xff;
    }
  }
  return { width, height, channels, colorType, palette, pixels: out };
}

// luminancia (0..255) de un pixel dado su offset
function lumAt(img, idx) {
  const { channels, pixels, colorType, palette } = img;
  if (colorType === 3) { // palette
    const pi = pixels[idx] * 3;
    return 0.299 * palette[pi] + 0.587 * palette[pi + 1] + 0.114 * palette[pi + 2];
  }
  if (channels === 1 || channels === 2) return pixels[idx]; // gris
  const o = idx;
  return 0.299 * pixels[o] + 0.587 * pixels[o + 1] + 0.114 * pixels[o + 2];
}

const img = decodePng(readFileSync(inputPath));
console.log(`PNG ${img.width}x${img.height} colorType=${img.colorType} canales=${img.channels}`);

// ---------- 1-bit ----------
const W = img.width, H = img.height;
const bit = new Uint8Array(W * H); // 1 = negro
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * img.channels;
    bit[y * W + x] = lumAt(img, idx) < threshold ? 1 : 0;
  }
}

// ---------- Preview ASCII (downsample ~64 ancho) ----------
const pvW = Math.min(64, W), sx = W / pvW, sy = sx * 2; // celdas altas
console.log(`\n--- PREVIEW (umbral ${threshold}) ---`);
for (let y = 0; y < H; y += sy) {
  let line = '';
  for (let x = 0; x < W; x += sx) {
    // promedio del bloque
    let sum = 0, n = 0;
    for (let yy = y | 0; yy < Math.min(H, (y + sy) | 0); yy++)
      for (let xx = x | 0; xx < Math.min(W, (x + sx) | 0); xx++) { sum += bit[yy * W + xx]; n++; }
    const d = n ? sum / n : 0;
    line += d > 0.5 ? '#' : d > 0.15 ? '.' : ' ';
  }
  console.log(line);
}

// ---------- Empaquetar GS v 0 (con relleno izquierdo para centrar) ----------
// Esta impresora ignora ESC a / ESC $ en raster: se centra rellenando blanco.
const PRINT_WIDTH = parseInt(process.argv[4] || '576', 10); // ancho útil en puntos
let leftPadDots = Math.max(0, Math.round(((PRINT_WIDTH - W) / 2) / 8) * 8);
const leftPadBytes = leftPadDots / 8;
const logoBytes = Math.ceil(W / 8);
const xBytes = leftPadBytes + logoBytes;
console.log(`Centrado: ancho impresora ${PRINT_WIDTH}pt, relleno izq ${leftPadDots}pt (${leftPadBytes} bytes) -> fila ${xBytes} bytes`);
const raster = Buffer.alloc(xBytes * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (bit[y * W + x]) {
      const gx = leftPadDots + x;
      raster[y * xBytes + (gx >> 3)] |= 0x80 >> (gx & 7);
    }
  }
}
const header = Buffer.from([
  0x1d, 0x76, 0x30, 0x00,
  xBytes & 0xff, (xBytes >> 8) & 0xff,
  H & 0xff, (H >> 8) & 0xff,
]);
const full = Buffer.concat([header, raster]);

const b64 = full.toString('base64');
const outFile = join(__dirname, '..', 'src', 'logo.mjs');
writeFileSync(outFile, `// Auto-generado por tools/make-logo.mjs — NO editar a mano.
// Logo ${W}x${H}, raster ESC/POS GS v 0 (${full.length} bytes), umbral ${threshold}.
export const LOGO_RASTER = Buffer.from(
  '${b64}',
  'base64',
).toString('latin1');
export const LOGO_BYTES = ${full.length};
`);
console.log(`\n✅ ${outFile}`);
console.log(`   ${W}x${H}, raster ${full.length} bytes (${xBytes} bytes/fila x ${H} filas).`);

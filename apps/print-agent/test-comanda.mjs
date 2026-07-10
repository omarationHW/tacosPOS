// Confirmación: comanda de cocina realista con separadores SEGUROS
// (guiones cortos, no barras sólidas de ancho completo) + acentos.
import net from 'node:net';
const HOST = process.argv[2] || '192.168.1.23';
const PORT = parseInt(process.argv[3] || '9100', 10);
const ESC = '\x1B', GS = '\x1D';
const C = {
  INIT: ESC + '@', CP: ESC + 't\x10',
  CENTER: ESC + 'a\x01', LEFT: ESC + 'a\x00',
  BOLD1: ESC + 'E\x01', BOLD0: ESC + 'E\x00',
  BIG: ESC + '!\x30', NORM: ESC + '!\x00',
  CUT: GS + 'V\x01',
};
const SEP = '-'.repeat(32); // separador seguro: 32 guiones (no 48 solidos)

let t = C.INIT + C.CP;
t += C.CENTER + C.BIG + 'TACOS POS\n' + C.NORM;
t += C.BOLD1 + 'COMANDA COCINA\n' + C.BOLD0;
t += C.LEFT + SEP + '\n';
t += 'Orden: #ABC123        Mesa: 5\n';
t += 'Hora: 14:35\n';
t += SEP + '\n';
t += C.BOLD1 + '2x Taco al Pastor\n' + C.BOLD0;
t += '   + con todo, salsa verde\n';
t += C.BOLD1 + '1x Quesadilla\n' + C.BOLD0;
t += '   + jamon y piña\n';
t += C.BOLD1 + '3x Agua de Jamaica\n' + C.BOLD0;
t += SEP + '\n';
t += 'Acentos: aeiou áéíóú ñ Ñ\n';
t += SEP + '\n';
t += C.CENTER + C.BOLD1 + '*** NUEVA ***\n' + C.BOLD0;
t += '\n\n\n\n';
t += C.CUT;

const buf = Buffer.from(t, 'binary');
console.log(`Comanda: ${buf.length} bytes -> ${HOST}:${PORT}`);
const socket = net.createConnection({ host: HOST, port: PORT }, async () => {
  socket.setNoDelay(true);
  for (let off = 0; off < buf.length; off += 24) {
    await new Promise((r) => socket.write(buf.subarray(off, off + 24), r));
    await new Promise((r) => setTimeout(r, 50));
  }
  setTimeout(() => socket.end(), 3000);
});
socket.on('close', () => console.log('✅ Cerrado.'));
socket.on('error', (e) => { if (e.code === 'ECONNRESET') { console.log('✅ ECONNRESET (normal).'); process.exit(0); } console.error('❌', e.message); process.exit(1); });

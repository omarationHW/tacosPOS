// ============================================================
// Transporte Web Bluetooth para la impresora ANJET80 (BLE).
// ============================================================
// La impresora anuncia el servicio de impresión estándar 0x18F0
// (característica de escritura 0x2AF1). Web Bluetooth solo funciona en
// contexto seguro (HTTPS) y requiere un gesto del usuario para conectar.
//
// Se escribe en chunks con pacing porque el buffer de la impresora es
// chico (mandar de golpe trunca el ticket).
// ============================================================

// Servicio/característica de impresión (formato 16-bit -> número).
const PRINT_SERVICE = 0x18f0;
const PRINT_CHAR = 0x2af1;
// Fallback: servicio serial propietario de WinnerMicro que también anuncia.
const WM_SERVICE = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2';

// ---- Tipos mínimos de Web Bluetooth (evita depender de @types/web-bluetooth) ----
interface BleChar {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue(v: BufferSource): Promise<void>;
  writeValueWithoutResponse?(v: BufferSource): Promise<void>;
}
interface BleService {
  getCharacteristic(uuid: number | string): Promise<BleChar>;
  getCharacteristics(): Promise<BleChar[]>;
}
interface BleServer {
  connected: boolean;
  connect(): Promise<BleServer>;
  disconnect(): void;
  getPrimaryService(uuid: number | string): Promise<BleService>;
}
interface BleDevice {
  name?: string;
  gatt?: BleServer;
  addEventListener(type: 'gattserverdisconnected', cb: () => void): void;
  removeEventListener(type: 'gattserverdisconnected', cb: () => void): void;
}
interface BluetoothLike {
  requestDevice(opts: {
    filters?: Array<{ services?: (number | string)[]; namePrefix?: string }>;
    optionalServices?: (number | string)[];
    acceptAllDevices?: boolean;
  }): Promise<BleDevice>;
}

function getBluetooth(): BluetoothLike | null {
  const nav = navigator as unknown as { bluetooth?: BluetoothLike };
  return nav.bluetooth ?? null;
}

export function isBluetoothSupported(): boolean {
  return getBluetooth() !== null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class BluetoothPrinter {
  private device: BleDevice | null = null;
  private characteristic: BleChar | null = null;
  private onDisconnectCb: (() => void) | null = null;
  private boundDisconnect = () => this.handleDisconnect();

  get connected(): boolean {
    return !!this.device?.gatt?.connected && !!this.characteristic;
  }

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCb = cb;
  }

  /** Pide al usuario elegir la impresora y conecta. Requiere gesto del usuario. */
  async connect(): Promise<void> {
    const bt = getBluetooth();
    if (!bt) throw new Error('Este navegador no soporta Web Bluetooth (usa Chrome en Android).');

    const device = await bt.requestDevice({
      filters: [{ services: [PRINT_SERVICE] }, { namePrefix: 'BlueTooth Printer' }],
      optionalServices: [PRINT_SERVICE, WM_SERVICE],
    });
    this.device = device;
    device.addEventListener('gattserverdisconnected', this.boundDisconnect);

    const server = await device.gatt!.connect();
    this.characteristic = await this.resolveCharacteristic(server);
  }

  private async resolveCharacteristic(server: BleServer): Promise<BleChar> {
    // Primero el servicio estándar 0x18F0 / 0x2AF1.
    try {
      const svc = await server.getPrimaryService(PRINT_SERVICE);
      try {
        return await svc.getCharacteristic(PRINT_CHAR);
      } catch {
        const chars = await svc.getCharacteristics();
        const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
        if (writable) return writable;
      }
    } catch {
      /* intenta el fallback */
    }
    // Fallback: servicio serial de WinnerMicro.
    const svc = await server.getPrimaryService(WM_SERVICE);
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
    if (!writable) throw new Error('No encontré una característica de escritura en la impresora.');
    return writable;
  }

  /** Envía bytes ESC/POS en chunks con pacing (buffer chico de la impresora). */
  async write(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error('Impresora no conectada.');
    const char = this.characteristic;
    const noResp = !!char.properties.writeWithoutResponse && !!char.writeValueWithoutResponse;
    const CHUNK = 180; // bytes por escritura BLE
    for (let off = 0; off < data.length; off += CHUNK) {
      const slice = data.subarray(off, off + CHUNK);
      if (noResp) {
        await char.writeValueWithoutResponse!(slice);
        await sleep(18); // pacing: evita truncar el ticket
      } else {
        // writeValue (con respuesta) ya da control de flujo BLE natural.
        await char.writeValue(slice);
      }
    }
  }

  disconnect(): void {
    try {
      this.device?.removeEventListener('gattserverdisconnected', this.boundDisconnect);
      this.device?.gatt?.disconnect();
    } catch {
      /* noop */
    }
    this.device = null;
    this.characteristic = null;
  }

  private handleDisconnect() {
    this.characteristic = null;
    this.onDisconnectCb?.();
  }
}

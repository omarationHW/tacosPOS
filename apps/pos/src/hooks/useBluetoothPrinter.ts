import { useCallback, useEffect, useRef, useState } from 'react';
import { BluetoothPrinter, isBluetoothSupported } from '@/lib/printer/bluetooth';
import { buildComanda, type ComandaOrder } from '@/lib/printer/ticket';

export type PrinterStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected';

export function useBluetoothPrinter() {
  const printerRef = useRef<BluetoothPrinter | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const [status, setStatus] = useState<PrinterStatus>(
    isBluetoothSupported() ? 'disconnected' : 'unsupported',
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!printerRef.current && isBluetoothSupported()) {
    printerRef.current = new BluetoothPrinter();
  }

  useEffect(() => {
    const printer = printerRef.current;
    if (!printer) return;
    printer.onDisconnect(() => {
      setStatus('disconnected');
      setError('La impresora se desconectó. Vuelve a conectar.');
    });
  }, []);

  const connect = useCallback(async () => {
    const printer = printerRef.current;
    if (!printer) return;
    setError(null);
    setStatus('connecting');
    try {
      await printer.connect();
      setDeviceName(printer.deviceName);
      setStatus('connected');
    } catch (err) {
      setStatus('disconnected');
      // El usuario cancelando el diálogo no es un error que mostrar.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel|user gesture|chooser/i.test(msg)) setError(msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    printerRef.current?.disconnect();
    setStatus('disconnected');
    setDeviceName(null);
  }, []);

  /**
   * Encola la impresión de una comanda. Serializa para que varios pedidos
   * seguidos no choquen en el mismo canal BLE. Devuelve la promesa del trabajo.
   */
  const printComanda = useCallback((order: ComandaOrder): Promise<void> => {
    const printer = printerRef.current;
    if (!printer || !printer.connected) {
      return Promise.reject(new Error('Impresora no conectada'));
    }
    const bytes = buildComanda(order);
    const job = queueRef.current.then(() => printer.write(bytes));
    // Mantiene la cadena viva aunque un trabajo falle.
    queueRef.current = job.catch(() => undefined);
    return job;
  }, []);

  return { status, deviceName, error, connect, disconnect, printComanda };
}

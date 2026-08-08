import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { BluetoothPrinter, isBluetoothSupported } from '@/lib/printer/bluetooth';
import { buildComanda, type ComandaOrder } from '@/lib/printer/ticket';

export type PrinterStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected';

interface PrinterContextValue {
  status: PrinterStatus;
  deviceName: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Imprime una comanda ya armada (reimpresión manual). */
  printOrder: (order: ComandaOrder) => Promise<void>;
}

const PrinterContext = createContext<PrinterContextValue | null>(null);

const DEBOUNCE_MS = 1200; // juntar item + modificadores antes de imprimir

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(row: any) {
  const product = Array.isArray(row.product) ? row.product[0] : row.product;
  const category = Array.isArray(product?.category) ? product.category[0] : product?.category;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modifiers = (row.modifiers ?? []).map((m: any) => {
    const modRel = Array.isArray(m.modifier) ? m.modifier[0] : m.modifier;
    const groupRel = modRel?.modifier_group;
    const group = Array.isArray(groupRel) ? groupRel[0] : groupRel;
    return { name: m.modifier_name as string, group: (group?.name ?? null) as string | null };
  });
  return {
    id: row.id as string,
    quantity: row.quantity as number,
    product_name: product?.name ?? 'Producto',
    notes: row.notes as string | null,
    subtotal: (row.subtotal ?? 0) as number,
    category_name: (category?.name ?? null) as string | null,
    modifiers,
  };
}

export function PrinterProvider({ children }: { children: ReactNode }) {
  const printerRef = useRef<BluetoothPrinter | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const [status, setStatus] = useState<PrinterStatus>(
    isBluetoothSupported() ? 'disconnected' : 'unsupported',
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado accesible desde el listener sin recrear la suscripción.
  const statusRef = useRef(status);
  statusRef.current = status;

  if (!printerRef.current && isBluetoothSupported()) {
    printerRef.current = new BluetoothPrinter();
  }

  useEffect(() => {
    printerRef.current?.onDisconnect(() => {
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
      const msg = err instanceof Error ? err.message : String(err);
      if (!/cancel|user gesture|chooser/i.test(msg)) setError(msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    printerRef.current?.disconnect();
    setStatus('disconnected');
    setDeviceName(null);
  }, []);

  /** Encola bytes hacia la impresora, serializando trabajos. */
  const printOrder = useCallback((order: ComandaOrder): Promise<void> => {
    const printer = printerRef.current;
    if (!printer || !printer.connected) {
      return Promise.reject(new Error('Impresora no conectada'));
    }
    const bytes = buildComanda(order);
    const job = queueRef.current.then(() => printer.write(bytes));
    queueRef.current = job.catch(() => undefined);
    return job;
  }, []);

  // ---- Auto-impresión global: escucha order_items nuevos e imprime ----
  useEffect(() => {
    const pending = new Map<string, { items: Set<string>; timer: ReturnType<typeof setTimeout> }>();
    const printedItems = new Set<string>();

    async function flush(orderId: string, itemIds: Set<string>) {
      if (statusRef.current !== 'connected') return; // solo la tablet conectada imprime

      const { data: order } = await supabase
        .from('orders')
        .select(
          `id, notes, customer_name, daily_order_number, order_type, pickup_at, created_at,
           table:tables ( name ), business_line:business_lines ( name ),
           cashier:profiles!orders_created_by_fkey ( full_name )`,
        )
        .eq('id', orderId)
        .single();
      if (!order) return;

      const { data: itemRows } = await supabase
        .from('order_items')
        .select(
          `id, quantity, status, notes, subtotal,
           product:products ( name, category:categories ( name ) ),
           modifiers:order_item_modifiers (
             modifier_name,
             modifier:modifiers ( modifier_group:modifier_groups ( name ) )
           )`,
        )
        .eq('order_id', orderId)
        .neq('status', 'cancelled');
      if (!itemRows) return;

      const allItems = itemRows.map(normalizeItem);
      const newItems = allItems.filter((i) => itemIds.has(i.id));
      if (newItems.length === 0) return;
      const appended = allItems.length > newItems.length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = order as any;
      const table = Array.isArray(o.table) ? o.table[0] : o.table;
      const bl = Array.isArray(o.business_line) ? o.business_line[0] : o.business_line;
      const cashier = Array.isArray(o.cashier) ? o.cashier[0] : o.cashier;

      const comanda: ComandaOrder = {
        id: o.id,
        daily_order_number: o.daily_order_number,
        order_type: o.order_type,
        customer_name: o.customer_name,
        notes: o.notes,
        created_at: o.created_at,
        pickup_at: o.pickup_at,
        table_name: table?.name ?? null,
        business_line_name: bl?.name ?? null,
        cashier_name: cashier?.full_name ?? null,
        items: newItems.map((i) => ({
          quantity: i.quantity,
          product_name: i.product_name,
          notes: i.notes,
          subtotal: i.subtotal,
          category_name: i.category_name,
          modifiers: i.modifiers,
        })),
        appended,
      };

      try {
        await printOrder(comanda);
        newItems.forEach((i) => printedItems.add(i.id));
      } catch {
        /* si falla, no marcamos impreso: se puede reintentar manual */
      }
    }

    const channel = supabase
      .channel('printer-auto')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_items' },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = payload.new as any;
          if (!row?.order_id || !row?.id || printedItems.has(row.id)) return;

          let entry = pending.get(row.order_id);
          if (!entry) {
            entry = { items: new Set(), timer: setTimeout(() => {}, 0) };
            pending.set(row.order_id, entry);
          }
          entry.items.add(row.id);
          clearTimeout(entry.timer);
          entry.timer = setTimeout(() => {
            const ids = entry!.items;
            pending.delete(row.order_id);
            void flush(row.order_id, ids);
          }, DEBOUNCE_MS);
        },
      )
      .subscribe();

    return () => {
      for (const e of pending.values()) clearTimeout(e.timer);
      supabase.removeChannel(channel);
    };
  }, [printOrder]);

  return (
    <PrinterContext.Provider value={{ status, deviceName, error, connect, disconnect, printOrder }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider');
  return ctx;
}

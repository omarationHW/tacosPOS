import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessLine } from '@/contexts/BusinessLineContext';

export interface CashSession {
  id: string;
  opened_by: string;
  closed_by: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  business_line_id: string;
  opener_name?: string;
  closer_name?: string;
}

export interface CashMovement {
  id: string;
  session_id: string;
  type: 'sale' | 'withdrawal' | 'deposit' | 'tip';
  amount: number;
  description: string | null;
  order_id: string | null;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

/** Ventas del turno partidas por método de pago. */
export interface SalesByMethod {
  cash: number;
  card: number;
  transfer: number;
  /** Suma de los tres: lo que realmente se vendió en el turno. */
  total: number;
}

const EMPTY_SALES: SalesByMethod = { cash: 0, card: 0, transfer: 0, total: 0 };

/**
 * Suma los pedidos cobrados dentro de la ventana del turno, agrupados por
 * método de pago.
 *
 * Vive aparte de los movimientos de caja a propósito: un movimiento 'sale'
 * solo se crea en pagos en efectivo (porque solo el efectivo entra al cajón),
 * así que era la razón de que el cierre ignorara tarjeta y transferencia.
 * El dinero esperado en el cajón se sigue calculando con los movimientos.
 */
async function fetchSalesByMethod(
  sessionId: string,
  openedAt: string,
  closedAt: string | null,
  businessLineId: string | null,
): Promise<SalesByMethod> {
  let query = supabase
    .from('orders')
    .select('total, discount, tip, payment_method, paid_at')
    .not('payment_method', 'is', null)
    .neq('status', 'cancelled')
    .gte('paid_at', openedAt);

  if (closedAt) query = query.lte('paid_at', closedAt);
  if (businessLineId) query = query.eq('business_line_id', businessLineId);

  const { data, error } = await query;
  if (error || !data) return EMPTY_SALES;

  const acc = { ...EMPTY_SALES };
  for (const o of data as any[]) {
    // Mismo criterio que el movimiento de caja en efectivo: lo realmente cobrado.
    const amount = Number(o.total ?? 0) - Number(o.discount ?? 0) + Number(o.tip ?? 0);
    if (o.payment_method === 'cash') acc.cash += amount;
    else if (o.payment_method === 'card') acc.card += amount;
    else if (o.payment_method === 'transfer') acc.transfer += amount;
  }
  acc.total = acc.cash + acc.card + acc.transfer;
  void sessionId; // el filtro es por ventana de tiempo + línea
  return acc;
}

export function useCashRegister() {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [salesByMethod, setSalesByMethod] = useState<SalesByMethod>(EMPTY_SALES);
  const [loading, setLoading] = useState(true);
  const { activeBusinessLine, isAllLines } = useBusinessLine();

  const fetchActiveSession = useCallback(async () => {
    let query = supabase
      .from('cash_register_sessions')
      .select('*, opener:profiles!cash_register_sessions_opened_by_fkey(full_name)')
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1);

    if (activeBusinessLine && !isAllLines) {
      query = query.eq('business_line_id', activeBusinessLine.id);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      setActiveSession(null);
      setMovements([]);
      setSalesByMethod(EMPTY_SALES);
      setLoading(false);
      return;
    }

    const opener = Array.isArray(data.opener) ? data.opener[0] : data.opener;
    const session: CashSession = {
      ...data,
      opener_name: (opener as any)?.full_name ?? '',
    };
    setActiveSession(session);

    // Fetch movements for this session
    const { data: movs } = await supabase
      .from('cash_register_movements')
      .select('*, creator:profiles!cash_register_movements_created_by_fkey(full_name)')
      .eq('session_id', data.id)
      .order('created_at', { ascending: false });

    const normalizedMovs = (movs ?? []).map((m: any) => {
      const creator = Array.isArray(m.creator) ? m.creator[0] : m.creator;
      return { ...m, creator_name: creator?.full_name ?? '' };
    }) as CashMovement[];

    setMovements(normalizedMovs);

    setSalesByMethod(
      await fetchSalesByMethod(
        data.id,
        data.opened_at,
        null, // turno abierto: hasta ahora
        data.business_line_id ?? null,
      ),
    );

    setLoading(false);
  }, [activeBusinessLine, isAllLines]);

  const fetchHistory = useCallback(async () => {
    let query = supabase
      .from('cash_register_sessions')
      .select('*, opener:profiles!cash_register_sessions_opened_by_fkey(full_name), closer:profiles!cash_register_sessions_closed_by_fkey(full_name)')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(20);

    if (activeBusinessLine && !isAllLines) {
      query = query.eq('business_line_id', activeBusinessLine.id);
    }

    const { data } = await query;

    const normalized = (data ?? []).map((s: any) => {
      const opener = Array.isArray(s.opener) ? s.opener[0] : s.opener;
      const closer = Array.isArray(s.closer) ? s.closer[0] : s.closer;
      return {
        ...s,
        opener_name: opener?.full_name ?? '',
        closer_name: closer?.full_name ?? '',
      };
    }) as CashSession[];

    setHistory(normalized);
  }, [activeBusinessLine, isAllLines]);

  useEffect(() => {
    fetchActiveSession();
    fetchHistory();

    const channel = supabase
      .channel('cash-register')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_register_sessions' },
        () => {
          fetchActiveSession();
          fetchHistory();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_register_movements' },
        () => fetchActiveSession(),
      )
      // Los cobros con tarjeta/transferencia no generan movimiento de caja, así
      // que sin esto el desglose no se refrescaría al cobrar.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => fetchActiveSession(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveSession, fetchHistory]);

  async function openSession(openingAmount: number) {
    if (!activeBusinessLine) throw new Error('Selecciona una linea especifica para abrir caja');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('cash_register_sessions')
      .insert({
        opened_by: user.id,
        opening_amount: openingAmount,
        business_line_id: activeBusinessLine.id,
      });

    if (error) throw error;
    await fetchActiveSession();
  }

  async function closeSession(closingAmount: number, notes?: string) {
    if (!activeSession) throw new Error('No hay turno activo');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Calculate expected amount
    const sales = movements.filter((m) => m.type === 'sale').reduce((s, m) => s + m.amount, 0);
    const deposits = movements.filter((m) => m.type === 'deposit').reduce((s, m) => s + m.amount, 0);
    const tips = movements.filter((m) => m.type === 'tip').reduce((s, m) => s + m.amount, 0);
    const withdrawals = movements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0);

    const expected = activeSession.opening_amount + sales + deposits + tips - withdrawals;
    const difference = Math.round((closingAmount - expected) * 100) / 100;

    const { error } = await supabase
      .from('cash_register_sessions')
      .update({
        closed_by: user.id,
        closing_amount: closingAmount,
        expected_amount: Math.round(expected * 100) / 100,
        difference,
        closed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', activeSession.id);

    if (error) throw error;
    await fetchActiveSession();
    await fetchHistory();
  }

  async function addMovement(type: 'withdrawal' | 'deposit', amount: number, description?: string) {
    if (!activeSession) throw new Error('No hay turno activo');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('cash_register_movements')
      .insert({
        session_id: activeSession.id,
        type,
        amount,
        description: description || null,
        created_by: user.id,
      });

    if (error) throw error;
    await fetchActiveSession();
  }

  // Computed summary for active session
  const summary = {
    sales: movements.filter((m) => m.type === 'sale').reduce((s, m) => s + m.amount, 0),
    deposits: movements.filter((m) => m.type === 'deposit').reduce((s, m) => s + m.amount, 0),
    tips: movements.filter((m) => m.type === 'tip').reduce((s, m) => s + m.amount, 0),
    withdrawals: movements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0),
    get expected() {
      return (activeSession?.opening_amount ?? 0) + this.sales + this.deposits + this.tips - this.withdrawals;
    },
  };

  return {
    activeSession,
    movements,
    history,
    loading,
    summary,
    salesByMethod,
    openSession,
    closeSession,
    addMovement,
    refetch: fetchActiveSession,
  };
}

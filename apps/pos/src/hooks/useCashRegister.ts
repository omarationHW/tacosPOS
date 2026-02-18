import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

export function useCashRegister() {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('cash_register_sessions')
      .select('*, opener:profiles!cash_register_sessions_opened_by_fkey(full_name)')
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setActiveSession(null);
      setMovements([]);
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
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('cash_register_sessions')
      .select('*, opener:profiles!cash_register_sessions_opened_by_fkey(full_name), closer:profiles!cash_register_sessions_closed_by_fkey(full_name)')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(20);

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
  }, []);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveSession, fetchHistory]);

  async function openSession(openingAmount: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('cash_register_sessions')
      .insert({
        opened_by: user.id,
        opening_amount: openingAmount,
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
    openSession,
    closeSession,
    addMovement,
    refetch: fetchActiveSession,
  };
}

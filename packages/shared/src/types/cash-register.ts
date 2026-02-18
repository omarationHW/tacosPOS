export interface CashRegisterSession {
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
  created_at: string;
  updated_at: string;
}

export interface CashRegisterMovement {
  id: string;
  session_id: string;
  type: 'sale' | 'withdrawal' | 'deposit' | 'tip';
  amount: number;
  description: string | null;
  order_id: string | null;
  created_by: string;
  created_at: string;
}

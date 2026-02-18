import type { TableStatus } from '../constants.js';

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  position_x: number | null;
  position_y: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

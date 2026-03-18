import type { UserRole } from '../constants.js';
import type { BusinessLineRecord } from './business-line.js';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  pin_hash: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  business_lines?: BusinessLineRecord[];
}

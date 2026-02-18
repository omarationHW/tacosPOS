import type { UserRole } from '../constants.js';

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
}

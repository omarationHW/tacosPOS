import type { BusinessLine } from '../constants.js';

export interface BusinessLineRecord {
  id: string;
  slug: BusinessLine;
  name: string;
  schedule: {
    days: string[];
    start: string;
    end: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

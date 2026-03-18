import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { BusinessLineRecord } from '@tacos-pos/shared/types';
import { useAuth } from './AuthContext';

interface BusinessLineContextValue {
  activeBusinessLine: BusinessLineRecord | null;
  setActiveBusinessLine: (line: BusinessLineRecord) => void;
  availableBusinessLines: BusinessLineRecord[];
  clearBusinessLine: () => void;
  /** Admin selected "Ambas lineas" — no filtering */
  isAllLines: boolean;
  setAllLines: () => void;
}

const BusinessLineContext = createContext<BusinessLineContextValue | null>(null);

const STORAGE_KEY = 'activeBusinessLineId';
const ALL_LINES_VALUE = '__all__';

export function BusinessLineProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const availableBusinessLines = profile?.business_lines ?? [];
  const isAdmin = profile?.role === 'admin';

  const [activeBusinessLine, setActiveBusinessLineState] = useState<BusinessLineRecord | null>(() => {
    const storedId = sessionStorage.getItem(STORAGE_KEY);
    if (storedId === ALL_LINES_VALUE) return null;
    if (storedId && availableBusinessLines.length > 0) {
      return availableBusinessLines.find((bl) => bl.id === storedId) ?? null;
    }
    return null;
  });

  const [isAllLines, setIsAllLines] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) === ALL_LINES_VALUE;
  });

  // Re-resolve when profile loads or changes
  useEffect(() => {
    if (availableBusinessLines.length === 0) {
      setActiveBusinessLineState(null);
      setIsAllLines(false);
      return;
    }

    const storedId = sessionStorage.getItem(STORAGE_KEY);

    if (storedId === ALL_LINES_VALUE && isAdmin) {
      setIsAllLines(true);
      setActiveBusinessLineState(null);
      return;
    }

    if (storedId && storedId !== ALL_LINES_VALUE) {
      const found = availableBusinessLines.find((bl) => bl.id === storedId);
      if (found) {
        setActiveBusinessLineState(found);
        setIsAllLines(false);
        return;
      }
    }

    // Auto-select if user only has one line
    if (availableBusinessLines.length === 1) {
      const single = availableBusinessLines[0];
      sessionStorage.setItem(STORAGE_KEY, single.id);
      setActiveBusinessLineState(single);
      setIsAllLines(false);
    }
  }, [availableBusinessLines, isAdmin]);

  const setActiveBusinessLine = (line: BusinessLineRecord) => {
    sessionStorage.setItem(STORAGE_KEY, line.id);
    setActiveBusinessLineState(line);
    setIsAllLines(false);
  };

  const setAllLines = () => {
    sessionStorage.setItem(STORAGE_KEY, ALL_LINES_VALUE);
    setActiveBusinessLineState(null);
    setIsAllLines(true);
  };

  const clearBusinessLine = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setActiveBusinessLineState(null);
    setIsAllLines(false);
  };

  return (
    <BusinessLineContext.Provider
      value={{ activeBusinessLine, setActiveBusinessLine, availableBusinessLines, clearBusinessLine, isAllLines, setAllLines }}
    >
      {children}
    </BusinessLineContext.Provider>
  );
}

export function useBusinessLine() {
  const ctx = useContext(BusinessLineContext);
  if (!ctx) throw new Error('useBusinessLine must be used within BusinessLineProvider');
  return ctx;
}

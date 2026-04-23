import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Density = 'compact' | 'normal' | 'comfortable';

interface DensityConfig {
  /** Tailwind grid-cols-X classes applied to the product grid per breakpoint. */
  gridCols: string;
  cardPadding: string;
  cardGap: string;
  titleSize: string;
  priceSize: string;
}

const CONFIG: Record<Density, DensityConfig> = {
  compact: {
    gridCols: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6',
    cardPadding: 'p-3',
    cardGap: 'gap-2',
    titleSize: 'text-xs lg:text-sm',
    priceSize: 'text-base',
  },
  normal: {
    gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5',
    cardPadding: 'p-4',
    cardGap: 'gap-3',
    titleSize: 'text-sm lg:text-base',
    priceSize: 'text-lg',
  },
  comfortable: {
    gridCols: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
    cardPadding: 'p-5',
    cardGap: 'gap-4',
    titleSize: 'text-base lg:text-lg',
    priceSize: 'text-xl',
  },
};

interface DensityContextValue {
  density: Density;
  setDensity: (d: Density) => void;
  config: DensityConfig;
}

const STORAGE_KEY = 'la-andaluza:pos-density';
const DensityContext = createContext<DensityContextValue | null>(null);

function readStored(): Density {
  if (typeof window === 'undefined') return 'normal';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'compact' || raw === 'normal' || raw === 'comfortable') return raw;
  return 'normal';
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => readStored());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, density);
    } catch {
      // ignore
    }
  }, [density]);

  const value = useMemo<DensityContextValue>(
    () => ({ density, setDensity: setDensityState, config: CONFIG[density] }),
    [density],
  );

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error('useDensity must be used inside DensityProvider');
  return ctx;
}

import {
  UtensilsCrossed,
  CupSoda,
  GlassWater,
  PlusCircle,
  CakeSlice,
  Tag,
  Package,
  type LucideProps,
} from 'lucide-react';
import type { ElementType } from 'react';

const iconMap: Record<string, ElementType> = {
  'utensils-crossed': UtensilsCrossed,
  'cup-soda': CupSoda,
  'glass-water': GlassWater,
  'plus-circle': PlusCircle,
  'cake-slice': CakeSlice,
  'tag': Tag,
};

interface LucideIconProps extends LucideProps {
  name: string;
}

export function LucideIcon({ name, ...props }: LucideIconProps) {
  const Icon = iconMap[name] ?? Package;
  return <Icon {...props} />;
}

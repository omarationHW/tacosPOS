import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  ChefHat,
  FolderOpen,
  Package,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'cashier', 'kitchen'] },
  { to: '/pos', label: 'Punto de Venta', icon: <ShoppingCart size={20} />, roles: ['admin', 'cashier'] },
  { to: '/cuentas', label: 'Cuentas', icon: <Receipt size={20} />, roles: ['admin', 'cashier'] },
  { to: '/kitchen', label: 'Cocina', icon: <ChefHat size={20} />, roles: ['admin', 'kitchen'] },
  { to: '/admin/categories', label: 'Categorías', icon: <FolderOpen size={20} />, roles: ['admin'] },
  { to: '/admin/products', label: 'Productos', icon: <Package size={20} />, roles: ['admin'] },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const role = profile?.role ?? 'cashier';

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-14 flex-col border-r border-gray-700 bg-gray-800 lg:w-56">
      <div className="flex items-center justify-center gap-2 border-b border-gray-700 px-2 py-4 lg:justify-start lg:px-4">
        <span className="text-2xl">🌮</span>
        <span className="hidden text-base font-bold text-amber-500 lg:inline leading-tight">Taqueria La Andaluza</span>
      </div>

      <nav className="flex-1 space-y-1 p-2 lg:p-3">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center justify-center gap-3 rounded-lg px-0 py-2.5 text-sm font-medium transition-colors
              lg:justify-start lg:px-3
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'bg-amber-600/20 text-amber-500'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`
            }
          >
            {item.icon}
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-2 lg:p-3">
        <div className="mb-2 hidden px-3 text-xs text-gray-500 lg:block">
          {profile?.full_name || profile?.email}
        </div>
        <button
          onClick={signOut}
          title="Cerrar sesión"
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg px-0 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400
            lg:justify-start lg:px-3
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <LogOut size={20} />
          <span className="hidden lg:inline">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

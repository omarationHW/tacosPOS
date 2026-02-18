import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  ShoppingCart,
  Receipt,
  ChefHat,
  FolderOpen,
  Package,
  Wallet,
  BarChart3,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/pos', label: 'Punto de Venta', icon: <ShoppingCart size={20} />, roles: ['admin', 'cashier'] },
  { to: '/cuentas', label: 'Cuentas', icon: <Receipt size={20} />, roles: ['admin', 'cashier'] },
  { to: '/kitchen', label: 'Cocina', icon: <ChefHat size={20} />, roles: ['admin', 'kitchen'] },
  { to: '/caja', label: 'Caja', icon: <Wallet size={20} />, roles: ['admin', 'cashier'] },
  { to: '/reportes', label: 'Reportes', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { to: '/admin/categories', label: 'Categorias', icon: <FolderOpen size={20} />, roles: ['admin'] },
  { to: '/admin/products', label: 'Productos', icon: <Package size={20} />, roles: ['admin'] },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const role = profile?.role ?? 'cashier';
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={`flex h-full flex-col border-r border-gray-700 bg-gray-800 transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-14 lg:w-56'
      }`}
    >
      <div className={`flex items-center gap-2 border-b border-gray-700 px-2 py-4 ${
        collapsed ? 'justify-center' : 'justify-center lg:justify-start lg:px-4'
      }`}>
        <span className="text-2xl">🌮</span>
        {!collapsed && (
          <span className="hidden text-base font-bold text-amber-500 lg:inline leading-tight">Taqueria La Andaluza</span>
        )}
      </div>

      <nav className={`flex-1 space-y-1 p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                collapsed
                  ? 'justify-center px-0'
                  : 'justify-center px-0 lg:justify-start lg:px-3'
              } ${
                isActive
                  ? 'bg-amber-600/20 text-amber-500'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`
            }
          >
            {item.icon}
            {!collapsed && <span className="hidden lg:inline">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`border-t border-gray-700 p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
        {!collapsed && (
          <div className="mb-2 hidden px-3 text-xs text-gray-500 lg:block">
            {profile?.full_name || profile?.email}
          </div>
        )}
        <button
          onClick={signOut}
          title="Cerrar sesión"
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              collapsed
                ? 'justify-center px-0'
                : 'justify-center px-0 lg:justify-start lg:px-3'
            }`}
        >
          <LogOut size={20} />
          {!collapsed && <span className="hidden lg:inline">Cerrar sesión</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menú' : 'Compactar menú'}
          className="mt-1 hidden w-full cursor-pointer items-center justify-center gap-3 rounded-lg py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:flex"
        >
          {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          {!collapsed && <span className="hidden lg:inline">Compactar</span>}
        </button>
      </div>
    </aside>
  );
}

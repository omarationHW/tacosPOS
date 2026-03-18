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
  Users,
  UserCheck,
  Layers,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessLine } from '@/contexts/BusinessLineContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/pos', label: 'Punto de Venta', icon: <ShoppingCart size={20} />, roles: ['admin', 'cashier', 'waiter'] },
  { to: '/cuentas', label: 'Cuentas', icon: <Receipt size={20} />, roles: ['admin', 'cashier', 'waiter'] },
  { to: '/kitchen', label: 'Cocina', icon: <ChefHat size={20} />, roles: ['admin', 'kitchen', 'cashier', 'waiter'] },
  { to: '/caja', label: 'Caja', icon: <Wallet size={20} />, roles: ['admin', 'cashier', 'waiter'] },
  { to: '/reportes', label: 'Reportes', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { to: '/admin/categories', label: 'Categorias', icon: <FolderOpen size={20} />, roles: ['admin'] },
  { to: '/admin/products', label: 'Productos', icon: <Package size={20} />, roles: ['admin'] },
  { to: '/admin/orders', label: 'Historial', icon: <ClipboardList size={20} />, roles: ['admin'] },
  { to: '/admin/staff', label: 'Personal', icon: <Users size={20} />, roles: ['admin'] },
  { to: '/admin/customers', label: 'Clientes', icon: <UserCheck size={20} />, roles: ['admin'] },
];

const lineEmoji: Record<string, string> = {
  hamburguesas: '\uD83C\uDF54',
  carnitas: '\uD83E\uDD69',
};

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const { activeBusinessLine, availableBusinessLines, setActiveBusinessLine, isAllLines, setAllLines } = useBusinessLine();
  const role = profile?.role ?? 'cashier';
  const isAdmin = role === 'admin';
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(role));
  const showLineSwitcher = isAdmin && availableBusinessLines.length > 1;

  return (
    <aside
      className={`flex h-full flex-col border-r border-gray-700 bg-gray-800 transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-14 lg:w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex flex-col items-center border-b border-gray-700 ${
        collapsed ? 'px-2 py-3' : 'px-2 py-3 lg:px-4 lg:py-4'
      }`}>
        <img
          src="/Logo - La Andaluza_V.svg"
          alt="Taqueria La Andaluza"
          className={collapsed ? 'h-9 w-auto' : 'h-9 w-auto lg:h-20'}
        />
      </div>

      {/* Business line switcher (admin only) */}
      {showLineSwitcher && (
        <div className={`border-b border-gray-700 p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
          {availableBusinessLines.map((bl) => {
            const isActive = !isAllLines && activeBusinessLine?.id === bl.id;
            const emoji = lineEmoji[bl.slug] ?? '';
            return (
              <button
                key={bl.id}
                onClick={() => setActiveBusinessLine(bl)}
                title={bl.name}
                className={`mb-1 flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    collapsed
                      ? 'justify-center px-0'
                      : 'justify-center px-0 lg:justify-start lg:px-3'
                  } ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-400'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
              >
                <span className="text-base">{emoji || bl.name.charAt(0)}</span>
                {!collapsed && <span className="hidden lg:inline">{bl.name}</span>}
              </button>
            );
          })}
          <button
            onClick={setAllLines}
            title="Todas las lineas"
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                collapsed
                  ? 'justify-center px-0'
                  : 'justify-center px-0 lg:justify-start lg:px-3'
              } ${
                isAllLines
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
          >
            <Layers size={18} />
            {!collapsed && <span className="hidden lg:inline">Todas</span>}
          </button>
        </div>
      )}

      {/* Non-admin: show current line badge */}
      {!showLineSwitcher && !collapsed && activeBusinessLine && (
        <div className="hidden border-b border-gray-700 px-4 py-2 lg:block">
          <div className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-center">
            <span className="text-xs font-semibold text-amber-400">
              {activeBusinessLine.name}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 overflow-y-auto p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
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

      {/* Footer */}
      <div className={`border-t border-gray-700 p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
        {!collapsed && (
          <div className="mb-2 hidden px-3 text-xs text-gray-500 lg:block">
            {profile?.full_name || profile?.email}
          </div>
        )}

        <button
          onClick={signOut}
          title="Cerrar sesion"
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              collapsed
                ? 'justify-center px-0'
                : 'justify-center px-0 lg:justify-start lg:px-3'
            }`}
        >
          <LogOut size={20} />
          {!collapsed && <span className="hidden lg:inline">Cerrar sesion</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menu' : 'Compactar menu'}
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

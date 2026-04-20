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
  KeyRound,
  Sandwich,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';

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

function LineIcon({ slug }: { slug: string }) {
  if (slug === 'hamburguesas') return <Sandwich size={18} />;
  if (slug === 'carnitas') return <UtensilsCrossed size={18} />;
  return <Layers size={18} />;
}

const NAV_BASE =
  'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]';
const NAV_IDLE =
  'text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-fg)]';
const NAV_ACTIVE =
  'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]';

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const { activeBusinessLine, availableBusinessLines, setActiveBusinessLine, isAllLines, setAllLines } = useBusinessLine();
  const role = profile?.role ?? 'cashier';
  const isAdmin = role === 'admin';
  const [collapsed, setCollapsed] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(role));
  const showLineSwitcher = isAdmin && availableBusinessLines.length > 1;

  const layoutClass = (center: boolean) =>
    collapsed
      ? 'justify-center px-0'
      : center
        ? 'justify-center px-0 lg:justify-start lg:px-3'
        : 'justify-center px-0 lg:justify-start lg:px-3';

  return (
    <aside
      className={`flex h-full flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-14 lg:w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex flex-col items-center border-b border-[color:var(--color-border)] ${
        collapsed ? 'px-2 py-3' : 'px-2 py-3 lg:px-4 lg:py-4'
      }`}>
        <img
          src="/Logo - La Andaluza_V.svg"
          alt="Taqueria La Andaluza"
          className={`${collapsed ? 'h-9' : 'h-9 lg:h-20'} w-auto dark:invert-0`}
        />
      </div>

      {/* Business line switcher (admin only) */}
      {showLineSwitcher && (
        <div className={`border-b border-[color:var(--color-border)] p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
          {availableBusinessLines.map((bl) => {
            const isActive = !isAllLines && activeBusinessLine?.id === bl.id;
            return (
              <button
                key={bl.id}
                onClick={() => setActiveBusinessLine(bl)}
                title={bl.name}
                className={`mb-1 flex w-full cursor-pointer items-center gap-3 ${NAV_BASE} ${layoutClass(true)} ${
                  isActive ? NAV_ACTIVE : NAV_IDLE
                }`}
              >
                <LineIcon slug={bl.slug} />
                {!collapsed && <span className="hidden lg:inline">{bl.name}</span>}
              </button>
            );
          })}
          <button
            onClick={setAllLines}
            title="Todas las lineas"
            className={`flex w-full cursor-pointer items-center gap-3 ${NAV_BASE} ${layoutClass(true)} ${
              isAllLines ? NAV_ACTIVE : NAV_IDLE
            }`}
          >
            <Layers size={18} />
            {!collapsed && <span className="hidden lg:inline">Todas</span>}
          </button>
        </div>
      )}

      {/* Non-admin: show current line badge */}
      {!showLineSwitcher && !collapsed && activeBusinessLine && (
        <div className="hidden border-b border-[color:var(--color-border)] px-4 py-2 lg:block">
          <div className="rounded-lg bg-[color:var(--color-accent-soft)] px-3 py-1.5 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-accent)]">
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
              `${NAV_BASE} ${layoutClass(true)} ${isActive ? NAV_ACTIVE : NAV_IDLE}`
            }
          >
            {item.icon}
            {!collapsed && <span className="hidden lg:inline">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-[color:var(--color-border)] p-2 ${!collapsed ? 'lg:p-3' : ''}`}>
        <div className={`mb-2 ${collapsed ? '' : 'hidden lg:block'}`}>
          <ThemeToggle collapsed={collapsed} />
        </div>

        {!collapsed && (
          <div className="mb-2 hidden truncate px-3 text-xs text-[color:var(--color-fg-subtle)] lg:block">
            {profile?.full_name || profile?.email}
          </div>
        )}

        <button
          onClick={() => setPinModalOpen(true)}
          title="Cambiar PIN"
          className={`mb-1 flex w-full cursor-pointer items-center gap-3 ${NAV_BASE} ${layoutClass(true)} ${NAV_IDLE}`}
        >
          <KeyRound size={20} />
          {!collapsed && <span className="hidden lg:inline">Cambiar PIN</span>}
        </button>

        <button
          onClick={signOut}
          title="Cerrar sesion"
          className={`flex w-full cursor-pointer items-center gap-3 ${NAV_BASE} ${layoutClass(true)} text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-inset)] hover:text-[color:var(--color-danger)]`}
        >
          <LogOut size={20} />
          {!collapsed && <span className="hidden lg:inline">Cerrar sesion</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menu' : 'Compactar menu'}
          className={`mt-1 hidden w-full cursor-pointer items-center justify-center gap-3 ${NAV_BASE} ${NAV_IDLE} lg:flex`}
        >
          {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          {!collapsed && <span className="hidden lg:inline">Compactar</span>}
        </button>
      </div>

      <ProfileSettingsModal open={pinModalOpen} onOpenChange={setPinModalOpen} />
    </aside>
  );
}

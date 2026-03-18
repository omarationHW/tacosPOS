import { useNavigate } from 'react-router';
import { Beef, Clock, Layers } from 'lucide-react';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { BusinessLineRecord } from '@tacos-pos/shared/types';

const lineConfig: Record<string, { icon: typeof Beef; gradient: string; emoji: string }> = {
  hamburguesas: {
    icon: Beef,
    gradient: 'from-amber-600 to-orange-700',
    emoji: '\uD83C\uDF54',
  },
  carnitas: {
    icon: Beef,
    gradient: 'from-red-700 to-rose-800',
    emoji: '\uD83E\uDD69',
  },
};

const dayLabels: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mie',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sab',
  sunday: 'Dom',
};

function formatSchedule(schedule: BusinessLineRecord['schedule']): string {
  const days = schedule.days.map((d) => dayLabels[d] ?? d).join(', ');
  return `${days} \u00B7 ${schedule.start} - ${schedule.end}`;
}

export function BusinessLineSelect() {
  const { availableBusinessLines, setActiveBusinessLine, setAllLines } = useBusinessLine();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const roleHome: Record<string, string> = {
    admin: '/reportes',
    cashier: '/pos',
    waiter: '/pos',
    kitchen: '/kitchen',
  };

  const handleSelect = (line: BusinessLineRecord) => {
    setActiveBusinessLine(line);
    const target = roleHome[profile?.role ?? 'cashier'] ?? '/pos';
    navigate(target, { replace: true });
  };

  const handleSelectAll = () => {
    setAllLines();
    const target = roleHome[profile?.role ?? 'cashier'] ?? '/pos';
    navigate(target, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <img
            src="/Logo - La Andaluza_V.svg"
            alt="Taqueria La Andaluza"
            className="mx-auto mb-4 h-24"
          />
          <h1 className="text-2xl font-bold text-gray-100">Selecciona tu linea</h1>
          <p className="text-sm text-gray-400">
            {profile?.full_name ?? profile?.email}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {availableBusinessLines.map((line) => {
            const config = lineConfig[line.slug] ?? lineConfig.hamburguesas;
            return (
              <button
                key={line.id}
                onClick={() => handleSelect(line)}
                className={`group flex cursor-pointer items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800 p-6 text-left transition-all
                  hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
              >
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient} text-3xl`}>
                  {config.emoji}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-100 group-hover:text-amber-400 transition-colors">
                    {line.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
                    <Clock size={14} />
                    {formatSchedule(line.schedule)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Admin: Ambas lineas */}
        {isAdmin && availableBusinessLines.length > 1 && (
          <div className="mt-2">
            <button
              onClick={handleSelectAll}
              className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-gray-600 bg-gray-800/50 p-6 text-left transition-all
                hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 text-2xl">
                <Layers size={32} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-100 group-hover:text-amber-400 transition-colors">
                  Ambas Lineas
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Ver y gestionar todas las lineas de negocio
                </p>
              </div>
            </button>
          </div>
        )}

        {availableBusinessLines.length === 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-gray-500">
            No tienes lineas de negocio asignadas. Contacta al administrador.
          </div>
        )}
      </div>
    </div>
  );
}

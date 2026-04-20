import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Clock, Layers, Sandwich, UtensilsCrossed } from 'lucide-react';
import { useBusinessLine } from '@/contexts/BusinessLineContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { BusinessLineRecord } from '@tacos-pos/shared/types';

const dayLabels: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
};

function formatSchedule(schedule: BusinessLineRecord['schedule']): string {
  const days = schedule.days.map((d) => dayLabels[d] ?? d).join(' · ');
  return `${days}  ${schedule.start}–${schedule.end}`;
}

function LineGraphic({ slug }: { slug: string }) {
  if (slug === 'carnitas') return <UtensilsCrossed size={36} strokeWidth={1.5} />;
  return <Sandwich size={36} strokeWidth={1.5} />;
}

const LINE_ACCENT: Record<string, { accent: string; soft: string }> = {
  hamburguesas: { accent: '#ff5722', soft: 'rgba(255,87,34,0.12)' },
  carnitas:     { accent: '#c2185b', soft: 'rgba(194,24,91,0.12)' },
};

export function BusinessLineSelect() {
  const { availableBusinessLines, setActiveBusinessLine, setAllLines } = useBusinessLine();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[color:var(--color-bg)]">
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
    navigate(roleHome[profile?.role ?? 'cashier'] ?? '/pos', { replace: true });
  };

  const handleSelectAll = () => {
    setAllLines();
    navigate(roleHome[profile?.role ?? 'cashier'] ?? '/pos', { replace: true });
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[color:var(--color-bg)] p-6">
      <div className="flex w-full max-w-4xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 flex flex-col items-center"
        >
          <img
            src="/Logo - La Andaluza_V.svg"
            alt="Taquería La Andaluza"
            className="mb-3 h-14 opacity-90"
          />
          <h1 className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">
            Selecciona la línea
          </h1>
          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
            {profile?.full_name ?? profile?.email}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
          }}
          className="grid w-full gap-4 md:grid-cols-2"
        >
          {availableBusinessLines.map((line) => {
            const accent = LINE_ACCENT[line.slug] ?? LINE_ACCENT.hamburguesas;
            return (
              <motion.button
                key={line.id}
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.96 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                onClick={() => handleSelect(line)}
                style={{
                  ['--line-accent' as string]: accent.accent,
                  ['--line-soft' as string]: accent.soft,
                }}
                className="group relative flex min-h-[150px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-2 bg-[color:var(--color-bg-elevated)] p-5 text-left transition-colors
                  border-[color:var(--color-border)] hover:border-[color:var(--line-accent)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
              >
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: 'var(--line-soft)' }}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl"
                    style={{ background: 'var(--line-soft)', color: 'var(--line-accent)' }}
                  >
                    <LineGraphic slug={line.slug} />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] px-2.5 py-1 text-[10px] text-[color:var(--color-fg-muted)]">
                    <Clock size={10} />
                    {formatSchedule(line.schedule)}
                  </div>
                </div>

                <div className="relative mt-3">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-[color:var(--color-fg)]">
                    {line.name}
                  </h2>
                  <p
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                    style={{ color: 'var(--line-accent)' }}
                  >
                    Entrar
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      →
                    </motion.span>
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {isAdmin && availableBusinessLines.length > 1 && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleSelectAll}
            className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[color:var(--color-border-strong)] bg-transparent px-4 py-3 text-left transition-colors
              hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-[color:var(--color-fg)]">
                Ambas líneas
              </h2>
              <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                Ver y gestionar todas en paralelo
              </p>
            </div>
          </motion.button>
        )}

        {availableBusinessLines.length === 0 && (
          <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-6 text-center text-sm text-[color:var(--color-fg-muted)]">
            No tienes líneas de negocio asignadas. Contacta al administrador.
          </div>
        )}
      </div>
    </div>
  );
}

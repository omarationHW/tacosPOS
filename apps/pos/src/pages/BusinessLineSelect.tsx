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
  if (slug === 'carnitas') return <UtensilsCrossed size={56} strokeWidth={1.5} />;
  return <Sandwich size={56} strokeWidth={1.5} />;
}

/**
 * Inline line-scoped accent — we don't want the page to auto-adopt
 * a single line's color until the user picks one, so each card carries
 * its own accent via inline style variables.
 */
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
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] p-8">
      <div className="w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10 text-center"
        >
          <img
            src="/Logo - La Andaluza_V.svg"
            alt="Taqueria La Andaluza"
            className="mx-auto mb-6 h-24 opacity-90"
          />
          <h1 className="font-display text-4xl font-semibold text-[color:var(--color-fg)]">
            Selecciona la línea
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
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
          className="grid gap-6 md:grid-cols-2"
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
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                onClick={() => handleSelect(line)}
                style={{
                  ['--line-accent' as string]: accent.accent,
                  ['--line-soft' as string]: accent.soft,
                }}
                className="group relative flex min-h-[240px] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border-2 bg-[color:var(--color-bg-elevated)] p-8 text-left transition-colors
                  border-[color:var(--color-border)] hover:border-[color:var(--line-accent)]
                  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--color-accent-ring)]"
              >
                <div
                  aria-hidden
                  className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: 'var(--line-soft)' }}
                />

                <div className="relative flex items-start justify-between">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl"
                    style={{ background: 'var(--line-soft)', color: 'var(--line-accent)' }}
                  >
                    <LineGraphic slug={line.slug} />
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs text-[color:var(--color-fg-muted)]">
                    <Clock size={12} />
                    {formatSchedule(line.schedule)}
                  </div>
                </div>

                <div className="relative">
                  <h2 className="font-display text-4xl font-bold tracking-tight text-[color:var(--color-fg)]">
                    {line.name}
                  </h2>
                  <p
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider transition-colors"
                    style={{ color: 'var(--line-accent)' }}
                  >
                    Entrar
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
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
            className="mt-6 flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[color:var(--color-border-strong)] bg-transparent px-6 py-5 text-left transition-colors
              hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]">
              <Layers size={24} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[color:var(--color-fg)]">
                Ambas líneas
              </h2>
              <p className="text-xs text-[color:var(--color-fg-muted)]">
                Ver y gestionar todas las líneas de negocio en paralelo
              </p>
            </div>
          </motion.button>
        )}

        {availableBusinessLines.length === 0 && (
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-8 text-center text-[color:var(--color-fg-muted)]">
            No tienes líneas de negocio asignadas. Contacta al administrador.
          </div>
        )}
      </div>
    </div>
  );
}

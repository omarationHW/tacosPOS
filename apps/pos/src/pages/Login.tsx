import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Sandwich, UtensilsCrossed, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PinPad } from '@/components/ui/PinPad';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type LoginProfile = {
  id: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'waiter' | 'kitchen';
  avatar_url: string | null;
  line_slugs: string[];
};

type LoginLine = { id: string; name: string; slug: string };

/** Selección del primer paso: una línea concreta o el grupo "Personal". */
type LineChoice = LoginLine | 'staff';

const ROLE_LABEL: Record<LoginProfile['role'], string> = {
  admin:   'Administrador',
  cashier: 'Cajero',
  waiter:  'Mesero',
  kitchen: 'Cocina',
};

const LINE_ACCENT: Record<string, { accent: string; soft: string }> = {
  hamburguesas: { accent: '#ff5722', soft: 'rgba(255,87,34,0.12)' },
  carnitas:     { accent: '#c2185b', soft: 'rgba(194,24,91,0.12)' },
};

function lineAccent(slug: string) {
  return LINE_ACCENT[slug] ?? LINE_ACCENT.hamburguesas;
}

function LineIcon({ slug, size = 34 }: { slug: string; size?: number }) {
  if (slug === 'carnitas') return <UtensilsCrossed size={size} strokeWidth={1.5} />;
  return <Sandwich size={size} strokeWidth={1.5} />;
}

function initials(fullName: string) {
  const source = fullName.trim() || '??';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function Login() {
  const { user, loading: authLoading, signInWithPin } = useAuth();
  const [profiles, setProfiles] = useState<LoginProfile[] | null>(null);
  const [lines, setLines] = useState<LoginLine[]>([]);
  const [choice, setChoice] = useState<LineChoice | null>(null);
  const [selected, setSelected] = useState<LoginProfile | null>(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorSignal, setErrorSignal] = useState(0);

  useEffect(() => {
    supabase.rpc('list_profiles_for_login').then(({ data, error }) => {
      if (error) {
        toast.error('No se pudieron cargar los perfiles');
        setProfiles([]);
        return;
      }
      setProfiles((data ?? []) as LoginProfile[]);
    });
    supabase.rpc('list_login_business_lines').then(({ data, error }) => {
      if (error || !data) {
        setLines([]);
        return;
      }
      setLines(data as LoginLine[]);
    });
  }, []);

  // Cajeros de la línea elegida, o el personal (no cajeros) para "Personal".
  const shownProfiles = useMemo(() => {
    if (!choice || !profiles) return [];
    if (choice === 'staff') return profiles.filter((p) => p.role !== 'cashier');
    return profiles.filter(
      (p) => p.role === 'cashier' && p.line_slugs.includes(choice.slug),
    );
  }, [choice, profiles]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[color:var(--color-bg)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handlePinComplete = async (value: string) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      // Si entró por una línea, deja esa línea preseleccionada para saltarse
      // la pantalla de "Selecciona la línea" tras iniciar sesión.
      if (choice && choice !== 'staff') {
        sessionStorage.setItem('activeBusinessLineId', choice.id);
      }
      await signInWithPin(selected.id, value);
      toast.success(`Bienvenido, ${selected.full_name || 'usuario'}`);
    } catch {
      sessionStorage.removeItem('activeBusinessLineId');
      setPin('');
      setErrorSignal((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const backToLines = () => {
    setSelected(null);
    setChoice(null);
    setPin('');
  };

  const backToProfiles = () => {
    setSelected(null);
    setPin('');
  };

  const stage: 'line' | 'profile' | 'pin' = selected ? 'pin' : choice ? 'profile' : 'line';

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[color:var(--color-bg)] px-4 py-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--color-accent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full opacity-15 blur-3xl"
        style={{ background: 'var(--color-accent)' }}
      />

      <AnimatePresence mode="wait">
        {/* PASO 1: elegir línea (o Personal) */}
        {stage === 'line' && (
          <motion.div
            key="lines"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6"
          >
            <img
              src="/Logo - La Andaluza_V.svg"
              alt="Taquería La Andaluza"
              className="h-16 w-auto opacity-90"
            />
            <h1 className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">
              ¿Qué turno vas a operar?
            </h1>

            {profiles === null || lines.length === 0 ? (
              <LoadingSpinner size="md" />
            ) : (
              <div className="grid w-full gap-4 sm:grid-cols-2">
                {lines.map((line) => {
                  const accent = lineAccent(line.slug);
                  return (
                    <motion.button
                      key={line.id}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setChoice(line)}
                      style={{ ['--line-accent' as string]: accent.accent, ['--line-soft' as string]: accent.soft }}
                      className="group flex min-h-[140px] cursor-pointer flex-col justify-between rounded-2xl border-2 border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-5 text-left transition-colors
                        hover:border-[color:var(--line-accent)]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                    >
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl"
                        style={{ background: 'var(--line-soft)', color: 'var(--line-accent)' }}
                      >
                        <LineIcon slug={line.slug} />
                      </div>
                      <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight text-[color:var(--color-fg)]">
                          {line.name}
                        </h2>
                        <p
                          className="mt-1 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--line-accent)' }}
                        >
                          Elegir cajero →
                        </p>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Personal (admin / cocina / mesero) */}
                {profiles.some((p) => p.role !== 'cashier') && (
                  <motion.button
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setChoice('staff')}
                    className="group flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[color:var(--color-border-strong)] bg-transparent p-4 text-left transition-colors
                      hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)] sm:col-span-2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--color-bg-inset)] text-[color:var(--color-fg-muted)]">
                      <Users size={18} />
                    </div>
                    <div>
                      <h2 className="font-display text-sm font-semibold text-[color:var(--color-fg)]">
                        Personal
                      </h2>
                      <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                        Administración y cocina
                      </p>
                    </div>
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* PASO 2: elegir cajero/perfil dentro del turno */}
        {stage === 'profile' && choice && (
          <motion.div
            key="profiles"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-full w-full max-w-4xl flex-col items-center gap-5"
          >
            <button
              onClick={backToLines}
              className="absolute left-2 top-2 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
            >
              <ArrowLeft size={16} /> Cambiar turno
            </button>

            <img
              src="/Logo - La Andaluza_V.svg"
              alt="Taquería La Andaluza"
              className="h-14 w-auto opacity-90"
            />
            <h1 className="font-display text-2xl font-semibold text-[color:var(--color-fg)]">
              {choice === 'staff' ? 'Selecciona tu perfil' : `Cajero · ${choice.name}`}
            </h1>

            {shownProfiles.length === 0 ? (
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                No hay cajeros asignados a este turno.
              </p>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                className="grid w-full grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
              >
                {shownProfiles.map((p) => (
                  <motion.button
                    key={p.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelected(p)}
                    className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-3 transition-colors
                      hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-inset)] font-display text-base font-semibold text-[color:var(--color-fg)]">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(p.full_name)
                      )}
                    </span>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-[color:var(--color-fg)] line-clamp-1">
                        {p.full_name || 'Sin nombre'}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
                        {ROLE_LABEL[p.role]}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PASO 3: PIN */}
        {stage === 'pin' && selected && (
          <motion.div
            key="pinpad"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex w-full max-w-3xl items-center justify-center gap-8 xl:max-w-4xl xl:gap-10"
          >
            <button
              onClick={backToProfiles}
              className="absolute left-4 top-4 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
            >
              <ArrowLeft size={16} /> Cambiar cajero
            </button>

            <div className="flex flex-col items-center gap-3">
              <img
                src="/Logo - La Andaluza_V.svg"
                alt="Taquería La Andaluza"
                className="h-14 w-auto opacity-90"
              />
              <span className="mt-1 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-inset)] font-display text-xl font-semibold text-[color:var(--color-fg)]">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(selected.full_name)
                )}
              </span>
              <div className="text-center">
                <h2 className="font-display text-xl font-semibold text-[color:var(--color-fg)]">
                  {selected.full_name || 'Sin nombre'}
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
                  {ROLE_LABEL[selected.role]}
                </p>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
                Ingresa tu PIN
              </p>
            </div>

            <PinPad
              size="sm"
              value={pin}
              onChange={setPin}
              onComplete={handlePinComplete}
              errorSignal={errorSignal}
              disabled={submitting}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

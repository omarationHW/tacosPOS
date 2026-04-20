import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
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
};

const ROLE_LABEL: Record<LoginProfile['role'], string> = {
  admin:   'Administrador',
  cashier: 'Cajero',
  waiter:  'Mesero',
  kitchen: 'Cocina',
};

function initials(fullName: string) {
  const source = fullName.trim() || '??';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function Login() {
  const { user, loading: authLoading, signInWithPin } = useAuth();
  const [profiles, setProfiles] = useState<LoginProfile[] | null>(null);
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
  }, []);

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
      await signInWithPin(selected.id, value);
      toast.success(`Bienvenido, ${selected.full_name || 'usuario'}`);
    } catch {
      setPin('');
      setErrorSignal((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelected(null);
    setPin('');
  };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[color:var(--color-bg)] p-6">
      {/* Decorative accent blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40"
        style={{ background: 'var(--color-accent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--color-accent)' }}
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center">
        <img
          src="/Logo - La Andaluza_V.svg"
          alt="Taquería La Andaluza"
          className="mb-6 h-24 w-auto opacity-90"
        />

        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full flex-col items-center gap-6"
            >
              <h1 className="font-display text-3xl font-semibold text-[color:var(--color-fg)]">
                Selecciona tu perfil
              </h1>
              {profiles === null ? (
                <LoadingSpinner size="md" />
              ) : profiles.length === 0 ? (
                <p className="text-sm text-[color:var(--color-fg-muted)]">
                  No hay perfiles activos.
                </p>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.04 } },
                  }}
                  className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                >
                  {profiles.map((p) => (
                    <motion.button
                      key={p.id}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelected(p)}
                      className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-5 transition-colors
                        hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-soft)]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
                    >
                      <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-inset)] font-display text-xl font-semibold text-[color:var(--color-fg)]">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(p.full_name)
                        )}
                      </span>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-[color:var(--color-fg)] line-clamp-1">
                          {p.full_name || 'Sin nombre'}
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-subtle)]">
                          {ROLE_LABEL[p.role]}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="pinpad"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-8"
            >
              <button
                onClick={reset}
                className="absolute left-0 top-0 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--color-fg-muted)] transition-colors hover:text-[color:var(--color-fg)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-ring)]"
              >
                <ArrowLeft size={16} /> Cambiar perfil
              </button>

              <div className="flex flex-col items-center gap-2">
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-inset)] font-display text-2xl font-semibold text-[color:var(--color-fg)]">
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(selected.full_name)
                  )}
                </span>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[color:var(--color-fg)]">
                  {selected.full_name || 'Sin nombre'}
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
                  Ingresa tu PIN
                </p>
              </div>

              <PinPad
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
    </div>
  );
}

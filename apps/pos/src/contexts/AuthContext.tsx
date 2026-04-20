import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@tacos-pos/shared/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPin: (email: string, pin: string) => Promise<void>;
  changePin: (oldPin: string, newPin: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PIN_PASSWORD_PREFIX = 'la-andaluza-pin-';

function pinToPassword(pin: string) {
  return `${PIN_PASSWORD_PREFIX}${pin}`;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfileFromDB(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    // Profile missing — likely user was created before the trigger existed.
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { error: insertErr } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: authUser.email!,
        full_name: authUser.user_metadata?.full_name ?? '',
      }, { onConflict: 'id' });

    if (insertErr) return null;

    const { data: newProfile, error: retryErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (retryErr) return null;

    return await attachBusinessLines(newProfile as Profile | null);
  }

  return await attachBusinessLines(data as Profile | null);
}

async function attachBusinessLines(profile: Profile | null): Promise<Profile | null> {
  if (!profile) return null;

  const { data: links } = await supabase
    .from('profile_business_lines')
    .select('business_line_id, business_line:business_lines(*)')
    .eq('profile_id', profile.id);

  const businessLines = (links ?? []).map((link: any) => {
    const bl = Array.isArray(link.business_line) ? link.business_line[0] : link.business_line;
    return bl;
  }).filter(Boolean);

  return { ...profile, business_lines: businessLines };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetchId = useRef(0);

  // Stable function: fetch profile and set state, ignoring stale requests
  const loadProfile = useCallback(async (userId: string) => {
    const id = ++profileFetchId.current;
    const p = await fetchProfileFromDB(userId);
    // Only apply if this is still the latest request
    if (id === profileFetchId.current) {
      setProfile(p);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          loadProfile(s.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    // onAuthStateChange will handle setting user + profile
  };

  const signInWithPin = async (email: string, pin: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pinToPassword(pin),
    });
    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const changePin = async (oldPin: string, newPin: string) => {
    const { error } = await supabase.rpc('change_own_pin', {
      old_pin: oldPin,
      new_pin: newPin,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    sessionStorage.removeItem('activeBusinessLineId');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signInWithPin, changePin, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

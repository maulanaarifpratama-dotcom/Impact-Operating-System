import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fetch is deferred to avoid deadlocks inside the auth callback.
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[Auth] profile fetch failed:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  };

  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined' && window.location.search.includes('mock_auth=1')) {
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@impactory.id',
        user_metadata: { full_name: 'Dev User' },
      } as unknown as User;
      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
      } as unknown as Session;
      setSession(mockSession);
      setProfile({ id: mockUser.id, full_name: 'Dev User' } as any);
      setLoading(false);
      return;
    }

    // 1. Subscribe FIRST to avoid missing initial events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Defer Supabase calls to next tick — required pattern.
        setTimeout(() => { void fetchProfile(newSession.user.id); }, 0);
      } else {
        setProfile(null);
      }
    });

    // 2. Then check existing session.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        void fetchProfile(existing.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
    refreshProfile: async () => {
      if (session?.user) await fetchProfile(session.user.id);
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
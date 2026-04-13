import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  console.log('[Auth] fetchProfile called for user:', userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.log('[Auth] fetchProfile result:', { data, error: error?.message });
  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }
  return data as Profile;
}

function fetchProfileWithTimeout(userId: string, timeoutMs = 5000): Promise<Profile | null> {
  return Promise.race([
    fetchProfile(userId),
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`[Auth] Profile fetch timed out after ${timeoutMs}ms — continuing with null`);
        resolve(null);
      }, timeoutMs);
    }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      console.log('[Auth] initAuth — calling getSession...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Auth] initAuth — getSession result:', session ? `user ${session.user.id}` : 'no session');
      if (session?.user) {
        setUser(session.user);
        console.log('[Auth] initAuth — fetching profile...');
        const p = await fetchProfileWithTimeout(session.user.id);
        console.log('[Auth] initAuth — profile result:', p);
        setProfile(p);
      }
      console.log('[Auth] initAuth — setting loading=false');
      setLoading(false);
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('[Auth] onAuthStateChange — event:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          console.log('[Auth] onAuthStateChange — fetching profile...');
          const p = await fetchProfileWithTimeout(session.user.id);
          console.log('[Auth] onAuthStateChange — profile result:', p);
          setProfile(p);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        console.log('[Auth] onAuthStateChange — setting loading=false');
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

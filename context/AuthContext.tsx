import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { VaultStorage } from '../services/storage';

const AUTH_CACHE_USER_KEY = 'vault_cached_auth_user_v1';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = VaultStorage.getItem(AUTH_CACHE_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Check existing session from persistent storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(session.user));
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(session.user));
      } else {
        VaultStorage.removeItem(AUTH_CACHE_USER_KEY);
      }
      setIsLoading(false);
    });

    // Handle deep linking for email confirmation and auth callbacks
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const code = parsed.queryParams?.code;
        if (typeof code === 'string') {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            setSession(data.session);
            setUser(data.user);
            if (data.user) {
              VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(data.user));
            }
          }
        } else if (url.includes('access_token=') && url.includes('refresh_token=')) {
          const matchAccess = url.match(/access_token=([^&]+)/);
          const matchRefresh = url.match(/refresh_token=([^&]+)/);
          if (matchAccess && matchRefresh) {
            const access_token = decodeURIComponent(matchAccess[1]);
            const refresh_token = decodeURIComponent(matchRefresh[1]);
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!error && data.session) {
              setSession(data.session);
              setUser(data.user);
              if (data.user) {
                VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(data.user));
              }
            }
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Deep link handler error:', err);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkingSub = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      // Mock login for offline / unconfigured demo
      const mockUser: User = {
        id: 'user-demo',
        app_metadata: {},
        user_metadata: { name: email.split('@')[0] },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      };
      setUser(mockUser);
      VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(mockUser));
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(data.user));
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Authentication failed' };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null; needsConfirmation?: boolean }> => {
    if (!isSupabaseConfigured) {
      return signIn(email, password);
    }

    try {
      const redirectUrl = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(data.user));
      }
      return { error: null, needsConfirmation: !data.session };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } finally {
      setUser(null);
      setSession(null);
      VaultStorage.removeItem(AUTH_CACHE_USER_KEY);
    }
  };

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

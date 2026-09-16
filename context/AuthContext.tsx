import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { VaultStorage } from '../services/storage';
import { deriveMasterKey } from '../services/crypto/encryptionService';
import { VaultKeyManager } from '../services/crypto/vaultKeyManager';

const AUTH_CACHE_USER_KEY = 'vault_cached_auth_user_v1';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  hasVaultKey: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  restoreVaultKey: (password: string) => Promise<boolean>;
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
  const [hasVaultKey, setHasVaultKey] = useState<boolean>(() => VaultKeyManager.hasActiveKey());

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
        VaultKeyManager.loadKeyFromSecureStore(session.user.id)
          .then((k) => setHasVaultKey(Boolean(k)))
          .catch(() => setHasVaultKey(false));
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
        VaultKeyManager.loadKeyFromSecureStore(session.user.id)
          .then((k) => setHasVaultKey(Boolean(k)))
          .catch(() => setHasVaultKey(false));
      } else {
        VaultStorage.removeItem(AUTH_CACHE_USER_KEY);
        setHasVaultKey(false);
      }
      setIsLoading(false);
    });

    // Handle deep linking for email confirmation and auth callbacks
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        if (parsed.queryParams?.error_description) {
          console.warn('[AuthContext] Deep link auth error:', parsed.queryParams.error_description);
          return;
        }
        if (url.includes('access_token') || url.includes('refresh_token')) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setSession(session);
            setUser(session.user);
            VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(session.user));
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Error handling deep link:', e);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

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
      const key = deriveMasterKey(password, email);
      await VaultKeyManager.saveKeyToSecureStore(mockUser.id, key);
      setHasVaultKey(true);
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
        const key = deriveMasterKey(password, email);
        await VaultKeyManager.saveKeyToSecureStore(data.user.id, key);
        setHasVaultKey(true);
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

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user) {
          VaultStorage.setItem(AUTH_CACHE_USER_KEY, JSON.stringify(data.user));
          const key = deriveMasterKey(password, email);
          await VaultKeyManager.saveKeyToSecureStore(data.user.id, key);
          setHasVaultKey(true);
        }
      } else {
        // Email confirmation is required - user is not authenticated yet
        setSession(null);
        setUser(null);
        VaultStorage.removeItem(AUTH_CACHE_USER_KEY);
      }
      return { error: null, needsConfirmation: !data.session };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  };

  const restoreVaultKey = async (password: string): Promise<boolean> => {
    const targetEmail = user?.email;
    const targetUserId = user?.id;
    if (!targetEmail || !targetUserId) return false;

    try {
      const key = deriveMasterKey(password, targetEmail);
      await VaultKeyManager.saveKeyToSecureStore(targetUserId, key);
      setHasVaultKey(true);
      return true;
    } catch (err) {
      console.warn('[AuthContext] restoreVaultKey error:', err);
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    const currentUserId = user?.id;
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } finally {
      if (currentUserId) {
        await VaultKeyManager.clearKey(currentUserId);
      }
      setHasVaultKey(false);
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
      hasVaultKey,
      signIn,
      signUp,
      signOut,
      restoreVaultKey,
    }),
    [user, session, isLoading, hasVaultKey]
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

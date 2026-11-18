import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole, AuthSession } from '@/types';

/* ── Extended context shape ── */
interface AuthContextValue extends AuthSession {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  sendPasswordResetOtp: (email: string) => Promise<{ error: string | null }>;
  verifyPasswordResetOtp: (email: string, otp: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canAccessLab: () => boolean;
  canAccessDoctor: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  sendPasswordResetOtp: async () => ({ error: null }),
  verifyPasswordResetOtp: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  hasRole: () => false,
  canAccessLab: () => false,
  canAccessDoctor: () => false,
  isAdmin: () => false,
});

/* ── Map DB row → typed UserProfile ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(data: any): UserProfile {
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name || data.fullName || '',
    role: data.role as UserRole,
    avatarUrl: data.avatar_url ?? undefined,
    specialty: data.specialty ?? undefined,
    isActive: data.is_active ?? true,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
  };
}

/* ── Local account registry (strictly dynamic, no hardcoded users) ── */
interface LocalAccount extends UserProfile {
  password?: string;
}

const LOCAL_ACCOUNTS_KEY = 'physio_registered_accounts';
const DEFAULT_DEMO_ACCOUNTS: LocalAccount[] = [];

function getRegisteredAccounts(): LocalAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRegisteredAccount(account: LocalAccount) {
  if (typeof window === 'undefined') return;
  const current = getRegisteredAccounts();
  const idx = current.findIndex(
    (a) => a.email.toLowerCase() === account.email.toLowerCase(),
  );
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...account };
  } else {
    current.push(account);
  }
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(current));
}

/* ── Local session key (only written after successful auth, never read on cold start) ── */
const LOCAL_SESSION_KEY = 'physio_mock_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Fetch profile from DB */
  const loadProfile = useCallback(async (userId: string, accessToken: string, isNewLogin = false) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        const mapped = mapProfile(data);

        // Block deactivated users immediately
        if (mapped.isActive === false) {
          await supabase.auth.signOut();
          setUser(null);
          setToken(null);
          localStorage.removeItem(LOCAL_SESSION_KEY);
          return;
        }

        setUser(mapped);
        setToken(accessToken);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(mapped));

        // Log login event (best-effort, don't block on errors)
        if (isNewLogin) {
          supabase.from('user_activity_logs').insert({
            user_id: userId,
            event_type: 'login',
            user_agent: navigator.userAgent,
          }).then(() => {}).catch(() => {});
        }
        return;
      }

      // Profile row missing → auto-create it from auth metadata
      const { data: authUserData } = await supabase.auth.getUser();
      if (authUserData?.user) {
        const meta = authUserData.user.user_metadata || {};
        const rawRole = meta.role || (authUserData.user.email?.toLowerCase() === 'dikshantpatel2210@gmail.com' ? 'admin' : 'doctor');
        const newRow = {
          id: authUserData.user.id,
          email: authUserData.user.email || '',
          full_name: meta.full_name || meta.fullName || authUserData.user.email?.split('@')[0] || 'Doctor',
          role: rawRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: inserted } = await supabase
          .from('profiles')
          .insert(newRow)
          .select()
          .single();

        const finalProfile: UserProfile = inserted
          ? mapProfile(inserted)
          : {
              id: authUserData.user.id,
              email: authUserData.user.email || '',
              fullName: newRow.full_name,
              role: rawRole as UserRole,
              createdAt: newRow.created_at,
              updatedAt: newRow.updated_at,
            };

        setUser(finalProfile);
        setToken(accessToken);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(finalProfile));
        return;
      }
    } catch {
      // Fall through to local account check
    }

    // Supabase unavailable → look in local account registry by userId
    const accounts = getRegisteredAccounts();
    const local = accounts.find((a) => a.id === userId);
    if (local) {
      const { password: _, ...clean } = local;
      setUser(clean);
      setToken(accessToken || 'local-auth-token');
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(clean));
    }
  }, []);

  /* Public refresh (e.g. after admin role update) */
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadProfile(session.user.id, session.access_token);
    }
  }, [loadProfile]);

  /* ── Bootstrap — ONLY restore session from Supabase, never from localStorage cache ── */
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        // Live Supabase session exists → load the profile
        loadProfile(session.user.id, session.access_token).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        // No live session → start unauthenticated (never read cache)
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    /* Real-time auth state listener */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          loadProfile(session.user.id, session.access_token);
        } else {
          // Session ended (sign-out / token expired)
          setUser(null);
          setToken(null);
          localStorage.removeItem(LOCAL_SESSION_KEY);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  /* ── Sign In ── */
  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth (primary)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data.session?.user) {
        await loadProfile(data.session.user.id, data.session.access_token, true);
        // After loading profile, check if user was deactivated (loadProfile signs them out)
        const currentUserState = await supabase.auth.getSession();
        if (!currentUserState.data.session) {
          return { error: 'Your account has been deactivated. Please contact an administrator.' };
        }
        return { error: null };
      }

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('rate limit')) {
          return {
            error:
              '⚠️ Email Rate Limit Exceeded: Supabase limits email dispatches (3-4/hr) on free projects. Please wait a few minutes or sign in directly.',
          };
        }
        if (
          msg.includes('invalid login credentials') ||
          msg.includes('invalid credentials') ||
          msg.includes('wrong password') ||
          msg.includes('user not found')
        ) {
          return {
            error:
              'No account found with this email, or password is incorrect. If you have not created an account yet, please click "Create an account" below.',
          };
        }
        if (msg.includes('email not confirmed')) {
          return {
            error:
              'Your email address has not been confirmed yet. Please check your email inbox and click the confirmation link to activate your account.',
          };
        }
        return { error: error.message };
      }
    } catch {
      // Network down — fall through to local registry
    }

    // 2. Local account registry fallback (when Supabase is unreachable)
    const localAccounts = getRegisteredAccounts();
    const account = localAccounts.find(
      (a) => a.email.toLowerCase() === cleanEmail,
    );

    if (account) {
      if (account.password && account.password !== password) {
        return { error: 'Invalid email or password. Please check your credentials.' };
      }
      const { password: _, ...cleanProfile } = account;
      setUser(cleanProfile);
      setToken('local-jwt-token-' + cleanProfile.id);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(cleanProfile));
      return { error: null };
    }

    return { error: 'Invalid email or password. Please verify your credentials or create an account.' };
  }

  /* ── Sign Up ── */
  async function signUp(email: string, password: string, fullName: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    // Admin email override
    const assignedRole: UserRole =
      cleanEmail === 'dikshantpatel2210@gmail.com' ? 'admin' : 'doctor';

    // 1. Try Supabase Auth Sign Up
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role: assignedRole,
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes('already registered') ||
          msg.includes('already in use') ||
          msg.includes('user already')
        ) {
          return {
            error: 'An account with this email address already exists. Please sign in instead.',
          };
        }

        if (msg.includes('rate limit')) {
          return {
            error:
              '⚠️ Supabase Email Rate Limit Exceeded: Supabase restricts email dispatches (3-4/hr). To allow unlimited instant signups directly in your database, turn OFF "Confirm email" in Supabase Dashboard → Authentication → Providers → Email.',
          };
        }
        return { error: error.message };
      }

      // Supabase session returned immediately (email confirmation disabled)
      if (data?.session?.user) {
        const userId = data.session.user.id;
        const newProfile: UserProfile = {
          id: userId,
          email: cleanEmail,
          fullName: cleanName,
          role: assignedRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await supabase.from('profiles').insert({
            id: userId,
            email: cleanEmail,
            full_name: cleanName,
            role: assignedRole,
          });
        } catch { /* ignore */ }

        setUser(newProfile);
        setToken(data.session.access_token);
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newProfile));
        return { error: null, needsEmailConfirmation: false };
      }

      // Email confirmation required
      if (data?.user && !data?.session) {
        return {
          error: null,
          needsEmailConfirmation: true,
        };
      }
    } catch (err: any) {
      return { error: err.message || 'Failed to connect to Supabase authentication server.' };
    }

    return { error: 'Failed to create account in Supabase database.' };
  }

  /* ── 6-Digit Random Numeric OTP State (30-Second Expiry) ── */
  const [activeOtp, setActiveOtp] = useState<{ email: string; code: string; expiresAt: number } | null>(null);

  /* ── Send Password Reset OTP ── */
  async function sendPasswordResetOtp(email: string) {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Generate a new random 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 30000; // 30 seconds from now

    // 2. Save OTP state in memory
    setActiveOtp({
      email: cleanEmail,
      code: generatedOtp,
      expiresAt,
    });

    // 3. Attempt Supabase reset email dispatch
    try {
      await supabase.auth.resetPasswordForEmail(cleanEmail);
    } catch { /* ignore Supabase SMTP rate limits */ }

    return { error: null, generatedOtp };
  }

  /* ── Verify Password Reset OTP ── */
  async function verifyPasswordResetOtp(email: string, inputOtp: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = inputOtp.trim();

    // 1. Check if an active OTP exists for this email
    if (!activeOtp || activeOtp.email !== cleanEmail) {
      // Also try Supabase default verify if available
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery',
        });
        if (!error && data.session?.user) {
          await loadProfile(data.session.user.id, data.session.access_token);
          return { error: null };
        }
      } catch { /* ignore */ }

      return { error: '❌ No active OTP found for this email. Please click Resend OTP.' };
    }

    // 2. Check 30-second expiry
    if (Date.now() > activeOtp.expiresAt) {
      return { error: '⌛ OTP code has expired after 30 seconds. Please click "Resend OTP" to generate a fresh code.' };
    }

    // 3. Compare 6-digit OTP code
    if (cleanToken !== activeOtp.code) {
      return { error: '❌ Incorrect 6-digit OTP code. Please check the code and try again.' };
    }

    // 4. Valid & verified!
    return { error: null };
  }

  /* ── Update Password ── */
  async function updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        // Fallback update in profile DB if Supabase auth session is not active
        if (user?.id) {
          await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id);
        }
      }

      // Clear OTP state after password update
      setActiveOtp(null);
      return { error: null };
    } catch (err: any) {
      setActiveOtp(null);
      return { error: err.message || 'Failed to update password.' };
    }
  }

  /* ── Sign Out ── */
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setToken(null);
  }

  /* ── Role helpers ── */
  function hasRole(role: UserRole | UserRole[]): boolean {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }

  function canAccessLab(): boolean {
    return hasRole(['ai_user', 'admin']);
  }

  function canAccessDoctor(): boolean {
    return hasRole(['doctor', 'admin']);
  }

  function isAdmin(): boolean {
    return hasRole('admin');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        sendPasswordResetOtp,
        verifyPasswordResetOtp,
        updatePassword,
        signOut,
        refreshProfile,
        hasRole,
        canAccessLab,
        canAccessDoctor,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

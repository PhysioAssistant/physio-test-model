import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui';
import type { UserRole } from '@/types';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Protects authenticated routes.
 * - While loading  → show spinner
 * - Unauthenticated → redirect to `/` (Login page)
 * - Wrong role      → redirect to `/unauthorized`
 */
export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Authenticating…" />;
  }

  if (!isAuthenticated) {
    // Preserve intended destination so login can redirect back
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

/**
 * The root `/` is ALWAYS the public Login entry point.
 *
 * We intentionally do NOT redirect authenticated users away from `/`.
 * Instead, the LoginPage itself navigates to `/doctor` after a
 * successful sign-in. This gives the user explicit control and matches
 * the behaviour of production sites like Google, GitHub, etc.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  // Show spinner while the initial session check completes so the
  // login form doesn't flash before the auth state is known.
  if (isLoading) {
    return <PageLoader message="Initializing…" />;
  }

  // Always render the login page — never auto-redirect.
  return <>{children}</>;
}


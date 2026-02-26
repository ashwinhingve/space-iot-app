'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { getCurrentUser, setAuthFromStorage } from '@/store/slices/authSlice';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/devices', '/manifolds', '/device', '/ttn', '/scada', '/oms', '/reports', '/sld', '/command-area-map'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

// Helper to check localStorage directly
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, token, loading } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  const isProtectedRoute = protectedRoutes.some(route => pathname?.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname?.startsWith(route));

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    if (!isInitialized) {
      dispatch(setAuthFromStorage());
      setIsInitialized(true);
    }
  }, [dispatch, isInitialized]);

  // Verify token with backend when we have a token
  useEffect(() => {
    if (isInitialized && token && !loading) {
      dispatch(getCurrentUser());
    }
  }, [token, loading, dispatch, isInitialized]);

  // Handle redirects - check localStorage directly to avoid race conditions
  useEffect(() => {
    if (!isInitialized) return;

    const storedToken = getStoredToken();

    // Redirect to login if trying to access protected route without auth
    if (isProtectedRoute && !storedToken && !loading) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`);
    }
    // Redirect to dashboard if already authenticated and trying to access auth routes
    else if (isAuthRoute && storedToken) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isProtectedRoute, isAuthRoute, token, pathname, router, loading, isInitialized]);

  // Show nothing while initializing to prevent flash
  if (!isInitialized && isProtectedRoute) {
    return null;
  }

  return <>{children}</>;
}

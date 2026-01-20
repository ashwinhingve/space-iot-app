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
const protectedRoutes = ['/dashboard', '/devices', '/manifolds', '/device'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

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
    if (isInitialized && token && !isAuthenticated && !loading) {
      dispatch(getCurrentUser());
    }
  }, [token, isAuthenticated, loading, dispatch, isInitialized]);

  // Handle redirects
  useEffect(() => {
    if (!isInitialized) return;

    // Redirect to login if trying to access protected route without auth
    if (isProtectedRoute && !isAuthenticated && !token && !loading) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`);
    }
    // Redirect to dashboard if already authenticated and trying to access auth routes
    else if (isAuthRoute && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isProtectedRoute, isAuthRoute, token, pathname, router, loading, isInitialized]);

  // Show nothing while initializing to prevent flash
  if (!isInitialized && isProtectedRoute) {
    return null;
  }

  return <>{children}</>;
}

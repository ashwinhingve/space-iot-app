'use client';

import { ReactNode, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { StoreProvider } from '@/store/StoreProvider';
import { AuthGuard } from './AuthGuard';
import { useAppDispatch } from '@/store/StoreProvider';
import { fetchSystemConfig } from '@/store/slices/configSlice';
import { getCurrentUser } from '@/store/slices/authSlice';

function ConfigLoader() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchSystemConfig());
    // Refresh user from backend on every app load.
    // This triggers enforceAdminIfNeeded on the backend, ensuring
    // spaceautomation29@gmail.com always receives admin role + permissions
    // even if the DB or localStorage has a stale role.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ConfigLoader />
        <AuthGuard>
          {children}
        </AuthGuard>
      </ThemeProvider>
    </StoreProvider>
  );
}

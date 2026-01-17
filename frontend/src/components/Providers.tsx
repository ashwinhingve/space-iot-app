'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { StoreProvider } from '@/store/StoreProvider';
import { AuthGuard } from './AuthGuard';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthGuard>
          {children}
        </AuthGuard>
      </ThemeProvider>
    </StoreProvider>
  );
} 
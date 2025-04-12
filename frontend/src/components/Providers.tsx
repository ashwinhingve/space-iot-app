'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { StoreProvider } from '@/store/StoreProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </StoreProvider>
  );
} 
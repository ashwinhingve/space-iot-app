'use client';

import { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { RootState } from '@/store/store';

// Routes that use the sidebar app-shell layout
const APP_ROUTE_PREFIXES = [
  '/dashboard', '/devices', '/scada', '/oms', '/reports',
  '/tickets', '/documents', '/admin', '/manifolds', '/ttn',
  '/webscada', '/sld', '/command-area-map',
];

interface MainLayoutProps {
  children: ReactNode;
  /** Show footer (only applies to public layout) */
  showFooter?: boolean;
  /** Add top padding for fixed navbar (only applies to public layout) */
  padNavbar?: boolean;
}

export function MainLayout({ children, showFooter = true, padNavbar = true }: MainLayoutProps) {
  const { user } = useSelector((s: RootState) => s.auth);
  const pathname = usePathname();

  const isAppRoute = APP_ROUTE_PREFIXES.some(p => pathname?.startsWith(p));
  const useAppShell = !!user && isAppRoute;

  // ── Authenticated App Shell (sidebar + topbar) ─────────────────────────────
  if (useAppShell) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AppTopBar />
          <main id="main-content" className="app-shell-main flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // ── Public Layout (top navbar) ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className={`app-shell-main flex-1 ${padNavbar ? 'pt-16 md:pt-20' : ''}`}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Bell, Search, ChevronRight,
  LayoutDashboard, Radio, Activity, Map, BarChart3,
  Ticket, FileText, ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { RootState } from '@/store/store';
import { ThemeToggle } from '@/components/ThemeToggle';

// ─── Route meta ───────────────────────────────────────────────────────────────

const ROUTE_META: { prefix: string; label: string; icon: React.ElementType; parent?: { label: string; href: string } }[] = [
  { prefix: '/dashboard',  label: 'Dashboard',            icon: LayoutDashboard },
  { prefix: '/devices',    label: 'Network Devices',      icon: Radio },
  { prefix: '/scada',      label: 'SCADA Control',        icon: Activity },
  { prefix: '/oms',        label: 'Operations Management',icon: Map },
  { prefix: '/reports',    label: 'Reports & Analytics',  icon: BarChart3 },
  { prefix: '/tickets',    label: 'Ticket Management',    icon: Ticket },
  { prefix: '/documents',  label: 'Documents',            icon: FileText },
  { prefix: '/admin',      label: 'Admin Panel',          icon: ShieldAlert },
  { prefix: '/ttn',        label: 'TTN Management',       icon: Radio },
  { prefix: '/manifolds',  label: 'Manifold Detail',      icon: Activity, parent: { label: 'SCADA', href: '/scada' } },
];

function getRouteMeta(pathname: string | null) {
  if (!pathname) return null;
  return ROUTE_META.find(m => pathname.startsWith(m.prefix)) ?? null;
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

export function AppTopBar() {
  const pathname = usePathname();
  const { user } = useSelector((s: RootState) => s.auth);
  const meta = getRouteMeta(pathname);

  const initials = user
    ? (user.name
        ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
        : user.email?.[0]?.toUpperCase() ?? '?')
    : '?';

  return (
    <header className="h-14 border-b border-border/40 bg-card/60 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-3 shrink-0 z-20">
      {/* Mobile left spacer for hamburger */}
      <div className="lg:hidden w-8 shrink-0" />

      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 min-w-0">
        {meta?.parent && (
          <>
            <Link
              href={meta.parent.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {meta.parent.label}
            </Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
          </>
        )}
        <div className="flex items-center gap-2">
          {meta?.icon && <meta.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <h1 className="text-sm font-semibold text-foreground truncate">
            {meta?.label ?? 'IoT Space'}
          </h1>
        </div>
      </div>

      <div className="flex-1" />

      {/* ── Right actions ──────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Search button */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/40 rounded-lg hover:bg-muted hover:border-border transition-all duration-150 group">
          <Search className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
          <span className="group-hover:text-foreground transition-colors">Quick search</span>
          <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 bg-background border border-border/60 rounded font-mono text-muted-foreground/70">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150">
          <Bell className="w-4 h-4" />
          {/* Unread dot — can be wired to real notification count */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-card" />
        </button>

        {/* Theme toggle (desktop only — also shown in sidebar) */}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>

        {/* User avatar (mobile) */}
        {user && (
          <div className="lg:hidden w-7 h-7 rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center text-[11px] font-bold text-brand-400 shrink-0 cursor-pointer">
            {initials}
          </div>
        )}
      </div>
    </header>
  );
}

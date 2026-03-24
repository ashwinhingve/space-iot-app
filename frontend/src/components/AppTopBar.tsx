'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import {
  Bell, Search, ChevronRight,
  LayoutDashboard, Radio, Activity, Map, BarChart3,
  Ticket, FileText, ShieldAlert, LogOut, X, ArrowRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { RootState } from '@/store/store';
import { AppDispatch } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PagePermission, useRole } from '@/hooks/useRole';

// Route meta
const ROUTE_META: { prefix: string; label: string; icon: React.ElementType; parent?: { label: string; href: string } }[] = [
  { prefix: '/dashboard',  label: 'Dashboard',             icon: LayoutDashboard },
  { prefix: '/devices',    label: 'Network Devices',       icon: Radio },
  { prefix: '/scada',      label: 'SCADA Control',         icon: Activity },
  { prefix: '/oms',        label: 'Operations Management', icon: Map },
  { prefix: '/reports',    label: 'Reports & Analytics',   icon: BarChart3 },
  { prefix: '/tickets',    label: 'Ticket Management',     icon: Ticket },
  { prefix: '/documents',  label: 'Documents',             icon: FileText },
  { prefix: '/admin',      label: 'Admin Panel',           icon: ShieldAlert },
  { prefix: '/ttn',        label: 'TTN Management',        icon: Radio },
  { prefix: '/manifolds',  label: 'Manifold Detail',       icon: Activity, parent: { label: 'SCADA', href: '/scada' } },
];

type QuickLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: PagePermission;
  description: string;
  keywords: string[];
};

const QUICK_LINKS: QuickLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard',
    description: 'Overview and live status',
    keywords: ['home', 'overview', 'stats']
  },
  {
    href: '/devices',
    label: 'Devices',
    icon: Radio,
    permission: 'devices',
    description: 'Manage connected devices',
    keywords: ['hardware', 'iot', 'network']
  },
  {
    href: '/scada',
    label: 'SCADA',
    icon: Activity,
    permission: 'scada',
    description: 'Control and monitor valves',
    keywords: ['control', 'valves', 'automation']
  },
  {
    href: '/oms',
    label: 'OMS',
    icon: Map,
    permission: 'oms',
    description: 'Operations workspace',
    keywords: ['operations', 'map']
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'reports',
    description: 'Analytics and exports',
    keywords: ['analytics', 'charts', 'insights']
  },
  {
    href: '/tickets',
    label: 'Tickets',
    icon: Ticket,
    permission: 'tickets',
    description: 'Issue tracking workflow',
    keywords: ['support', 'workflow', 'complaints']
  },
  {
    href: '/documents',
    label: 'Documents',
    icon: FileText,
    permission: 'documents',
    description: 'Records and files',
    keywords: ['files', 'records', 'docs']
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: ShieldAlert,
    permission: 'admin',
    description: 'Users, roles, and system',
    keywords: ['users', 'roles', 'settings']
  },
];

function getRouteMeta(pathname: string | null) {
  if (!pathname) return null;
  return ROUTE_META.find(m => pathname.startsWith(m.prefix)) ?? null;
}

export function AppTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { hasPermission } = useRole();
  const meta = getRouteMeta(pathname);

  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  const initials = user
    ? (user.name
        ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
        : user.email?.[0]?.toUpperCase() ?? '?')
    : '?';

  const shortcutLabel = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl K';
    return /Mac|iPhone|iPad/i.test(navigator.platform) ? 'Cmd K' : 'Ctrl K';
  }, []);

  const quickLinks = useMemo(
    () => QUICK_LINKS.filter(link => !link.permission || hasPermission(link.permission)),
    [hasPermission]
  );

  const filteredQuickLinks = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return quickLinks;
    return quickLinks.filter(link =>
      link.label.toLowerCase().includes(q) ||
      link.href.toLowerCase().includes(q) ||
      link.description.toLowerCase().includes(q) ||
      link.keywords.some(keyword => keyword.includes(q))
    );
  }, [commandQuery, quickLinks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isShortcut) {
        event.preventDefault();
        setCommandOpen(prev => !prev);
        return;
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    const timer = window.setTimeout(() => commandInputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [commandOpen]);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const closeCommandPalette = () => {
    setCommandOpen(false);
    setCommandQuery('');
  };

  const openQuickLink = (href: string) => {
    router.push(href);
    closeCommandPalette();
  };

  return (
    <>
      <header className="h-14 border-b border-border/40 bg-card/75 backdrop-blur-xl flex items-center px-4 sm:px-6 gap-3 shrink-0 z-20">
        <div className="lg:hidden w-8 shrink-0" />

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
              {meta?.label ?? 'SpaceIoT'}
            </h1>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/40 rounded-lg hover:bg-muted hover:border-border transition-all duration-150 group"
          >
            <Search className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
            <span className="group-hover:text-foreground transition-colors">Command palette</span>
            <kbd className="hidden md:inline text-[10px] px-1.5 py-0.5 bg-background border border-border/60 rounded font-mono text-muted-foreground/70">
              {shortcutLabel}
            </kbd>
          </button>

          <button
            className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-card" />
          </button>

          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {user && (
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-150"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          )}

          {user && (
            <div className="lg:hidden w-7 h-7 rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center text-[11px] font-bold text-brand-400 shrink-0">
              {initials}
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {commandOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close command palette"
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCommandPalette}
            />
            <motion.div
              className="fixed left-1/2 top-20 z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-2xl"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={commandInputRef}
                  value={commandQuery}
                  onChange={event => setCommandQuery(event.target.value)}
                  placeholder="Search pages..."
                  className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                />
                <button
                  onClick={closeCommandPalette}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Esc
                </button>
              </div>

              <div className="max-h-[340px] overflow-y-auto p-2">
                {filteredQuickLinks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                    No pages found for &quot;{commandQuery}&quot;.
                  </div>
                ) : (
                  filteredQuickLinks.map(link => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.href}
                        onClick={() => openQuickLink(link.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-secondary/45 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/55 text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{link.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{link.description}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="font-mono">{link.href}</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Radio, Activity, Map, BarChart3,
  Ticket, FileText, ShieldAlert, LogOut, ChevronLeft,
  Zap, Menu, X,
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import { useRole, PagePermission } from '@/hooks/useRole';
import { ThemeToggle } from '@/components/ThemeToggle';

// ─── Nav config ───────────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' as PagePermission },
  { label: 'Devices',   href: '/devices',   icon: Radio,           permission: 'devices'   as PagePermission },
  { label: 'SCADA',     href: '/scada',     icon: Activity,        permission: 'scada'     as PagePermission },
  { label: 'OMS',       href: '/oms',       icon: Map,             permission: 'oms'       as PagePermission },
  { label: 'Reports',   href: '/reports',   icon: BarChart3,       permission: 'reports'   as PagePermission },
];

const SECONDARY_NAV = [
  { label: 'Tickets',   href: '/tickets',   icon: Ticket,   permission: 'tickets'   as PagePermission },
  { label: 'Documents', href: '/documents', icon: FileText, permission: 'documents' as PagePermission },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active: boolean;
  variant?: 'default' | 'danger';
  badge?: number;
  onClick?: () => void;
  idPrefix?: string;
}

function NavItem({ href, icon: Icon, label, collapsed, active, variant = 'default', badge, onClick, idPrefix = 'desk' }: NavItemProps) {
  const isDanger = variant === 'danger';

  const content = (
    <div
      className={`
        group relative flex items-center gap-3 rounded-lg cursor-pointer select-none
        transition-all duration-150
        ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}
        ${active
          ? isDanger
            ? 'bg-red-500/10 text-red-400'
            : 'bg-[#00e5ff]/10 text-[#00e5ff]'
          : isDanger
            ? 'text-muted-foreground/70 hover:text-red-400 hover:bg-red-500/8'
            : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50'
        }
      `}
    >
      {/* Active pill */}
      {active && (
        <motion.div
          layoutId={`${idPrefix}-pill-${isDanger ? 'danger' : 'default'}`}
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isDanger ? 'bg-red-400' : 'bg-[#00e5ff]'}`}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}

      <Icon
        className="shrink-0 transition-colors"
        style={{ width: 16, height: 16 }}
      />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden tracking-tight"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      {badge != null && badge > 0 && !collapsed && (
        <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {badge != null && badge > 0 && collapsed && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-background" />
      )}

      {/* Tooltip in collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border/60 text-foreground text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150">
          {label}
          {badge != null && badge > 0 && (
            <span className="ml-1.5 px-1 py-0.5 bg-red-500 text-white text-[9px] rounded-full">{badge}</span>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) return <div onClick={onClick}>{content}</div>;
  return <Link href={href}>{content}</Link>;
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="mx-3 my-1.5 h-px bg-border/40" />;
  }
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[1.5px]">
      {label}
    </p>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { isAdmin, hasPermission } = useRole();

  const isActive = (href: string) => !!(pathname?.startsWith(href));

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const visiblePrimary = PRIMARY_NAV.filter(i => hasPermission(i.permission));
  const visibleSecondary = SECONDARY_NAV.filter(i => hasPermission(i.permission));

  const initials = user
    ? (user.name
        ? user.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
        : user.email?.[0]?.toUpperCase() ?? '?')
    : '?';

  const roleLabel = (user?.role as string | undefined) ?? 'operator';
  const roleColor =
    roleLabel === 'admin'    ? 'text-red-400 bg-red-500/10 border-red-500/20' :
    roleLabel === 'engineer' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                               'text-sky-400 bg-sky-500/10 border-sky-500/20';

  const SidebarInner = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCollapsed = collapsed && !isMobile;
    const idPrefix = isMobile ? 'mob' : 'desk';
    return (
      <div className="flex flex-col h-full">

        {/* ── Logo ─────────────────────────────────────────── */}
        <div className={`flex items-center h-14 border-b border-border/40 shrink-0 ${isCollapsed ? 'justify-center px-3' : 'px-4 gap-3'}`}>
          {/* Icon */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-[#00e5ff]/25 rounded-xl blur-md" />
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#00e5ff] to-brand-600 flex items-center justify-center shadow-[0_0_14px_rgba(0,229,255,0.3)]">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="brand"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="min-w-0 flex-1"
              >
                <p className="font-display font-bold text-base leading-none tracking-wide">
                  <span className="text-foreground">Space</span>
                  <span style={{ color: '#00e5ff' }}>IoT</span>
                </p>
                <p className="text-[9px] text-muted-foreground/40 mt-0.5 font-data tracking-[2px] uppercase">Platform</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile close */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────────── */}
        <nav
          className={`flex-1 min-h-0 overflow-y-auto py-2 space-y-0.5 ${isCollapsed ? 'px-2' : 'px-2'}`}
          style={{ scrollbarWidth: 'none' }}
        >
          {visiblePrimary.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={isCollapsed}
              active={isActive(item.href)}
              idPrefix={idPrefix}
            />
          ))}

          {visibleSecondary.length > 0 && (
            <>
              <SectionLabel label="Management" collapsed={isCollapsed} />
              {visibleSecondary.map(item => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  collapsed={isCollapsed}
                  active={isActive(item.href)}
                  idPrefix={idPrefix}
                />
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <SectionLabel label="System" collapsed={isCollapsed} />
              <NavItem
                href="/admin"
                icon={ShieldAlert}
                label="Admin"
                collapsed={isCollapsed}
                active={isActive('/admin')}
                variant="danger"
                idPrefix={idPrefix}
              />
            </>
          )}
        </nav>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className={`border-t border-border/40 shrink-0 ${isCollapsed ? 'p-2 space-y-1.5' : 'p-3 space-y-2'}`}>

          {/* User card (expanded) */}
          <AnimatePresence initial={false}>
            {!isCollapsed && user && (
              <motion.div
                key="user-card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-muted/30 border border-border/30">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight text-foreground">
                      {user.name || user.email}
                    </p>
                    <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border capitalize ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed avatar */}
          {isCollapsed && user && (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-default"
                style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
                title={user.name || user.email}
              >
                {initials}
              </div>
            </div>
          )}

          {/* Actions row */}
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              title="Sign out"
              className={`p-2 rounded-xl text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors ${isCollapsed ? '' : 'ml-auto'}`}
            >
              <LogOut style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────── */}
      <motion.aside
        className="hidden lg:flex flex-col bg-card/95 border-r border-border/50 relative z-30 h-screen shrink-0"
        animate={{ width: collapsed ? 64 : 232 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{ minWidth: 0 }}
      >
        <SidebarInner />

        {/* Collapse toggle */}
        <motion.button
          className="absolute -right-3 top-16 w-6 h-6 bg-card border border-border/60 rounded-full flex items-center justify-center shadow-sm hover:bg-muted hover:shadow-md transition-all z-10"
          onClick={() => setCollapsed(c => !c)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.22 }}>
            <ChevronLeft style={{ width: 11, height: 11 }} className="text-muted-foreground" />
          </motion.div>
        </motion.button>
      </motion.aside>

      {/* ── Mobile hamburger ───────────────────────────────── */}
      <button
        className="lg:hidden fixed top-3.5 left-3.5 z-50 p-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-md"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu style={{ width: 17, height: 17 }} className="text-foreground" />
      </button>

      {/* ── Mobile drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed inset-y-0 left-0 w-60 bg-card border-r border-border/50 z-50 flex flex-col shadow-xl"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <SidebarInner isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

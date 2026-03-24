'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { motion, type Variants } from 'framer-motion';
import {
  Activity, Radio, BarChart3, Map, Ticket, FileText,
  RefreshCw, ArrowUpRight, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Wifi, Signal,
  ChevronRight, AlertCircle, CircleDot, Layers, Network,
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store/store';
import { MainLayout } from '@/components/MainLayout';
import { useRole } from '@/hooks/useRole';
import { fetchManifolds } from '@/store/slices/manifoldSlice';
import { fetchNetworkDevices, fetchNetworkDeviceStats } from '@/store/slices/networkDeviceSlice';
import { API_ENDPOINTS } from '@/lib/config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketSummary {
  _id: string;
  ticketNumber?: string;
  title: string;
  priority: 'normal' | 'high' | 'urgent';
  stage: string;
  updatedAt: string;
}

interface TicketStats { total: number; byStage: Record<string, number>; byPriority: Record<string, number> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function greet(name: string) {
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${greeting}, ${name.split(' ')[0]}`;
}

const PRIORITY_CONFIG = {
  urgent: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
  high:   { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  normal: { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', dot: 'bg-sky-500' },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted/50 ${className}`} />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  loading?: boolean;
  href?: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconColor, iconBg, trend, trendValue, loading, href }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground';

  // Extract color value from iconColor class (e.g. "text-brand-400" → used for accent)
  const accentClass = iconColor; // keep original for icon

  const inner = (
    <div className="group relative p-5 bg-card rounded-2xl border border-border/50 hover:border-border hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      {/* Left accent bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${iconBg.replace('/10', '/60')}`} />

      {/* Hover glow fill */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${iconBg}`}
        style={{ opacity: 0, background: 'var(--tw-gradient-from)' }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 pl-3">
          <p className="text-[10px] font-semibold text-muted-foreground/70 mb-2 uppercase tracking-[1.5px]">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mb-1" />
          ) : (
            <p className={`text-2xl font-bold font-data tabular-nums leading-none mb-1 ${accentClass}`}>{value}</p>
          )}
          {sub && !loading && (
            <p className="text-xs text-muted-foreground mt-1.5 truncate">{sub}</p>
          )}
          {trendValue && !loading && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium font-data">{trendValue}</span>
            </div>
          )}
        </div>

        <div className={`p-2.5 rounded-xl ${iconBg} border border-current/10 shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-5 h-5 ${accentClass}`} />
        </div>
      </div>

      {href && (
        <div className="absolute bottom-4 right-5 opacity-0 group-hover:opacity-60 transition-opacity pl-3">
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

function QuickAction({ href, icon: Icon, label, desc, color, bg }: {
  href: string; icon: React.ElementType; label: string; desc: string; color: string; bg: string;
}) {
  return (
    <Link href={href}>
      <div className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-border hover:shadow-sm transition-all duration-150 cursor-pointer">
        <div className={`p-2 rounded-lg ${bg} shrink-0`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{desc}</p>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ─── Protocol Bar ─────────────────────────────────────────────────────────────

function ProtocolBar({ label, online, total, color, icon: Icon }: {
  label: string; online: number; total: number; color: string; icon: React.ElementType;
}) {
  const pct = total > 0 ? (online / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg bg-muted/50 shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-xs tabular-nums text-foreground font-semibold">{online}<span className="text-muted-foreground font-normal">/{total}</span></span>
        </div>
        <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const manifoldsState = useSelector((s: RootState) => s.manifolds);
  const { manifolds } = manifoldsState;
  const manifoldValves = manifoldsState.valves;
  const { devices: networkDevices, stats: deviceStats } = useSelector((s: RootState) => s.networkDevices);
  const { devices: ttnDevices } = useSelector((s: RootState) => s.ttn);
  const { hasPermission } = useRole();
  const canViewTickets = hasPermission('tickets');

  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoadingDevices(true);
    await Promise.all([
      dispatch(fetchManifolds({})),
      dispatch(fetchNetworkDeviceStats()),
      dispatch(fetchNetworkDevices()),
    ]);
    setLoadingDevices(false);

    if (canViewTickets) {
      setLoadingTickets(true);
      try {
        const token = localStorage.getItem('token');
        const [statsRes, listRes] = await Promise.all([
          fetch(API_ENDPOINTS.TICKET_STATS, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_ENDPOINTS.TICKETS}?limit=5&sort=-updatedAt`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (statsRes.ok) setTicketStats(await statsRes.json());
        if (listRes.ok) {
          const data = await listRes.json();
          setRecentTickets(Array.isArray(data) ? data.slice(0, 5) : (data.tickets ?? []).slice(0, 5));
        }
      } catch { /* silent */ }
      setLoadingTickets(false);
    }

    setLastRefreshed(new Date());
  }, [dispatch, canViewTickets]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived KPIs ───────────────────────────────────────────────────────────

  const totalNetworkDevices = (deviceStats?.lorawan ?? ttnDevices.length)
    + (deviceStats?.wifi ?? 0)
    + (deviceStats?.gsm ?? 0)
    + (deviceStats?.bluetooth ?? 0);

  const onlineNetworkDevices = networkDevices.filter(d => d.status === 'online').length
    + ttnDevices.filter(d => d.isOnline).length;

  const activeManifolds = manifolds.filter(m => m.status === 'Active').length;
  const activeAlarms = Object.values(manifoldValves).reduce((sum, valves) => {
    return sum + valves.reduce((s, v) => s + v.alarms.filter(a => !a.acknowledged && !a.resolved).length, 0);
  }, 0);
  const criticalAlarms = Object.values(manifoldValves).reduce((sum, valves) => {
    return sum + valves.reduce((s, v) => s + v.alarms.filter(a => !a.acknowledged && !a.resolved && a.severity === 'CRITICAL').length, 0);
  }, 0);

  const openTickets = ticketStats
    ? Object.entries(ticketStats.byStage ?? {})
        .filter(([s]) => !['completed', 'rejected'].includes(s))
        .reduce((sum, [, n]) => sum + n, 0)
    : 0;
  const urgentTickets = ticketStats?.byPriority?.urgent ?? 0;

  // ── Network by protocol ────────────────────────────────────────────────────
  const lorawanOnline = ttnDevices.filter(d => d.isOnline).length;
  const lorawanTotal = ttnDevices.length || (deviceStats?.lorawan ?? 0);
  const wifiOnline = networkDevices.filter(d => d.protocol === 'wifi' && d.status === 'online').length;
  const wifiTotal = deviceStats?.wifi ?? networkDevices.filter(d => d.protocol === 'wifi').length;
  const gsmOnline = networkDevices.filter(d => d.protocol === 'gsm' && d.status === 'online').length;
  const gsmTotal = deviceStats?.gsm ?? networkDevices.filter(d => d.protocol === 'gsm').length;

  // ── System health score ────────────────────────────────────────────────────
  const healthScore = totalNetworkDevices > 0
    ? Math.round((onlineNetworkDevices / totalNetworkDevices) * 100)
    : 100;
  const healthStatus = healthScore >= 90 ? 'Healthy' : healthScore >= 70 ? 'Degraded' : 'Critical';
  const healthColor = healthScore >= 90 ? 'text-emerald-400' : healthScore >= 70 ? 'text-amber-400' : 'text-red-400';
  const healthBg   = healthScore >= 90 ? 'bg-emerald-500/10' : healthScore >= 70 ? 'bg-amber-500/10' : 'bg-red-500/10';

  // ── Quick actions based on permissions ────────────────────────────────────
  const quickActions = [
    { href: '/scada',     icon: Activity,   label: 'SCADA Control', desc: 'Valve control & monitoring', color: 'text-brand-400', bg: 'bg-brand-500/10', perm: 'scada' },
    { href: '/devices',   icon: Radio,      label: 'Network Devices', desc: 'Manage IoT fleet', color: 'text-violet-400', bg: 'bg-violet-500/10', perm: 'devices' },
    { href: '/oms',       icon: Map,        label: 'Operations', desc: 'Assets & alarms', color: 'text-sky-400', bg: 'bg-sky-500/10', perm: 'oms' },
    { href: '/reports',   icon: BarChart3,  label: 'Reports', desc: 'Analytics & exports', color: 'text-emerald-400', bg: 'bg-emerald-500/10', perm: 'reports' },
    { href: '/tickets',   icon: Ticket,     label: 'Tickets', desc: 'Issue tracker', color: 'text-amber-400', bg: 'bg-amber-500/10', perm: 'tickets' },
    { href: '/documents', icon: FileText,   label: 'Documents', desc: 'File management', color: 'text-rose-400', bg: 'bg-rose-500/10', perm: 'documents' },
  ].filter(a => hasPermission(a.perm as Parameters<typeof hasPermission>[0]));

  // ── Animation variants ────────────────────────────────────────────────────
  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <MainLayout showFooter={false}>
      <div className="min-h-full bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display">
                {user?.name ? greet(user.name) : 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-data tracking-wide">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                <span className="mx-2 text-border">·</span>
                <span className="text-emerald-400">System Operational</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* System health badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${healthBg} ${
                healthScore >= 90 ? 'border-emerald-500/20' : healthScore >= 70 ? 'border-amber-500/20' : 'border-red-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${healthScore >= 90 ? 'bg-emerald-500' : healthScore >= 70 ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
                <span className={healthColor}>{healthScore}% {healthStatus}</span>
              </div>

              <button
                onClick={loadAll}
                disabled={loadingDevices}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/40 border border-border/40 rounded-xl hover:bg-muted transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </motion.div>

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <KpiCard
                label="Online Devices"
                value={loadingDevices ? '—' : onlineNetworkDevices}
                sub={`of ${totalNetworkDevices} total devices`}
                icon={Network}
                iconColor="text-brand-500"
                iconBg="bg-brand-500/10"
                trend={onlineNetworkDevices >= totalNetworkDevices * 0.8 ? 'up' : 'down'}
                trendValue={totalNetworkDevices > 0 ? `${Math.round((onlineNetworkDevices / totalNetworkDevices) * 100)}% uptime` : undefined}
                loading={loadingDevices}
                href="/devices"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <KpiCard
                label="Active Alarms"
                value={activeAlarms}
                sub={criticalAlarms > 0 ? `${criticalAlarms} critical` : 'No critical alarms'}
                icon={AlertTriangle}
                iconColor={activeAlarms > 0 ? 'text-amber-400' : 'text-emerald-400'}
                iconBg={activeAlarms > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}
                trend={activeAlarms === 0 ? 'up' : criticalAlarms > 0 ? 'down' : 'flat'}
                trendValue={activeAlarms === 0 ? 'All clear' : undefined}
                href="/oms"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <KpiCard
                label="Open Tickets"
                value={loadingTickets ? '—' : openTickets}
                sub={urgentTickets > 0 ? `${urgentTickets} urgent` : 'No urgent items'}
                icon={Ticket}
                iconColor={urgentTickets > 0 ? 'text-red-400' : 'text-sky-400'}
                iconBg={urgentTickets > 0 ? 'bg-red-500/10' : 'bg-sky-500/10'}
                trend={urgentTickets > 0 ? 'down' : 'flat'}
                loading={loadingTickets}
                href="/tickets"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <KpiCard
                label="Manifolds Active"
                value={activeManifolds}
                sub={`of ${manifolds.length} configured`}
                icon={Layers}
                iconColor="text-violet-400"
                iconBg="bg-violet-500/10"
                trend={activeManifolds === manifolds.length ? 'up' : 'flat'}
                trendValue={manifolds.length > 0 ? `${Math.round((activeManifolds / manifolds.length) * 100)}% active` : undefined}
                href="/scada"
              />
            </motion.div>
          </motion.div>

          {/* ── Main Grid ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* ── Left column (2/3) ─────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Device fleet ─────────────────────────────────────────── */}
              <motion.div
                className="bg-card rounded-2xl border border-border/50 p-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold">Device Fleet</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Protocol connectivity status</p>
                  </div>
                  <Link href="/devices" className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors font-medium">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                {loadingDevices ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ProtocolBar label="LoRaWAN" online={lorawanOnline} total={lorawanTotal} color="text-violet-400" icon={Radio} />
                    <ProtocolBar label="Wi-Fi"   online={wifiOnline}    total={wifiTotal}    color="text-sky-400"    icon={Wifi} />
                    <ProtocolBar label="GSM"     online={gsmOnline}     total={gsmTotal}     color="text-emerald-400" icon={Signal} />
                  </div>
                )}

                {/* Footer summary */}
                {!loadingDevices && (
                  <div className="mt-5 pt-4 border-t border-border/30 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">{onlineNetworkDevices} online</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-muted" />
                      <span className="text-xs text-muted-foreground">{totalNetworkDevices - onlineNetworkDevices} offline</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CircleDot className="w-3 h-3" />
                      <span>Updated {timeAgo(lastRefreshed.toISOString())}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Recent tickets ─────────────────────────────────────────── */}
              {hasPermission('tickets') && (
                <motion.div
                  className="bg-card rounded-2xl border border-border/50 p-5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.22 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold">Recent Tickets</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{openTickets} open items</p>
                    </div>
                    <Link href="/tickets" className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors font-medium">
                      View all <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {loadingTickets ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : recentTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No open tickets</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentTickets.map(ticket => {
                        const pc = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.normal;
                        return (
                          <Link key={ticket._id} href={`/tickets`}>
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pc.dot}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate leading-tight">{ticket.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${pc.bg} ${pc.color} ${pc.border} border`}>
                                    {ticket.priority}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground capitalize">{ticket.stage.replace('_', ' ')}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(ticket.updatedAt)}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Ticket stats mini row */}
                  {ticketStats && !loadingTickets && (
                    <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-4 flex-wrap">
                      {[
                        { label: 'Total', value: ticketStats.total, color: 'text-foreground' },
                        { label: 'Urgent', value: ticketStats.byPriority?.urgent ?? 0, color: 'text-red-400' },
                        { label: 'Completed', value: ticketStats.byStage?.completed ?? 0, color: 'text-emerald-400' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{s.label}:</span>
                          <span className={`text-xs font-bold tabular-nums ${s.color}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* ── Right column (1/3) ────────────────────────────────── */}
            <div className="space-y-4">

              {/* Quick actions ─────────────────────────────────────────── */}
              <motion.div
                className="bg-card rounded-2xl border border-border/50 p-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
              >
                <h2 className="text-sm font-semibold mb-3">Quick Access</h2>
                <div className="space-y-2">
                  {quickActions.slice(0, 5).map(qa => (
                    <QuickAction key={qa.href} {...qa} />
                  ))}
                </div>
              </motion.div>

              {/* Manifold status ─────────────────────────────────────── */}
              {hasPermission('scada') && manifolds.length > 0 && (
                <motion.div
                  className="bg-card rounded-2xl border border-border/50 p-5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.28 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">Manifolds</h2>
                    <Link href="/scada" className="text-xs text-brand-500 hover:text-brand-400 transition-colors font-medium">
                      SCADA →
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {manifolds.slice(0, 4).map(m => {
                      const mValves = manifoldValves[m._id] ?? [];
                      const valvesOn = mValves.filter(v => v.operationalData.currentStatus === 'ON').length;
                      const valvesTotal = mValves.length || m.specifications.valveCount;
                      const hasAlarm = mValves.some(v => v.alarms.some(a => !a.acknowledged && !a.resolved));
                      const statusColor = m.status === 'Active' ? 'bg-emerald-500' : m.status === 'Fault' ? 'bg-red-500' : 'bg-muted';

                      return (
                        <Link key={m._id} href={`/manifolds/${m._id}`}>
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor} ${m.status === 'Active' ? 'animate-pulse' : ''}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground">{valvesOn}/{valvesTotal} valves on</p>
                            </div>
                            {hasAlarm && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {manifolds.length > 4 && (
                    <Link href="/scada" className="block mt-3 pt-3 border-t border-border/30 text-xs text-center text-muted-foreground hover:text-brand-500 transition-colors">
                      +{manifolds.length - 4} more manifolds
                    </Link>
                  )}
                </motion.div>
              )}

              {/* System info ─────────────────────────────────────────── */}
              <motion.div
                className="bg-card rounded-2xl border border-border/50 p-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.34 }}
              >
                <h2 className="text-sm font-semibold mb-3">Platform Info</h2>
                <div className="space-y-2.5">
                  {[
                    { label: 'Status', value: healthStatus, valueColor: healthColor },
                    { label: 'Manifolds', value: `${manifolds.length} configured` },
                    { label: 'LoRaWAN devices', value: `${lorawanTotal} registered` },
                    { label: 'Network devices', value: `${totalNetworkDevices} total` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-semibold ${row.valueColor || 'text-foreground'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

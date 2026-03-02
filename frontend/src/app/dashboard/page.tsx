'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import AnalyticsChart from '@/components/dashboard/AnalyticsChart';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppDispatch, RootState } from '@/store/store';
import { fetchDevices, updateDeviceData, updateDeviceStatus } from '@/store/slices/deviceSlice';
import {
  fetchDashboardStats, fetchAnalytics, fetchAlerts,
  updateSystemHealth, addActivity,
} from '@/store/slices/dashboardSlice';
import {
  fetchTTNApplications, fetchTTNStats, fetchTTNDevices,
  fetchTTNGateways, fetchTTNUplinks,
  setSelectedApplication as setTTNSelectedApplication,
} from '@/store/slices/ttnSlice';
import type { TTNGateway as TTNGatewayType } from '@/store/slices/ttnSlice';
import { useSocketTTN } from '@/hooks/useSocketTTN';
import { createAuthenticatedSocket } from '@/lib/socket';
import {
  Activity, AlertOctagon, AlertTriangle, ArrowDown, ArrowUp,
  BarChart3, Bell, ChevronRight, Clock, Database, Gauge,
  LayoutDashboard, Loader2, Map, Menu, Monitor, Network,
  Radio, RefreshCw, Server, Shield, Signal, Wifi, WifiOff,
  X, Cpu, MapPin, Eye, TrendingUp, TrendingDown,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type DashSection = 'overview' | 'devices' | 'gateways' | 'network' | 'alerts';
type Period = '24h' | '7d' | '30d';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const CHART_GRID   = 'rgba(255,255,255,0.04)';
const CHART_AXIS   = 'rgba(255,255,255,0.25)';
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  backdropFilter: 'blur(12px)',
  color: '#f1f5f9',
  fontSize: 12,
  padding: '8px 12px',
};
const C = {
  uplink:   '#10b981',
  downlink: '#3b82f6',
  rssi:     '#8b5cf6',
  snr:      '#f59e0b',
  online:   '#10b981',
  offline:  '#ef4444',
  brand:    '#6366f1',
  cyan:     '#06b6d4',
  pink:     '#ec4899',
} as const;
const SF_COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];
const DL_COLORS: Record<string, string> = {
  PENDING: '#f59e0b', SCHEDULED: '#3b82f6', SENT: '#10b981',
  ACKNOWLEDGED: '#6366f1', FAILED: '#ef4444',
};

const NAV_ITEMS: { id: DashSection; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Overview',          icon: LayoutDashboard },
  { id: 'devices',   label: 'Devices',            icon: Radio           },
  { id: 'gateways',  label: 'Gateways',           icon: Server          },
  { id: 'network',   label: 'Network Analytics',  icon: Network         },
  { id: 'alerts',    label: 'Alerts',             icon: Bell            },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function isEffectivelyOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 15 * 60 * 1000;
}

function rssiColor(rssi: number | null | undefined): string {
  if (rssi == null) return 'text-muted-foreground';
  if (rssi >= -75) return 'text-emerald-400';
  if (rssi >= -90) return 'text-amber-400';
  return 'text-red-400';
}

function formatChartKey(key: string): string {
  if (key.includes(' ')) return key.split(' ')[1] ?? key;
  if (key.includes('T')) return key.split('T')[0];
  return key;
}

function fmtFreq(hz: number): string {
  return (hz / 1_000_000).toFixed(1);
}

// ─────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────
function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
      online ? 'bg-emerald-500 shadow-sm shadow-emerald-500/70 animate-pulse' : 'bg-slate-500'
    }`} />
  );
}

function KpiCard({
  title, value, sub, color, icon: Icon, trend,
}: {
  title: string; value: string | number; sub?: string;
  color: string; icon: React.ElementType; trend?: 'up' | 'down' | null;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 flex flex-col gap-1 ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {trend === 'up'   && <TrendingUp   className="h-3 w-3 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
        <Icon className="h-4 w-4 text-brand-400" />
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      {label && <p className="mb-1 text-[10px] text-muted-foreground">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hourly Heatmap — 24-hour traffic distribution
// ─────────────────────────────────────────────────────────────
function HourlyHeatmap({ data }: { data: { _id: number; count: number }[] }) {
  const full = useMemo(() => {
    const map = Object.fromEntries(data.map((d) => [d._id, d.count]));
    const max = Math.max(1, ...data.map((d) => d.count));
    return Array.from({ length: 24 }, (_, h) => ({ h, count: map[h] ?? 0, max }));
  }, [data]);

  return (
    <div>
      <div className="grid grid-cols-12 gap-1">
        {full.map(({ h, count, max }) => {
          const pct = count / max;
          const bg = pct === 0
            ? 'bg-secondary/30'
            : pct < 0.25 ? 'bg-emerald-900/60'
            : pct < 0.5  ? 'bg-emerald-700/70'
            : pct < 0.75 ? 'bg-emerald-500/80'
            : 'bg-emerald-400';
          return (
            <div
              key={h}
              title={`${h}:00 — ${count} uplinks`}
              className={`h-8 rounded-sm cursor-default transition-all hover:scale-110 ${bg}`}
            />
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-12 gap-1">
        {full.map(({ h }) => (
          <p key={h} className="text-center text-[9px] text-muted-foreground/50 leading-none">
            {h % 6 === 0 ? `${h}h` : ''}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NOC Sidebar
// ─────────────────────────────────────────────────────────────
function NOCSidebar({
  section, onSection, open, onClose, alertCount,
}: {
  section: DashSection;
  onSection: (s: DashSection) => void;
  open: boolean;
  onClose: () => void;
  alertCount: number;
}) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-56 flex flex-col border-r border-border/40 bg-background/95 backdrop-blur-xl transition-transform duration-300
          lg:static lg:z-auto lg:translate-x-0 lg:h-auto lg:min-h-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/20">
              <Gauge className="h-4 w-4 text-brand-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-brand-400">NOC</span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-secondary/60 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onSection(id); onClose(); }}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                section === id
                  ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/20'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {id === 'alerts' && alertCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
              {section === id && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </nav>

        <div className="border-t border-border/30 px-4 py-3">
          <p className="text-[10px] text-muted-foreground/40 font-mono">SPACE IoT NOC v2</p>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ════════════════ MAIN PAGE ════════════════════════════════
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const dispatch        = useDispatch<AppDispatch>();
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [section,      setSection]      = useState<DashSection>('overview');
  const [period,       setPeriod]       = useState<Period>('7d');
  const [isConnected,  setIsConnected]  = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');

  // ── Redux state ──────────────────────────────────────────
  const {
    applications, devices, gateways, uplinks, stats, loading,
    selectedApplication: ttnSelectedApp,
  } = useSelector((s: RootState) => s.ttn);

  const selectedApp = useMemo(
    () => applications.find((a) => a._id === selectedAppId) ?? ttnSelectedApp ?? applications[0] ?? null,
    [applications, selectedAppId, ttnSelectedApp]
  );

  // ── Real-time socket ─────────────────────────────────────
  useSocketTTN(selectedApp?.applicationId ?? null);

  // ── Socket for legacy device/system events ────────────────
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    socket.on('connect',    () => { setIsConnected(true);  dispatch(updateSystemHealth({ network: 'excellent' })); });
    socket.on('disconnect', () => { setIsConnected(false); dispatch(updateSystemHealth({ network: 'poor' })); });
    socket.on('deviceData',   (d: { deviceId: string; data: Record<string, unknown> }) => {
      dispatch(updateDeviceData({ deviceId: d.deviceId, data: d.data }));
      dispatch(addActivity({ action: 'Data received', device: d.deviceId, status: 'success' }));
    });
    socket.on('deviceStatus', (d: { deviceId: string; status: string }) => {
      dispatch(updateDeviceStatus({ deviceId: d.deviceId, status: d.status }));
      dispatch(addActivity({ action: `Device ${d.status}`, device: d.deviceId, status: d.status === 'online' ? 'success' : 'warning' }));
    });
    return () => { socket.disconnect(); };
  }, [dispatch]);

  // ── Initial data fetch ───────────────────────────────────
  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      dispatch(fetchDevices()),
      dispatch(fetchDashboardStats()),
      dispatch(fetchAnalytics()),
      dispatch(fetchAlerts()),
      dispatch(fetchTTNApplications()),
    ]);
    setIsRefreshing(false);
  }, [dispatch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-select first app
  useEffect(() => {
    if (applications.length > 0 && !ttnSelectedApp) {
      dispatch(setTTNSelectedApplication(applications[0]));
    }
  }, [applications, ttnSelectedApp, dispatch]);

  // Fetch TTN data when app changes
  useEffect(() => {
    if (!selectedApp) return;
    dispatch(fetchTTNDevices(selectedApp.applicationId));
    dispatch(fetchTTNGateways(selectedApp.applicationId));
    dispatch(fetchTTNStats({ applicationId: selectedApp.applicationId, period }));
    dispatch(fetchTTNUplinks({ applicationId: selectedApp.applicationId, limit: 50 }));
  }, [selectedApp, period, dispatch]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => {
      dispatch(fetchDashboardStats());
      if (selectedApp) {
        dispatch(fetchTTNStats({ applicationId: selectedApp.applicationId, period }));
        dispatch(fetchTTNUplinks({ applicationId: selectedApp.applicationId, limit: 50 }));
      }
    }, 60_000);
    return () => clearInterval(t);
  }, [dispatch, selectedApp, period]);

  // ── Derived data ─────────────────────────────────────────
  const onlineDevices  = useMemo(() => devices.filter((d) => isEffectivelyOnline(d.lastSeen)), [devices]);
  const offlineDevices = useMemo(() => devices.filter((d) => !isEffectivelyOnline(d.lastSeen)), [devices]);
  const onlineGatewys  = useMemo(() => gateways.filter((g) => isEffectivelyOnline(g.lastSeen)), [gateways]);
  const offlineGatewys = useMemo(() => gateways.filter((g) => !isEffectivelyOnline(g.lastSeen)), [gateways]);

  const poorSignalDevices = useMemo(
    () => devices.filter((d) => d.metrics.avgRssi != null && d.metrics.avgRssi < -100),
    [devices]
  );

  const alertCount = offlineDevices.length + offlineGatewys.length + poorSignalDevices.length;

  // ── Chart data ───────────────────────────────────────────
  const msgVolumeData = useMemo(() => {
    if (!stats) return { labels: [] as string[], datasets: [] as { name: string; data: number[]; color: string }[] };
    const um: Record<string, number> = Object.fromEntries(stats.uplinkTimeSeries.map((u) => [u._id, u.count]));
    const dm: Record<string, number> = Object.fromEntries(stats.downlinkTimeSeries.map((d) => [d._id, d.count]));
    const keys = [...new Set([...Object.keys(um), ...Object.keys(dm)])].sort();
    return {
      labels: keys.map(formatChartKey),
      datasets: [
        { name: 'Uplinks',   data: keys.map((k) => um[k] ?? 0), color: C.uplink   },
        { name: 'Downlinks', data: keys.map((k) => dm[k] ?? 0), color: C.downlink },
      ],
    };
  }, [stats]);

  const uplinkTrendData = useMemo(() =>
    (stats?.uplinkTimeSeries ?? []).map((u) => ({
      t:     formatChartKey(u._id),
      count: u.count,
      rssi:  u.avgRssi  != null ? +u.avgRssi.toFixed(1)  : null,
      snr:   u.avgSnr   != null ? +u.avgSnr.toFixed(1)   : null,
    })),
    [stats]
  );

  const deviceStatusData = useMemo(() => [
    { name: 'Online',  value: onlineDevices.length,  color: C.online  },
    { name: 'Offline', value: offlineDevices.length, color: C.offline },
  ], [onlineDevices, offlineDevices]);

  const sfData = useMemo(() =>
    (stats?.sfDistribution ?? []).map((s) => ({ name: `SF${s._id}`, value: s.count })),
    [stats]
  );

  const freqData = useMemo(() =>
    (stats?.frequencyDistribution ?? []).map((f) => ({ name: `${fmtFreq(f._id)}`, value: f.count })),
    [stats]
  );

  const dlStatusData = useMemo(() =>
    (stats?.downlinkStatusBreakdown ?? []).map((d) => ({
      name:  d._id,
      value: d.count,
      color: DL_COLORS[d._id] ?? C.brand,
    })),
    [stats]
  );

  const gwTrafficData = useMemo(() =>
    (stats?.gatewayTraffic ?? [])
      .map((g) => ({ name: g._id.slice(-8), fullId: g._id, count: g.count, rssi: g.avgRssi, snr: g.avgSnr }))
      .sort((a, b) => b.count - a.count),
    [stats]
  );

  const gwSignalData = useMemo(() =>
    gateways.map((g) => ({
      name: (g.name || g.gatewayId).slice(-10),
      rssi: g.metrics.avgRssi   != null ? +g.metrics.avgRssi.toFixed(1)  : 0,
      snr:  g.metrics.avgSnr    != null ? +g.metrics.avgSnr.toFixed(1)   : 0,
    })),
    [gateways]
  );

  const topDevicesData = useMemo(() =>
    (stats?.topDevices ?? [])
      .slice(0, 8)
      .map((d) => ({
        id:    d._id.slice(-8),
        count: d.uplinkCount,
        rssi:  d.avgRssi != null ? +d.avgRssi.toFixed(1) : 0,
        snr:   d.avgSnr  != null ? +d.avgSnr.toFixed(1)  : 0,
      })),
    [stats]
  );

  const fcntData = useMemo(() => {
    const byDevice: Record<string, { fCnt: number; ts: string }[]> = {};
    for (const u of uplinks) {
      if (!byDevice[u.deviceId]) byDevice[u.deviceId] = [];
      byDevice[u.deviceId].push({ fCnt: u.fCnt, ts: u.receivedAt });
    }
    const topIds = Object.entries(byDevice)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([id]) => id);
    const allTs = [...new Set(uplinks.map((u) => formatChartKey(u.receivedAt)))].sort().slice(-20);
    return allTs.map((ts) => {
      const row: Record<string, number | string> = { ts };
      topIds.forEach((id) => {
        const entry = uplinks.find((u) => formatChartKey(u.receivedAt) === ts && u.deviceId === id);
        row[id.slice(-6)] = entry?.fCnt ?? 0;
      });
      return row;
    });
  }, [uplinks]);

  const fcntKeys = useMemo(() => {
    const byDevice: Record<string, number> = {};
    for (const u of uplinks) byDevice[u.deviceId] = (byDevice[u.deviceId] ?? 0) + 1;
    return Object.entries(byDevice).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id.slice(-6));
  }, [uplinks]);

  const recentUplinks = useMemo(() => [...uplinks].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  ).slice(0, 6), [uplinks]);

  // ── Render helpers ────────────────────────────────────────
  const periodBtns: Period[] = ['24h', '7d', '30d'];

  // ── Axis tick renderers ───────────────────────────────────
  const axisStyle = { fill: CHART_AXIS, fontSize: 10 };

  // ══════════════════════════════════════════════════════════
  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles showGradientOrbs />

        <div className="relative z-10 flex min-h-screen">

          {/* ── NOC Sidebar (handles mobile drawer + desktop static via lg: classes) */}
          <NOCSidebar
            section={section}
            onSection={setSection}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            alertCount={alertCount}
          />

          {/* ── Main Content ─────────────────────────────────── */}
          <div className="min-w-0 flex-1">

            {/* ── NOC Top Bar ───────────────────────────────── */}
            <div className="sticky top-16 z-20 flex items-center gap-3 border-b border-border/30 bg-background/80 px-4 py-2.5 backdrop-blur-xl">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 hover:bg-secondary/60 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Section title */}
              <div className="flex items-center gap-2 min-w-0">
                {React.createElement(NAV_ITEMS.find((n) => n.id === section)?.icon ?? LayoutDashboard, {
                  className: 'h-4 w-4 text-brand-400 shrink-0',
                })}
                <h1 className="truncate text-sm font-semibold">
                  {NAV_ITEMS.find((n) => n.id === section)?.label ?? 'Overview'}
                </h1>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Application selector */}
                {applications.length > 1 && (
                  <select
                    value={selectedAppId || ttnSelectedApp?._id || ''}
                    onChange={(e) => {
                      setSelectedAppId(e.target.value);
                      const app = applications.find((a) => a._id === e.target.value);
                      if (app) dispatch(setTTNSelectedApplication(app));
                    }}
                    className="h-7 rounded-lg border border-border/50 bg-background px-2 text-xs dark:[color-scheme:dark]"
                  >
                    {applications.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                )}

                {/* Period selector */}
                <div className="flex items-center gap-0.5 rounded-lg border border-border/40 p-0.5">
                  {periodBtns.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                        period === p
                          ? 'bg-brand-500/20 text-brand-400'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Connection dot */}
                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  isConnected
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {isConnected ? 'Live' : 'Offline'}
                </div>

                <Button
                  size="sm" variant="outline"
                  onClick={fetchAll} disabled={isRefreshing}
                  className="h-7 gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="flex items-center gap-2 px-5 py-2.5 text-xs text-muted-foreground border-b border-border/20">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading TTN data…
              </div>
            )}

            <div className="container px-4 py-6 max-w-7xl">

              {/* ══════════════════════════════════════════════
                  OVERVIEW SECTION
              ══════════════════════════════════════════════ */}
              {section === 'overview' && (
                <div className="space-y-6">

                  {/* Logo + Identity Row */}
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm">
                      <Image src="/logo-dept.svg" alt="Dept" width={44} height={44} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-400 to-cyan-400">
                        Space Auto Tech — IoT NOC
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        LoRaWAN Network Operations Center · {selectedApp?.name ?? 'No application selected'}
                        {selectedApp && <span className="ml-2 text-brand-400/60">{selectedApp.ttnRegion}</span>}
                      </p>
                    </div>
                    <div className="ml-auto w-11 h-11 rounded-xl overflow-hidden border border-border/50 bg-background/50 backdrop-blur-sm">
                      <Image src="/logo-sat.svg" alt="SAT" width={44} height={44} className="w-full h-full object-cover" />
                    </div>
                  </motion.div>

                  {/* KPI Row */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard title="Total Devices"  value={stats?.summary.totalDevices  ?? devices.length}
                      sub={`${onlineDevices.length} online`}  color="border-border/40 bg-secondary/20" icon={Radio}    trend="up" />
                    <KpiCard title="Online Rate"    value={`${stats?.summary.totalDevices ? Math.round((stats.summary.onlineDevices / stats.summary.totalDevices) * 100) : 0}%`}
                      sub={`${stats?.summary.onlineDevices ?? 0} active`} color="border-emerald-500/20 bg-emerald-500/5" icon={Wifi}     trend="up" />
                    <KpiCard title="Total Uplinks"  value={(stats?.summary.totalUplinks ?? 0).toLocaleString()}
                      sub={`${stats?.summary.recentUplinks ?? 0} recent`}  color="border-brand-500/20 bg-brand-500/5"  icon={Activity} trend="up" />
                    <KpiCard title="Gateways"       value={`${onlineGatewys.length} / ${gateways.length}`}
                      sub={`${stats?.summary.totalGateways ?? gateways.length} total`} color="border-blue-500/20 bg-blue-500/5" icon={Server}   />
                  </div>

                  {/* Message Volume Chart */}
                  <Card className="p-4">
                    <SectionHeader icon={BarChart3} title="Network Traffic" sub={`Uplinks & downlinks · last ${period}`} />
                    {msgVolumeData.datasets.length > 0
                      ? <AnalyticsChart title="Network Traffic" data={msgVolumeData} type="multiBar" height={200} />
                      : <div className="flex h-44 items-center justify-center text-xs text-muted-foreground/50">No traffic data available</div>
                    }
                  </Card>

                  {/* Device Status Donut + Recent Uplinks */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Device Status Donut */}
                    <Card className="p-4">
                      <SectionHeader icon={Cpu} title="Device Status" />
                      {deviceStatusData.every((d) => d.value === 0) ? (
                        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground/50">No devices</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={deviceStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                              paddingAngle={4} dataKey="value">
                              {deviceStatusData.map((d, i) => (
                                <Cell key={i} fill={d.color} stroke="rgba(0,0,0,0.2)" />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                            <Legend iconType="circle" iconSize={8}
                              formatter={(v) => <span style={{ fontSize: 11, color: CHART_AXIS }}>{v}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Card>

                    {/* Recent Uplinks */}
                    <Card className="p-4">
                      <SectionHeader icon={Activity} title="Recent Uplinks" />
                      {recentUplinks.length === 0
                        ? <div className="flex h-40 items-center justify-center text-xs text-muted-foreground/50">Waiting for uplinks…</div>
                        : (
                          <div className="space-y-1.5">
                            {recentUplinks.map((u) => {
                              const dev = devices.find((d) => d.deviceId === u.deviceId);
                              return (
                                <div key={u._id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-1.5 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ArrowUp className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span className="truncate font-medium text-foreground/80">
                                      {dev?.displayName || dev?.name || u.deviceId.slice(-8)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className={`font-mono ${rssiColor(u.rssi)}`}>{u.rssi} dBm</span>
                                    <span className="text-muted-foreground/50">
                                      {new Date(u.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </Card>
                  </div>

                  {/* Project Subsystems */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">System Modules</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[
                        { title: 'SCADA / SLD', desc: 'Valve control & monitoring', href: '/scada', icon: Monitor, color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', iconCls: 'text-blue-400 bg-blue-500/20' },
                        { title: 'OMS / Map',   desc: 'Operations management',       href: '/oms',   icon: Map,     color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', iconCls: 'text-purple-400 bg-purple-500/20' },
                        { title: 'Reports',     desc: 'Data export & analytics',     href: '/reports', icon: BarChart3, color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30', iconCls: 'text-cyan-400 bg-cyan-500/20' },
                      ].map(({ title, desc, href, icon: Icon, color, border, iconCls }) => (
                        <Link key={href} href={href}>
                          <div className={`rounded-xl border p-4 bg-gradient-to-br ${color} ${border} flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform`}>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{title}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50 shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  DEVICES SECTION
              ══════════════════════════════════════════════ */}
              {section === 'devices' && (
                <div className="space-y-6">
                  <SectionHeader icon={Radio} title="Device Monitoring" sub={`${devices.length} devices · ${period} analytics`} />

                  {/* KPI row */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard title="Total"    value={devices.length}          color="border-border/40 bg-secondary/20"       icon={Radio}    />
                    <KpiCard title="Online"   value={onlineDevices.length}    color="border-emerald-500/20 bg-emerald-500/5" icon={Wifi}     />
                    <KpiCard title="Offline"  value={offlineDevices.length}   color="border-red-500/20 bg-red-500/5"         icon={WifiOff}  />
                    <KpiCard title="Poor Sig" value={poorSignalDevices.length} color="border-amber-500/20 bg-amber-500/5"    icon={Signal}   />
                  </div>

                  {/* Uplink trend + RSSI trend */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="p-4">
                      <SectionHeader icon={Activity} title="Uplink Volume Trend" sub="Count over time" />
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={uplinkTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="uplinkGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={C.uplink} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={C.uplink} stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="t" tick={axisStyle} />
                          <YAxis tick={axisStyle} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="count" name="Uplinks" stroke={C.uplink}
                            fill="url(#uplinkGrad)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card className="p-4">
                      <SectionHeader icon={Signal} title="RSSI Trend" sub="Average signal quality" />
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={uplinkTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="t" tick={axisStyle} />
                          <YAxis tick={axisStyle} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="rssi" name="RSSI (dBm)" stroke={C.rssi}
                            strokeWidth={2} dot={false} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>

                  {/* Top devices bar + FCnt line */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="p-4">
                      <SectionHeader icon={Database} title="Top Devices by Uplinks" />
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={topDevicesData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                          <XAxis type="number" tick={axisStyle} />
                          <YAxis dataKey="id" type="category" tick={axisStyle} width={60} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Uplinks" fill={C.brand} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card className="p-4">
                      <SectionHeader icon={TrendingUp} title="FCnt Progression" sub="Frame counter over time (top 3 devices)" />
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={fcntData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="ts" tick={axisStyle} />
                          <YAxis tick={axisStyle} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: CHART_AXIS }}>{v}</span>} />
                          {fcntKeys.map((k, i) => (
                            <Line key={k} type="monotone" dataKey={k} name={k}
                              stroke={SF_COLORS[i % SF_COLORS.length]} strokeWidth={1.5} dot={false} connectNulls />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>

                  {/* Device reliability table */}
                  <Card className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Eye className="h-4 w-4 text-brand-400" />
                        Device Status Matrix
                      </h3>
                      <Badge variant="outline" className="text-[10px]">{devices.length} devices</Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/20 bg-secondary/20">
                            {['Status', 'Device', 'Dev EUI', 'Last Seen', 'Uplinks', 'RSSI', 'SNR'].map((h) => (
                              <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                          {[...devices]
                            .sort((a, b) => Number(isEffectivelyOnline(b.lastSeen)) - Number(isEffectivelyOnline(a.lastSeen)))
                            .map((d) => {
                              const online = isEffectivelyOnline(d.lastSeen);
                              const rssi = d.metrics.avgRssi;
                              return (
                                <tr key={d._id} className="transition-colors hover:bg-secondary/20">
                                  <td className="px-4 py-2"><StatusDot online={online} /></td>
                                  <td className="px-4 py-2 font-medium text-foreground/90">
                                    {d.displayName || d.name || d.deviceId}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-muted-foreground">{d.devEui}</td>
                                  <td className="px-4 py-2 text-muted-foreground">
                                    {d.lastSeen ? new Date(d.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                  </td>
                                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{d.metrics.totalUplinks}</td>
                                  <td className={`px-4 py-2 tabular-nums font-mono font-semibold ${rssiColor(rssi)}`}>
                                    {rssi != null ? `${rssi.toFixed(1)} dBm` : '—'}
                                  </td>
                                  <td className="px-4 py-2 tabular-nums text-muted-foreground">
                                    {d.metrics.avgSnr != null ? `${d.metrics.avgSnr.toFixed(1)} dB` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                      {devices.length === 0 && (
                        <div className="flex h-20 items-center justify-center text-xs text-muted-foreground/50">
                          No devices found — select an application above
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  GATEWAYS SECTION
              ══════════════════════════════════════════════ */}
              {section === 'gateways' && (
                <div className="space-y-6">
                  <SectionHeader icon={Server} title="Gateway Monitoring" sub={`${gateways.length} gateways · infrastructure health`} />

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard title="Total"    value={gateways.length}          color="border-border/40 bg-secondary/20"       icon={Server}   />
                    <KpiCard title="Online"   value={onlineGatewys.length}     color="border-emerald-500/20 bg-emerald-500/5" icon={Wifi}     />
                    <KpiCard title="Offline"  value={offlineGatewys.length}    color="border-red-500/20 bg-red-500/5"         icon={WifiOff}  />
                    <KpiCard title="Avg RSSI" value={`${stats?.summary ? '—' : '—'}`}
                      sub={gwSignalData.length ? `${(gwSignalData.reduce((s, g) => s + g.rssi, 0) / gwSignalData.length).toFixed(1)} dBm` : ''}
                      color="border-purple-500/20 bg-purple-500/5" icon={Signal} />
                  </div>

                  {/* Gateway load distribution + signal quality */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="p-4">
                      <SectionHeader icon={Database} title="Gateway Load Distribution" sub="Total uplinks seen" />
                      {gwTrafficData.length > 0
                        ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={gwTrafficData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                              <XAxis type="number" tick={axisStyle} />
                              <YAxis dataKey="name" type="category" tick={axisStyle} width={65} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="count" name="Uplinks Seen" fill={C.uplink} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )
                        : <div className="flex h-44 items-center justify-center text-xs text-muted-foreground/50">No gateway traffic data</div>
                      }
                    </Card>

                    <Card className="p-4">
                      <SectionHeader icon={Signal} title="Signal Quality per Gateway" sub="Avg RSSI & SNR" />
                      {gwSignalData.length > 0
                        ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <ComposedChart data={gwSignalData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                              <XAxis dataKey="name" tick={axisStyle} />
                              <YAxis tick={axisStyle} />
                              <Tooltip content={<ChartTooltip />} />
                              <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: CHART_AXIS }}>{v}</span>} />
                              <Bar dataKey="rssi" name="Avg RSSI" fill={C.rssi} radius={[4, 4, 0, 0]} />
                              <Line type="monotone" dataKey="snr" name="Avg SNR" stroke={C.snr} strokeWidth={2} dot={{ r: 4, fill: C.snr }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )
                        : <div className="flex h-44 items-center justify-center text-xs text-muted-foreground/50">No gateway signal data</div>
                      }
                    </Card>
                  </div>

                  {/* Gateway cards */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gateway Inventory</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {gateways.map((gw: TTNGatewayType) => {
                        const online = isEffectivelyOnline(gw.lastSeen);
                        const gwTraffic = gwTrafficData.find((g) => g.fullId === gw.gatewayId);
                        return (
                          <Card key={gw._id} className={`p-4 border transition-colors ${online ? 'border-emerald-500/20' : 'border-border/40'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <StatusDot online={online} />
                                <div>
                                  <p className="text-sm font-semibold truncate max-w-[140px]">{gw.name || gw.gatewayId}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground">{gw.gatewayEui ?? gw.gatewayId.slice(-12)}</p>
                                </div>
                              </div>
                              <Badge className={`text-[10px] ${online ? 'bg-emerald-600/20 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>
                                {online ? 'Online' : 'Offline'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {[
                                ['Uplinks',  (gwTraffic?.count ?? gw.metrics.totalUplinksSeen).toLocaleString()],
                                ['Avg RSSI', gw.metrics.avgRssi != null ? `${gw.metrics.avgRssi.toFixed(1)} dBm` : '—'],
                                ['Last RSSI',gw.metrics.lastRssi != null ? `${gw.metrics.lastRssi} dBm` : '—'],
                                ['Avg SNR',  gw.metrics.avgSnr != null  ? `${gw.metrics.avgSnr.toFixed(1)} dB`  : '—'],
                              ].map(([k, v]) => (
                                <div key={k} className="rounded-lg bg-secondary/30 px-2 py-1">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{k}</p>
                                  <p className="font-medium tabular-nums">{v}</p>
                                </div>
                              ))}
                            </div>
                            {gw.location && (
                              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {gw.location.latitude.toFixed(4)}, {gw.location.longitude.toFixed(4)}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                      {gateways.length === 0 && (
                        <div className="col-span-full flex h-20 items-center justify-center text-xs text-muted-foreground/50">
                          No gateways found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  NETWORK ANALYTICS SECTION
              ══════════════════════════════════════════════ */}
              {section === 'network' && (
                <div className="space-y-6">
                  <SectionHeader icon={Network} title="Network Analytics" sub={`Advanced LoRaWAN diagnostics · ${period}`} />

                  {/* RSSI + SNR trends */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="p-4">
                      <SectionHeader icon={Signal} title="RSSI Trend" sub="Network-wide average" />
                      <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={uplinkTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="rssiGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={C.rssi} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={C.rssi} stopOpacity={0}   />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="t" tick={axisStyle} />
                          <YAxis tick={axisStyle} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="rssi" name="Avg RSSI" stroke={C.rssi}
                            fill="url(#rssiGrad)" strokeWidth={2} dot={false} connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>

                    <Card className="p-4">
                      <SectionHeader icon={Activity} title="SNR Trend" sub="Signal-to-noise ratio" />
                      <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={uplinkTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="snrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={C.snr} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={C.snr} stopOpacity={0}   />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis dataKey="t" tick={axisStyle} />
                          <YAxis tick={axisStyle} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="snr" name="Avg SNR" stroke={C.snr}
                            fill="url(#snrGrad)" strokeWidth={2} dot={false} connectNulls />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>

                  {/* Hourly Heatmap */}
                  <Card className="p-4">
                    <SectionHeader icon={Clock} title="Hourly Traffic Heatmap" sub="Uplink density by hour of day (00h–23h)" />
                    {(stats?.hourlyHeatmap ?? []).length > 0
                      ? <HourlyHeatmap data={stats!.hourlyHeatmap} />
                      : <div className="flex h-16 items-center justify-center text-xs text-muted-foreground/50">No heatmap data available</div>
                    }
                  </Card>

                  {/* SF Distribution + Frequency Distribution */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="p-4">
                      <SectionHeader icon={Radio} title="Spreading Factor Distribution" sub="SF7–SF12 usage breakdown" />
                      {sfData.length > 0
                        ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie data={sfData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                                paddingAngle={4} dataKey="value" nameKey="name">
                                {sfData.map((_, i) => (
                                  <Cell key={i} fill={SF_COLORS[i % SF_COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                              <Legend iconType="circle" iconSize={8}
                                formatter={(v) => <span style={{ fontSize: 11, color: CHART_AXIS }}>{v}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        )
                        : <div className="flex h-44 items-center justify-center text-xs text-muted-foreground/50">No SF data</div>
                      }
                    </Card>

                    <Card className="p-4">
                      <SectionHeader icon={Radio} title="Frequency Distribution" sub="Channel utilisation (MHz)" />
                      {freqData.length > 0
                        ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={freqData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                              <XAxis dataKey="name" tick={axisStyle} label={{ value: 'MHz', position: 'insideBottom', fill: CHART_AXIS, fontSize: 10, offset: -2 }} />
                              <YAxis tick={axisStyle} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="value" name="Count" fill={C.cyan} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )
                        : <div className="flex h-44 items-center justify-center text-xs text-muted-foreground/50">No frequency data</div>
                      }
                    </Card>
                  </div>

                  {/* Downlink Status Breakdown */}
                  <Card className="p-4">
                    <SectionHeader icon={ArrowDown} title="Downlink Status Breakdown" sub={`${stats?.summary.totalDownlinks ?? 0} total · ${stats?.summary.pendingDownlinks ?? 0} pending`} />
                    {dlStatusData.length > 0
                      ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={dlStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                                paddingAngle={4} dataKey="value" nameKey="name">
                                {dlStatusData.map((d, i) => (
                                  <Cell key={i} fill={d.color} stroke="rgba(0,0,0,0.2)" />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                              <Legend iconType="circle" iconSize={8}
                                formatter={(v) => <span style={{ fontSize: 11, color: CHART_AXIS }}>{v}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col justify-center gap-2">
                            {dlStatusData.map((d) => (
                              <div key={d.name} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                                  <span className="font-medium">{d.name}</span>
                                </div>
                                <span className="tabular-nums font-bold">{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                      : <div className="flex h-20 items-center justify-center text-xs text-muted-foreground/50">No downlink data</div>
                    }
                  </Card>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  ALERTS SECTION
              ══════════════════════════════════════════════ */}
              {section === 'alerts' && (
                <div className="space-y-6">
                  <SectionHeader icon={Bell} title="System Alerts" sub="Network health issues requiring attention" />

                  {/* Alert summary cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard title="Offline Devices"  value={offlineDevices.length}
                      color={offlineDevices.length  > 0 ? 'border-red-500/30 bg-red-500/5'    : 'border-border/40 bg-secondary/20'} icon={WifiOff} />
                    <KpiCard title="Poor Signal"      value={poorSignalDevices.length}
                      color={poorSignalDevices.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/40 bg-secondary/20'} icon={Signal} />
                    <KpiCard title="GW Offline"       value={offlineGatewys.length}
                      color={offlineGatewys.length  > 0 ? 'border-red-500/30 bg-red-500/5'    : 'border-border/40 bg-secondary/20'} icon={Server} />
                    <KpiCard title="Pending DL"       value={stats?.summary.pendingDownlinks ?? 0}
                      color="border-blue-500/20 bg-blue-500/5" icon={ArrowDown} />
                  </div>

                  {alertCount === 0 && (
                    <Card className="flex items-center gap-3 p-6 border-emerald-500/20 bg-emerald-500/5">
                      <Shield className="h-8 w-8 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-400">All systems nominal</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No active alerts detected</p>
                      </div>
                    </Card>
                  )}

                  {/* Offline Devices */}
                  {offlineDevices.length > 0 && (
                    <Card className="overflow-hidden border-red-500/20">
                      <div className="flex items-center gap-2 border-b border-border/30 px-5 py-3 bg-red-500/5">
                        <AlertOctagon className="h-4 w-4 text-red-400 shrink-0" />
                        <h3 className="text-sm font-semibold text-red-400">Offline Devices ({offlineDevices.length})</h3>
                      </div>
                      <div className="divide-y divide-border/10">
                        {offlineDevices.map((d) => (
                          <div key={d._id} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-secondary/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <WifiOff className="h-4 w-4 text-red-400/60 shrink-0" />
                              <div>
                                <p className="font-medium">{d.displayName || d.name || d.deviceId}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{d.devEui}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-xs text-muted-foreground">Last seen</p>
                              <p className="text-[11px] font-medium">
                                {d.lastSeen
                                  ? new Date(d.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'Never'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Poor Signal Devices */}
                  {poorSignalDevices.length > 0 && (
                    <Card className="overflow-hidden border-amber-500/20">
                      <div className="flex items-center gap-2 border-b border-border/30 px-5 py-3 bg-amber-500/5">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                        <h3 className="text-sm font-semibold text-amber-400">Poor Signal Devices — RSSI &lt; −100 dBm ({poorSignalDevices.length})</h3>
                      </div>
                      <div className="divide-y divide-border/10">
                        {poorSignalDevices.map((d) => (
                          <div key={d._id} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-secondary/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <Signal className="h-4 w-4 text-amber-400/60 shrink-0" />
                              <div>
                                <p className="font-medium">{d.displayName || d.name || d.deviceId}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{d.devEui}</p>
                              </div>
                            </div>
                            <span className={`font-mono font-semibold text-xs shrink-0 ml-4 ${rssiColor(d.metrics.avgRssi)}`}>
                              {d.metrics.avgRssi?.toFixed(1)} dBm
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Offline Gateways */}
                  {offlineGatewys.length > 0 && (
                    <Card className="overflow-hidden border-red-500/20">
                      <div className="flex items-center gap-2 border-b border-border/30 px-5 py-3 bg-red-500/5">
                        <Server className="h-4 w-4 text-red-400 shrink-0" />
                        <h3 className="text-sm font-semibold text-red-400">Offline Gateways ({offlineGatewys.length})</h3>
                      </div>
                      <div className="divide-y divide-border/10">
                        {offlineGatewys.map((g) => (
                          <div key={g._id} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-secondary/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <WifiOff className="h-4 w-4 text-red-400/60 shrink-0" />
                              <div>
                                <p className="font-medium">{g.name || g.gatewayId}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">{g.gatewayEui ?? g.gatewayId}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground shrink-0 ml-4">
                              {g.lastSeen
                                ? new Date(g.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Never seen'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

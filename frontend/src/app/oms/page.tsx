'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { AppDispatch, RootState } from '@/store/store';
import {
  fetchManifolds,
  fetchManifoldDetail,
  acknowledgeAlarm,
  resolveAlarm,
} from '@/store/slices/manifoldSlice';
import {
  BarChart3,
  Map,
  Bell,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  MapPin,
  RefreshCw,
  Calendar,
  Clock,
  Layers,
  TrendingUp,
  Filter,
} from 'lucide-react';

// ─── Dynamic Leaflet map (SSR disabled) ──────────────────────────────────

const CommandAreaMap = dynamic(
  () => import('@/components/oms/CommandAreaMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] flex items-center justify-center rounded-xl border border-border/50 bg-card/30 text-muted-foreground text-sm">
        Loading map…
      </div>
    ),
  }
);

// ─── Types ───────────────────────────────────────────────────────────────

type OmsTab = 'overview' | 'alarms' | 'assets' | 'map';
type AlarmSeverityFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO';
type AlarmStatusFilter = 'active' | 'acknowledged' | 'resolved' | 'all';

interface Alarm {
  alarmId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolved?: boolean;
  manifoldName?: string;
  manifoldId?: string;
  valveId?: string;
  valveNumber?: number;
}

interface Component {
  _id: string;
  componentType: string;
  specifications?: { manufacturer?: string; model?: string; size?: string; rating?: string };
  position?: { section?: string };
  maintenance?: {
    lastServiceDate?: string;
    nextServiceDate?: string;
    serviceInterval?: number;
    history?: unknown[];
  };
  manifoldName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function severityBadge(sev: string) {
  if (sev === 'CRITICAL') return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (sev === 'WARNING') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function nextServiceColor(d?: string) {
  const days = daysUntil(d);
  if (days === null) return 'text-muted-foreground';
  if (days < 0) return 'text-red-400';
  if (days < 30) return 'text-amber-400';
  return 'text-emerald-400';
}

function nextServiceLabel(d?: string) {
  const days = daysUntil(d);
  if (days === null) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days < 30) return `in ${days}d`;
  return formatDate(d);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon: Icon, loading }: {
  label: string;
  value: React.ReactNode;
  color: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-2 ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      {loading ? (
        <div className="h-9 w-14 rounded-lg bg-muted/20 animate-pulse mt-1" />
      ) : (
        <div className="text-3xl font-bold">{value}</div>
      )}
    </div>
  );
}

// ─── Tab config ──────────────────────────────────────────────────────────

const TABS: { id: OmsTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'alarms', label: 'Alarms', icon: Bell },
  { id: 'assets', label: 'Asset Registry', icon: Package },
  { id: 'map', label: 'Command Area Map', icon: Map },
];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function OmsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<OmsTab>('overview');
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<AlarmSeverityFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlarmStatusFilter>('active');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('ALL');

  const { manifolds, valves, components, loading } = useSelector((s: RootState) => s.manifolds);

  useEffect(() => { dispatch(fetchManifolds({})); }, [dispatch]);

  useEffect(() => {
    if (manifolds.length === 0 || detailsLoaded) return;
    Promise.all(manifolds.map((m) => dispatch(fetchManifoldDetail(m._id)))).then(
      () => setDetailsLoaded(true)
    );
  }, [manifolds, detailsLoaded, dispatch]);

  const allValves = useMemo(() => Object.values(valves).flat(), [valves]);

  const allAlarms = useMemo<Alarm[]>(() => {
    const result: Alarm[] = [];
    for (const manifold of manifolds) {
      const mValves = valves[manifold._id] ?? [];
      for (const valve of mValves) {
        const alarms = (valve as unknown as { alarms?: Alarm[] }).alarms ?? [];
        for (const alarm of alarms) {
          result.push({
            ...alarm,
            manifoldName: manifold.name,
            manifoldId: manifold._id,
            valveId: (valve as unknown as { _id: string })._id,
            valveNumber: (valve as unknown as { valveNumber: number }).valveNumber,
          });
        }
      }
    }
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [manifolds, valves]);

  const allComponents = useMemo<Component[]>(() => {
    const result: Component[] = [];
    for (const manifold of manifolds) {
      const comps = components[manifold._id] ?? [];
      for (const comp of comps) {
        result.push({ ...(comp as unknown as Component), manifoldName: manifold.name });
      }
    }
    return result;
  }, [manifolds, components]);

  // Filtered alarms
  const filteredAlarms = useMemo(() => allAlarms.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter === 'active' && (a.acknowledged || a.resolved)) return false;
    if (statusFilter === 'acknowledged' && (!a.acknowledged || a.resolved)) return false;
    if (statusFilter === 'resolved' && !a.resolved) return false;
    return true;
  }), [allAlarms, severityFilter, statusFilter]);

  // Asset types for filter
  const assetTypes = useMemo(() => {
    const types = new Set(allComponents.map((c) => c.componentType));
    return ['ALL', ...Array.from(types)];
  }, [allComponents]);

  const filteredComponents = useMemo(() =>
    assetTypeFilter === 'ALL' ? allComponents : allComponents.filter((c) => c.componentType === assetTypeFilter),
    [allComponents, assetTypeFilter]
  );

  // KPI values
  const activeAlarmCount = allAlarms.filter((a) => !a.acknowledged && !a.resolved).length;
  const criticalCount = allAlarms.filter((a) => a.severity === 'CRITICAL' && !a.resolved).length;
  const activeValveCount = allValves.filter(
    (v) => (v as unknown as { operationalData?: { currentStatus: string } }).operationalData?.currentStatus === 'ON'
  ).length;

  // Next maintenance due (soonest upcoming)
  const maintenanceDue = useMemo(() => {
    const upcoming = allComponents
      .map((c) => ({ name: `${c.manifoldName} · ${c.componentType}`, days: daysUntil(c.maintenance?.nextServiceDate), date: c.maintenance?.nextServiceDate }))
      .filter((x) => x.days !== null && x.days <= 30)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
    return upcoming;
  }, [allComponents]);

  const handleRefresh = () => {
    setDetailsLoaded(false);
    dispatch(fetchManifolds({}));
  };

  const mapManifolds = manifolds.map((m) => ({
    _id: m._id,
    name: m.name,
    status: m.status,
    installationDetails: m.installationDetails,
    metadata: m.metadata,
    valveCount: (valves[m._id] ?? []).length,
  }));

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl border border-brand-500/20">
                  <BarChart3 className="h-6 w-6 text-brand-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-purple-400 to-brand-500">
                  OMS Dashboard
                </h1>
                <p className="text-muted-foreground text-sm">Operations Management System</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-wrap gap-2"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'alarms' && activeAlarmCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    {activeAlarmCount}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* ─── Overview Tab ─────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">

              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard
                  label="Total Manifolds"
                  value={<span className="text-brand-400">{manifolds.length}</span>}
                  color="border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-brand-600/5"
                  icon={Layers}
                  loading={loading && manifolds.length === 0}
                />
                <KpiCard
                  label="Active Valves"
                  value={<span className="text-emerald-400">{activeValveCount}</span>}
                  color="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"
                  icon={TrendingUp}
                  loading={!detailsLoaded && manifolds.length > 0}
                />
                <KpiCard
                  label="Active Alarms"
                  value={<span className="text-red-400">{activeAlarmCount}</span>}
                  color="border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5"
                  icon={Bell}
                  loading={!detailsLoaded && manifolds.length > 0}
                />
                <KpiCard
                  label="Critical"
                  value={<span className="text-orange-400">{criticalCount}</span>}
                  color="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5"
                  icon={AlertTriangle}
                  loading={!detailsLoaded && manifolds.length > 0}
                />
                <KpiCard
                  label="Components"
                  value={<span className="text-purple-400">{allComponents.length}</span>}
                  color="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5"
                  icon={Package}
                  loading={!detailsLoaded && manifolds.length > 0}
                />
              </div>

              {/* Maintenance due alerts */}
              {maintenanceDue.length > 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-amber-400">Maintenance Due Soon</h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {maintenanceDue.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {maintenanceDue.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className={`font-semibold text-xs ${(item.days ?? 0) < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                          {(item.days ?? 0) < 0 ? `${Math.abs(item.days!)}d overdue` : item.days === 0 ? 'Today' : `in ${item.days}d`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manifold health cards */}
              {loading && manifolds.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => <div key={i} className="h-48 rounded-2xl border border-border/30 bg-card/30 animate-pulse" />)}
                </div>
              ) : manifolds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No manifolds found. Add one from the dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {manifolds.map((m) => {
                    const mValves = valves[m._id] ?? [];
                    const onCount = mValves.filter(
                      (v) => (v as unknown as { operationalData?: { currentStatus: string } }).operationalData?.currentStatus === 'ON'
                    ).length;
                    const faultCount = mValves.filter(
                      (v) => (v as unknown as { operationalData?: { currentStatus: string } }).operationalData?.currentStatus === 'FAULT'
                    ).length;
                    const alarmCount = mValves.reduce(
                      (sum, v) => sum + ((v as unknown as { alarms?: Alarm[] }).alarms?.filter((a) => !a.acknowledged && !a.resolved).length ?? 0),
                      0
                    );
                    const onPct = mValves.length > 0 ? Math.round((onCount / mValves.length) * 100) : 0;
                    return (
                      <div
                        key={m._id}
                        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-4 hover:border-brand-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm">{m.name}</h3>
                          <div className="flex items-center gap-1.5">
                            {faultCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                {faultCount} FAULT
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : m.status === 'Fault' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>{m.status}</span>
                          </div>
                        </div>

                        {/* Valve ON bar */}
                        {mValves.length > 0 && (
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Valves Active</span>
                              <span className="font-semibold text-foreground">{onCount}/{mValves.length}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${onPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Active Alarms</p>
                            <p className={`font-bold ${alarmCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{alarmCount}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Next Service</p>
                            <p className={`font-mono ${nextServiceColor(m.metadata?.nextMaintenanceDate)}`}>
                              {nextServiceLabel(m.metadata?.nextMaintenanceDate)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Last Service</p>
                            <p className="font-mono">{formatDate(m.metadata?.lastMaintenanceDate)}</p>
                          </div>
                          {m.installationDetails?.location && (
                            <div className="rounded-lg bg-muted/30 p-2.5 flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                              <p className="text-muted-foreground truncate">{m.installationDetails.location}</p>
                            </div>
                          )}
                        </div>

                        <Link href={`/manifolds/${m._id}`}>
                          <Button size="sm" variant="outline" className="w-full h-7 text-xs">
                            View Detail
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Alarms Tab ───────────────────────────────────────────── */}
          {activeTab === 'alarms' && (
            <motion.div key="alarms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">

              {/* Alarm counts summary */}
              {detailsLoaded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Critical', count: allAlarms.filter((a) => a.severity === 'CRITICAL' && !a.resolved).length, cls: 'border-red-500/30 bg-red-500/5 text-red-400' },
                    { label: 'Warning', count: allAlarms.filter((a) => a.severity === 'WARNING' && !a.resolved).length, cls: 'border-amber-500/30 bg-amber-500/5 text-amber-400' },
                    { label: 'Info', count: allAlarms.filter((a) => a.severity === 'INFO' && !a.resolved).length, cls: 'border-blue-500/30 bg-blue-500/5 text-blue-400' },
                    { label: 'Resolved', count: allAlarms.filter((a) => a.resolved).length, cls: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.cls}`}>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold">{s.count}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground">Severity:</span>
                </div>
                {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as AlarmSeverityFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSeverityFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      severityFilter === f
                        ? f === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          f === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          f === 'INFO' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-brand-500/20 text-brand-400 border-brand-500/30'
                        : 'border-border/30 text-muted-foreground/60 hover:border-border/60'
                    }`}
                  >{f}</button>
                ))}
                <div className="h-4 w-px bg-border/50 mx-1" />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Status:</span>
                </div>
                {([
                  { key: 'active', label: 'Active' },
                  { key: 'acknowledged', label: 'Acknowledged' },
                  { key: 'resolved', label: 'Resolved' },
                  { key: 'all', label: 'All' },
                ] as { key: AlarmStatusFilter; label: string }[]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      statusFilter === f.key
                        ? 'bg-muted/40 text-foreground border-border/60'
                        : 'border-border/30 text-muted-foreground/60 hover:border-border/60'
                    }`}
                  >{f.label}</button>
                ))}
              </div>

              {!detailsLoaded && manifolds.length > 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl border border-border/30 bg-card/30 animate-pulse" />)}
                </div>
              ) : filteredAlarms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 opacity-60 mb-3" />
                  <p className="text-muted-foreground text-sm">No alarms match the current filter.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          {['Severity', 'Manifold', 'Valve', 'Message', 'Time', 'Status', 'Actions'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <AnimatePresence initial={false}>
                          {filteredAlarms.map((alarm, idx) => (
                            <motion.tr
                              key={`${alarm.alarmId}-${idx}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge(alarm.severity)}`}>
                                  {alarm.severity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-medium">{alarm.manifoldName ?? '—'}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">V{alarm.valveNumber ?? '—'}</td>
                              <td className="px-4 py-3 text-xs max-w-[220px] truncate">{alarm.message}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                                {new Date(alarm.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {alarm.resolved ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" />Resolved</span>
                                ) : alarm.acknowledged ? (
                                  <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle className="h-3 w-3" />Acked</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" />Active</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  {!alarm.acknowledged && !alarm.resolved && alarm.valveId && (
                                    <button
                                      onClick={() => dispatch(acknowledgeAlarm({ valveId: alarm.valveId!, alarmId: alarm.alarmId }))}
                                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                                    >Ack</button>
                                  )}
                                  {!alarm.resolved && alarm.valveId && (
                                    <button
                                      onClick={() => dispatch(resolveAlarm({ valveId: alarm.valveId!, alarmId: alarm.alarmId }))}
                                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                    >Resolve</button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Asset Registry Tab ───────────────────────────────────── */}
          {activeTab === 'assets' && (
            <motion.div key="assets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">

              {/* Summary */}
              {detailsLoaded && allComponents.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2.5 rounded-xl border border-border/50 bg-card/60 text-xs">
                    <span className="text-muted-foreground">Total Components </span>
                    <span className="font-bold">{allComponents.length}</span>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400">
                    Overdue: <span className="font-bold">{allComponents.filter((c) => (daysUntil(c.maintenance?.nextServiceDate) ?? 1) < 0).length}</span>
                  </div>
                  <div className="px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">
                    Due Soon: <span className="font-bold">{allComponents.filter((c) => { const d = daysUntil(c.maintenance?.nextServiceDate); return d !== null && d >= 0 && d <= 30; }).length}</span>
                  </div>
                </div>
              )}

              {/* Filter by type */}
              {assetTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {assetTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setAssetTypeFilter(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        assetTypeFilter === type
                          ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                          : 'border-border/30 text-muted-foreground/60 hover:border-border/60'
                      }`}
                    >{type}</button>
                  ))}
                </div>
              )}

              {!detailsLoaded && manifolds.length > 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl border border-border/30 bg-card/30 animate-pulse" />)}
                </div>
              ) : filteredComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wrench className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No components registered.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          {['Component', 'Type', 'Manifold', 'Section', 'Last Service', 'Next Service', 'Status'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredComponents.map((comp, idx) => {
                          const days = daysUntil(comp.maintenance?.nextServiceDate);
                          const serviceStatus = days === null ? null : days < 0 ? 'overdue' : days <= 30 ? 'due-soon' : 'ok';
                          return (
                            <tr key={`${comp._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-xs">{comp.specifications?.manufacturer ?? '—'} {comp.specifications?.model ?? ''}</p>
                                {comp.specifications?.rating && (
                                  <p className="text-[10px] text-muted-foreground/60">{comp.specifications.rating}</p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted/30 border border-border/30">
                                  {comp.componentType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-medium">{comp.manifoldName ?? '—'}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{comp.position?.section ?? '—'}</td>
                              <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{formatDate(comp.maintenance?.lastServiceDate)}</td>
                              <td className={`px-4 py-3 text-xs font-mono ${nextServiceColor(comp.maintenance?.nextServiceDate)}`}>
                                {nextServiceLabel(comp.maintenance?.nextServiceDate)}
                              </td>
                              <td className="px-4 py-3">
                                {serviceStatus === 'overdue' && (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
                                    <AlertTriangle className="h-3 w-3" />Overdue
                                  </span>
                                )}
                                {serviceStatus === 'due-soon' && (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                    <Clock className="h-3 w-3" />Due Soon
                                  </span>
                                )}
                                {serviceStatus === 'ok' && (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                    <CheckCircle className="h-3 w-3" />OK
                                  </span>
                                )}
                                {serviceStatus === null && <span className="text-[10px] text-muted-foreground/50">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Command Area Map Tab ─────────────────────────────────── */}
          {activeTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <CommandAreaMap manifolds={mapManifolds} />
            </motion.div>
          )}

      </div>
    </MainLayout>
  );
}

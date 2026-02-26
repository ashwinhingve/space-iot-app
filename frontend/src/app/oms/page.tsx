'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
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
  ArrowLeft,
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

interface Alarm {
  alarmId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolved?: boolean;
  // enriched
  manifoldName?: string;
  manifoldId?: string;
  valveId?: string;
  valveNumber?: number;
}

interface Component {
  _id: string;
  componentType: string;
  specifications?: { manufacturer?: string; model?: string };
  position?: { section?: string };
  maintenance?: {
    lastServiceDate?: string;
    nextServiceDate?: string;
    serviceInterval?: number;
    history?: unknown[];
  };
  // enriched
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

function nextServiceColor(d?: string) {
  if (!d) return 'text-muted-foreground';
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'text-red-400';
  if (diff < 30) return 'text-amber-400';
  return 'text-emerald-400';
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

  const { manifolds, valves, components, loading } = useSelector(
    (s: RootState) => s.manifolds
  );

  // Load manifolds then all details
  useEffect(() => {
    dispatch(fetchManifolds({}));
  }, [dispatch]);

  useEffect(() => {
    if (manifolds.length === 0 || detailsLoaded) return;
    Promise.all(manifolds.map((m) => dispatch(fetchManifoldDetail(m._id)))).then(
      () => setDetailsLoaded(true)
    );
  }, [manifolds, detailsLoaded, dispatch]);

  // Derived: flatten all valves
  const allValves = useMemo(
    () => Object.values(valves).flat(),
    [valves]
  );

  // Active alarms enriched with manifold/valve info
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
    return result.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [manifolds, valves]);

  // All components enriched
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

  const activeAlarmCount = allAlarms.filter((a) => !a.acknowledged && !a.resolved).length;
  const activeValveCount = allValves.filter(
    (v) => (v as unknown as { operationalData?: { currentStatus: string } }).operationalData?.currentStatus === 'ON'
  ).length;

  const handleRefresh = () => {
    setDetailsLoaded(false);
    dispatch(fetchManifolds({}));
  };

  // Map manifold data shape
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
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl">

          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-xl border border-purple-500/20">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500">
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
            className="flex flex-wrap gap-2 mb-8"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
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
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* KPI chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Manifolds</p>
                  {loading && manifolds.length === 0 ? (
                    <div className="h-10 w-16 rounded-lg bg-purple-500/10 animate-pulse mt-1" />
                  ) : (
                    <p className="text-4xl font-bold text-purple-400">{manifolds.length}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Active Valves</p>
                  {!detailsLoaded && manifolds.length > 0 ? (
                    <div className="h-10 w-12 rounded-lg bg-emerald-500/10 animate-pulse mt-1" />
                  ) : (
                    <p className="text-4xl font-bold text-emerald-400">{activeValveCount}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Active Alarms</p>
                  {!detailsLoaded && manifolds.length > 0 ? (
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 animate-pulse mt-1" />
                  ) : (
                    <p className="text-4xl font-bold text-red-400">{activeAlarmCount}</p>
                  )}
                </div>
              </div>

              {/* Manifold health cards */}
              {loading && manifolds.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-40 rounded-2xl border border-border/30 bg-card/30 animate-pulse" />
                  ))}
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
                    const alarmCount = mValves.reduce(
                      (sum, v) => sum + ((v as unknown as { alarms?: unknown[] }).alarms?.filter((a) => !(a as Alarm).acknowledged && !(a as Alarm).resolved).length ?? 0),
                      0
                    );
                    return (
                      <div
                        key={m._id}
                        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-3 hover:border-purple-500/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm">{m.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : m.status === 'Fault' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {m.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Valves ON</p>
                            <p className="font-bold text-emerald-400">{onCount} / {mValves.length}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Active Alarms</p>
                            <p className={`font-bold ${alarmCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{alarmCount}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Last Service</p>
                            <p className="font-mono">{formatDate(m.metadata?.lastMaintenanceDate)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2.5">
                            <p className="text-muted-foreground mb-0.5">Next Service</p>
                            <p className={`font-mono ${nextServiceColor(m.metadata?.nextMaintenanceDate)}`}>
                              {formatDate(m.metadata?.nextMaintenanceDate)}
                            </p>
                          </div>
                        </div>

                        {m.installationDetails?.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {m.installationDetails.location}
                          </div>
                        )}

                        <Link href={`/manifolds/${m._id}`}>
                          <Button size="sm" variant="outline" className="w-full mt-1 h-7 text-xs">
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
            <motion.div
              key="alarms"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {!detailsLoaded && manifolds.length > 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl border border-border/30 bg-card/30 animate-pulse" />
                  ))}
                </div>
              ) : allAlarms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 opacity-60 mb-3" />
                  <p className="text-muted-foreground text-sm">No alarms recorded.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Severity</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Manifold</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Valve</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Message</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Time</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allAlarms.map((alarm, idx) => (
                        <tr key={`${alarm.alarmId}-${idx}`} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge(alarm.severity)}`}>
                              {alarm.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium">{alarm.manifoldName ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">V{alarm.valveNumber ?? '—'}</td>
                          <td className="px-4 py-3 text-xs max-w-[240px] truncate">{alarm.message}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            {new Date(alarm.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {alarm.resolved ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400">
                                <CheckCircle className="h-3 w-3" />Resolved
                              </span>
                            ) : alarm.acknowledged ? (
                              <span className="flex items-center gap-1 text-xs text-amber-400">
                                <AlertTriangle className="h-3 w-3" />Acknowledged
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-red-400">
                                <XCircle className="h-3 w-3" />Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {!alarm.acknowledged && !alarm.resolved && alarm.valveId && (
                                <button
                                  onClick={() =>
                                    dispatch(acknowledgeAlarm({ valveId: alarm.valveId!, alarmId: alarm.alarmId }))
                                  }
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                                >
                                  Ack
                                </button>
                              )}
                              {!alarm.resolved && alarm.valveId && (
                                <button
                                  onClick={() =>
                                    dispatch(resolveAlarm({ valveId: alarm.valveId!, alarmId: alarm.alarmId }))
                                  }
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Asset Registry Tab ───────────────────────────────────── */}
          {activeTab === 'assets' && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {!detailsLoaded && manifolds.length > 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl border border-border/30 bg-card/30 animate-pulse" />
                  ))}
                </div>
              ) : allComponents.length === 0 ? (
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
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Component</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Manifold</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Section</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Last Service</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Next Service</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allComponents.map((comp, idx) => (
                        <tr key={`${comp._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-xs">{comp.specifications?.manufacturer ?? '—'} {comp.specifications?.model ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{comp.componentType}</td>
                          <td className="px-4 py-3 text-xs font-medium">{comp.manifoldName ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{comp.position?.section ?? '—'}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {formatDate(comp.maintenance?.lastServiceDate)}
                          </td>
                          <td className={`px-4 py-3 text-xs font-mono ${nextServiceColor(comp.maintenance?.nextServiceDate)}`}>
                            {formatDate(comp.maintenance?.nextServiceDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Command Area Map Tab ─────────────────────────────────── */}
          {activeTab === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <CommandAreaMap manifolds={mapManifolds} />
            </motion.div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { AppDispatch, RootState } from '@/store/store';
import {
  fetchManifolds,
  fetchManifoldDetail,
} from '@/store/slices/manifoldSlice';
import {
  fetchTTNApplications,
  fetchTTNUplinks,
  setSelectedApplication,
  TTNUplink,
} from '@/store/slices/ttnSlice';
import {
  FileText,
  Droplets,
  Zap,
  BarChart3,
  Wifi,
  Download,
  RefreshCw,
  Info,
  Printer,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Filter,
  Shield,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';

// ─── Types ───────────────────────────────────────────────────────────────

type ReportTab = 'pump' | 'electrical' | 'oms' | 'rssi';
type DateRange = '7d' | '30d' | '90d' | 'all';

// ─── Tab config ──────────────────────────────────────────────────────────

const REPORT_TABS: {
  id: ReportTab;
  label: string;
  icon: React.ElementType;
  activeColor: string;
}[] = [
  { id: 'pump',       label: 'Pump Reports',      icon: Droplets, activeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'electrical', label: 'Electrical Reports', icon: Zap,      activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'oms',        label: 'OMS Reports',        icon: BarChart3,activeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'rssi',       label: 'RSSI Reports',       icon: Wifi,     activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

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

function rssiColor(rssi: number) {
  if (rssi >= -90) return 'text-emerald-400';
  if (rssi >= -100) return 'text-amber-400';
  return 'text-red-400';
}

function rssiQuality(rssi: number): { label: string; cls: string } {
  if (rssi >= -90) return { label: 'Good', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (rssi >= -100) return { label: 'Fair', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return { label: 'Poor', cls: 'text-red-400 bg-red-500/10 border-red-500/20' };
}

function exportCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function handlePrint() {
  window.print();
}

function cutoffDate(range: DateRange): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Runtime bar component ────────────────────────────────────────────────

function RuntimeBar({ hours, maxHours }: { hours: number; maxHours: number }) {
  const pct = maxHours > 0 ? Math.min((hours / maxHours) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums w-12 text-right">{hours.toFixed(1)}h</span>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────

function StatChip({ label, value, cls }: { label: string; value: React.ReactNode; cls: string }) {
  return (
    <div className={`px-4 py-2.5 rounded-xl border text-xs ${cls}`}>
      <span className="text-muted-foreground">{label} </span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { canAccessSubpage } = useRole();

  const visibleTabs = REPORT_TABS.filter(t => canAccessSubpage('reports', t.id));
  const [activeTab, setActiveTab] = useState<ReportTab>(() => visibleTabs[0]?.id ?? 'pump');
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [rssiDateRange, setRssiDateRange] = useState<DateRange>('30d');
  const [rssiDeviceFilter, setRssiDeviceFilter] = useState<string>('ALL');

  const { manifolds, valves, components, loading } = useSelector((s: RootState) => s.manifolds);
  const { applications, selectedApplication, uplinks: ttnUplinks, loading: ttnLoading } = useSelector((s: RootState) => s.ttn);

  useEffect(() => {
    dispatch(fetchManifolds({}));
    dispatch(fetchTTNApplications());
  }, [dispatch]);

  useEffect(() => {
    if (manifolds.length === 0 || detailsLoaded) return;
    Promise.all(manifolds.map((m) => dispatch(fetchManifoldDetail(m._id)))).then(
      () => setDetailsLoaded(true)
    );
  }, [manifolds, detailsLoaded, dispatch]);

  useEffect(() => {
    if (applications.length > 0 && !selectedApplication) {
      dispatch(setSelectedApplication(applications[0]));
    }
  }, [applications, selectedApplication, dispatch]);

  useEffect(() => {
    if (activeTab === 'rssi' && selectedApplication) {
      dispatch(fetchTTNUplinks({ applicationId: selectedApplication._id, limit: 200 }));
    }
  }, [activeTab, selectedApplication, dispatch]);

  // ─── Derived data ─────────────────────────────────────────────

  const allValves = useMemo(() => Object.values(valves).flat(), [valves]);

  const allComponents = useMemo(() => {
    const result: Array<{
      manifoldName: string;
      componentType: string;
      section: string;
      lastServiceDate?: string;
      nextServiceDate?: string;
      serviceInterval?: number;
      historyCount: number;
      manufacturer?: string;
      model?: string;
    }> = [];
    for (const manifold of manifolds) {
      const comps = components[manifold._id] ?? [];
      for (const comp of comps as unknown as Array<{
        componentType: string;
        specifications?: { manufacturer?: string; model?: string };
        position?: { section?: string };
        maintenance?: { lastServiceDate?: string; nextServiceDate?: string; serviceInterval?: number; history?: unknown[] };
      }>) {
        result.push({
          manifoldName: manifold.name,
          componentType: comp.componentType,
          section: comp.position?.section ?? '—',
          lastServiceDate: comp.maintenance?.lastServiceDate,
          nextServiceDate: comp.maintenance?.nextServiceDate,
          serviceInterval: comp.maintenance?.serviceInterval,
          historyCount: comp.maintenance?.history?.length ?? 0,
          manufacturer: comp.specifications?.manufacturer,
          model: comp.specifications?.model,
        });
      }
    }
    return result;
  }, [manifolds, components]);

  // RSSI filtering
  const rssiCutoff = useMemo(() => cutoffDate(rssiDateRange), [rssiDateRange]);
  const rssiDevices = useMemo(() => {
    const ids = new Set(ttnUplinks.map((u) => u.deviceId));
    return ['ALL', ...Array.from(ids)];
  }, [ttnUplinks]);

  const filteredUplinks: TTNUplink[] = useMemo(() => ttnUplinks.filter((u) => {
    if (rssiCutoff && new Date(u.receivedAt) < rssiCutoff) return false;
    if (rssiDeviceFilter !== 'ALL' && u.deviceId !== rssiDeviceFilter) return false;
    return true;
  }), [ttnUplinks, rssiCutoff, rssiDeviceFilter]);

  // Valve stats
  const valveOn = allValves.filter((v) => (v as unknown as { operationalData: { currentStatus: string } }).operationalData.currentStatus === 'ON').length;
  const valveOff = allValves.filter((v) => (v as unknown as { operationalData: { currentStatus: string } }).operationalData.currentStatus === 'OFF').length;
  const valveFault = allValves.filter((v) => (v as unknown as { operationalData: { currentStatus: string } }).operationalData.currentStatus === 'FAULT').length;
  const maxRuntime = useMemo(() => Math.max(0, ...allValves.map((v) => ((v as unknown as { operationalData: { totalRuntime: number } }).operationalData.totalRuntime / 3600))), [allValves]);

  // RSSI stats
  const rssiStats = useMemo(() => {
    if (filteredUplinks.length === 0) return null;
    const rssiVals = filteredUplinks.map((u) => u.rssi);
    const avg = rssiVals.reduce((s, v) => s + v, 0) / rssiVals.length;
    const good = rssiVals.filter((v) => v >= -90).length;
    const fair = rssiVals.filter((v) => v >= -100 && v < -90).length;
    const poor = rssiVals.filter((v) => v < -100).length;
    return { avg: avg.toFixed(1), good, fair, poor, total: rssiVals.length };
  }, [filteredUplinks]);

  // OMS stats
  const overdueComponents = allComponents.filter((c) => c.nextServiceDate && new Date(c.nextServiceDate) < new Date()).length;
  const dueSoonComponents = allComponents.filter((c) => {
    if (!c.nextServiceDate) return false;
    const diff = (new Date(c.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 30;
  }).length;

  // ─── Export handlers ──────────────────────────────────────────

  const exportPump = useCallback(() => {
    const headers = ['Manifold', 'Valve#', 'Status', 'Mode', 'Cycles', 'Runtime(hrs)', 'Last Command', 'Action'];
    const rows = allValves.map((v) => {
      const vv = v as unknown as {
        _id: string;
        valveNumber: number;
        operationalData: { currentStatus: string; mode: string; cycleCount: number; totalRuntime: number; lastCommand?: { action: string; timestamp: string } };
      };
      const manifoldId = Object.keys(valves).find((mid) =>
        (valves[mid] as unknown as { _id: string }[]).some((x) => x._id === vv._id)
      );
      const manifoldName = manifolds.find((m) => m._id === manifoldId)?.name ?? '—';
      return [
        manifoldName,
        vv.valveNumber,
        vv.operationalData.currentStatus,
        vv.operationalData.mode,
        vv.operationalData.cycleCount,
        (vv.operationalData.totalRuntime / 3600).toFixed(2),
        vv.operationalData.lastCommand ? new Date(vv.operationalData.lastCommand.timestamp).toLocaleString() : '—',
        vv.operationalData.lastCommand?.action ?? '—',
      ];
    });
    exportCSV('pump-report', headers, rows);
  }, [allValves, valves, manifolds]);

  const exportOMS = useCallback(() => {
    const headers = ['Component', 'Type', 'Manifold', 'Section', 'Last Service', 'Next Service', 'Interval (days)', 'History Count'];
    const rows = allComponents.map((c) => [
      `${c.manufacturer ?? ''} ${c.model ?? ''}`.trim() || '—',
      c.componentType,
      c.manifoldName,
      c.section,
      formatDate(c.lastServiceDate),
      formatDate(c.nextServiceDate),
      c.serviceInterval ?? '—',
      c.historyCount,
    ]);
    exportCSV('oms-report', headers, rows);
  }, [allComponents]);

  const exportRSSI = useCallback(() => {
    const headers = ['Timestamp', 'Device ID', 'Gateway', 'RSSI (dBm)', 'SNR (dB)', 'SF', 'Frequency (MHz)', 'Signal Quality'];
    const rows = filteredUplinks.map((u) => [
      new Date(u.receivedAt).toLocaleString(),
      u.deviceId,
      u.gatewayId,
      u.rssi,
      u.snr,
      u.spreadingFactor,
      (u.frequency / 1e6).toFixed(3),
      rssiQuality(u.rssi).label,
    ]);
    exportCSV('rssi-report', headers, rows);
  }, [filteredUplinks]);

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
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-cyan-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-cyan-500/10 rounded-xl border border-brand-500/20">
                  <FileText className="h-6 w-6 text-brand-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-cyan-400 to-brand-500">
                  Reports
                </h1>
                <p className="text-muted-foreground text-sm ml-0.5">
                  Pump, Electrical, OMS & RSSI reports — real device data
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border/50 rounded-xl text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-wrap gap-2"
          >
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id ? tab.activeColor : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* ─── No access ───────────────────────────────────────────── */}
          {visibleTabs.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-secondary/20 p-12 text-center">
              <Shield className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-semibold text-foreground">Access Restricted</p>
                <p className="mt-1 text-sm text-muted-foreground">You don&apos;t have access to any report sections. Contact your administrator.</p>
              </div>
            </div>
          )}

          {/* ─── Pump Reports ────────────────────────────────────────── */}
          {activeTab === 'pump' && (
            <motion.div key="pump" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

              {/* Summary chips */}
              <div className="flex flex-wrap gap-3">
                <StatChip label="Total Valves" value={allValves.length} cls="border-border/50 bg-card/60" />
                <StatChip label="ON" value={valveOn} cls="border-emerald-500/20 bg-emerald-500/10 text-emerald-400" />
                <StatChip label="OFF" value={valveOff} cls="border-slate-500/20 bg-slate-500/10 text-slate-400" />
                <StatChip label="FAULT" value={valveFault} cls="border-red-500/20 bg-red-500/10 text-red-400" />
                {allValves.length > 0 && (
                  <StatChip
                    label="Uptime"
                    value={`${Math.round((valveOn / allValves.length) * 100)}%`}
                    cls="border-blue-500/20 bg-blue-500/10 text-blue-400"
                  />
                )}
                <div className="ml-auto">
                  <div className="flex gap-2">
                    {loading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin self-center" />}
                    <button
                      onClick={exportPump}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Status distribution bar */}
              {allValves.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Valve Status Distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {valveOn > 0 && (
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${(valveOn / allValves.length) * 100}%` }}
                        title={`ON: ${valveOn}`}
                      />
                    )}
                    {valveOff > 0 && (
                      <div
                        className="bg-slate-500 transition-all"
                        style={{ width: `${(valveOff / allValves.length) * 100}%` }}
                        title={`OFF: ${valveOff}`}
                      />
                    )}
                    {valveFault > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(valveFault / allValves.length) * 100}%` }}
                        title={`FAULT: ${valveFault}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />ON ({valveOn})</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-500" />OFF ({valveOff})</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />FAULT ({valveFault})</span>
                  </div>
                </div>
              )}

              {allValves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Droplets className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No valve data. Load manifold details first.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {['Manifold', 'Valve#', 'Status', 'Mode', 'Cycles', 'Runtime', 'Last Command', 'Action'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allValves.map((v, idx) => {
                        const vv = v as unknown as {
                          _id: string;
                          valveNumber: number;
                          operationalData: { currentStatus: string; mode: string; cycleCount: number; totalRuntime: number; lastCommand?: { action: string; timestamp: string } };
                        };
                        const manifoldId = Object.keys(valves).find((mid) =>
                          (valves[mid] as unknown as { _id: string }[]).some((x) => x._id === vv._id)
                        );
                        const manifoldName = manifolds.find((m) => m._id === manifoldId)?.name ?? '—';
                        const statusColor =
                          vv.operationalData.currentStatus === 'ON' ? 'text-emerald-400' :
                          vv.operationalData.currentStatus === 'FAULT' ? 'text-red-400' : 'text-slate-400';
                        const runtimeHrs = vv.operationalData.totalRuntime / 3600;
                        return (
                          <tr key={`${vv._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 text-xs font-medium">{manifoldName}</td>
                            <td className="px-4 py-3 text-xs font-mono">V{vv.valveNumber}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                vv.operationalData.currentStatus === 'ON' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                vv.operationalData.currentStatus === 'FAULT' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                'bg-slate-500/10 border-slate-500/20 text-slate-400'
                              } ${statusColor}`}>{vv.operationalData.currentStatus}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{vv.operationalData.mode}</td>
                            <td className="px-4 py-3 text-xs font-mono tabular-nums">{vv.operationalData.cycleCount}</td>
                            <td className="px-4 py-3">
                              <RuntimeBar hours={runtimeHrs} maxHours={maxRuntime} />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                              {vv.operationalData.lastCommand ? new Date(vv.operationalData.lastCommand.timestamp).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{vv.operationalData.lastCommand?.action ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Electrical Reports ──────────────────────────────────── */}
          {activeTab === 'electrical' && (
            <motion.div key="electrical" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Valve Specifications</h2>
              </div>

              {allValves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Zap className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No valve data available.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {['Manifold', 'Valve#', 'Voltage', 'Type', 'Size', 'Manufacturer', 'Model'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allValves.map((v, idx) => {
                        const vv = v as unknown as {
                          _id: string;
                          valveNumber: number;
                          specifications?: { voltage?: string; type?: string; size?: string; manufacturer?: string; model?: string };
                        };
                        const manifoldId = Object.keys(valves).find((mid) =>
                          (valves[mid] as unknown as { _id: string }[]).some((x) => x._id === vv._id)
                        );
                        const manifoldName = manifolds.find((m) => m._id === manifoldId)?.name ?? '—';
                        return (
                          <tr key={`${vv._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 text-xs font-medium">{manifoldName}</td>
                            <td className="px-4 py-3 text-xs font-mono">V{vv.valveNumber}</td>
                            <td className="px-4 py-3 text-xs">
                              {vv.specifications?.voltage
                                ? <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">{vv.specifications.voltage}</span>
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs">{vv.specifications?.type ?? '—'}</td>
                            <td className="px-4 py-3 text-xs">{vv.specifications?.size ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{vv.specifications?.manufacturer ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{vv.specifications?.model ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Manifold hydraulic specs */}
              <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                <div className="px-4 py-3 border-b border-border/50">
                  <h3 className="text-sm font-semibold">Manifold Hydraulic Specifications</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      {['Manifold', 'Inlet Size', 'Outlet Size', 'Valve Count', 'Max Pressure (bar)', 'Max Flow (LPS)', 'Manufacturer'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {manifolds.map((m) => (
                      <tr key={m._id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium">{m.name}</td>
                        <td className="px-4 py-3 text-xs font-mono">{m.specifications?.inletSize ?? '—'}</td>
                        <td className="px-4 py-3 text-xs font-mono">{m.specifications?.outletSize ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{m.specifications?.valveCount ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{m.specifications?.maxPressure ?? '—'}</td>
                        <td className="px-4 py-3 text-xs">{m.specifications?.maxFlowRate ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{m.specifications?.manufacturer ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400/80">
                <Info className="h-4 w-4 shrink-0" />
                No energy meter API is connected. Power consumption data is not available.
              </div>
            </motion.div>
          )}

          {/* ─── OMS Reports ─────────────────────────────────────────── */}
          {activeTab === 'oms' && (
            <motion.div key="oms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

              {/* Summary */}
              <div className="flex flex-wrap gap-3 items-center">
                <StatChip label="Components" value={allComponents.length} cls="border-border/50 bg-card/60" />
                {overdueComponents > 0 && (
                  <StatChip label="Overdue" value={overdueComponents} cls="border-red-500/20 bg-red-500/10 text-red-400" />
                )}
                {dueSoonComponents > 0 && (
                  <StatChip label="Due Soon" value={dueSoonComponents} cls="border-amber-500/20 bg-amber-500/10 text-amber-400" />
                )}
                <StatChip
                  label="On Schedule"
                  value={allComponents.length - overdueComponents - dueSoonComponents}
                  cls="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                />
                <div className="ml-auto">
                  <button
                    onClick={exportOMS}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Overdue alert banner */}
              {overdueComponents > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/25 bg-red-500/5">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">
                    <span className="font-bold">{overdueComponents}</span> component{overdueComponents !== 1 ? 's are' : ' is'} past their service date and require immediate attention.
                  </p>
                </div>
              )}

              {allComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No component data available.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {['Component', 'Type', 'Manifold', 'Section', 'Last Service', 'Next Service', 'Interval', 'History', 'Status'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allComponents.map((comp, idx) => {
                        const isOverdue = comp.nextServiceDate && new Date(comp.nextServiceDate) < new Date();
                        const isDueSoon = !isOverdue && comp.nextServiceDate && (new Date(comp.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 30;
                        return (
                          <tr key={idx} className={`hover:bg-muted/10 transition-colors ${isOverdue ? 'bg-red-500/3' : ''}`}>
                            <td className="px-4 py-3 text-xs font-medium">
                              {[comp.manufacturer, comp.model].filter(Boolean).join(' ') || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted/30 border border-border/30">{comp.componentType}</span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium">{comp.manifoldName}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{comp.section}</td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{formatDate(comp.lastServiceDate)}</td>
                            <td className={`px-4 py-3 text-xs font-mono ${nextServiceColor(comp.nextServiceDate)}`}>{formatDate(comp.nextServiceDate)}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{comp.serviceInterval ? `${comp.serviceInterval}d` : '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{comp.historyCount}</td>
                            <td className="px-4 py-3">
                              {isOverdue ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400"><AlertTriangle className="h-3 w-3" />Overdue</span>
                              ) : isDueSoon ? (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400"><TrendingUp className="h-3 w-3" />Due Soon</span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400"><CheckCircle className="h-3 w-3" />OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── RSSI Reports ────────────────────────────────────────── */}
          {activeTab === 'rssi' && (
            <motion.div key="rssi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground">Range:</span>
                </div>
                {([
                  { key: '7d', label: '7 days' },
                  { key: '30d', label: '30 days' },
                  { key: '90d', label: '90 days' },
                  { key: 'all', label: 'All time' },
                ] as { key: DateRange; label: string }[]).map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRssiDateRange(r.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      rssiDateRange === r.key
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'border-border/30 text-muted-foreground/60 hover:border-border/60'
                    }`}
                  >{r.label}</button>
                ))}

                {rssiDevices.length > 2 && (
                  <>
                    <div className="h-4 w-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">Device:</span>
                    <select
                      value={rssiDeviceFilter}
                      onChange={(e) => setRssiDeviceFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-card/80 border border-border/50 rounded-lg outline-none appearance-none cursor-pointer dark:[color-scheme:dark]"
                    >
                      {rssiDevices.map((id) => (
                        <option key={id} value={id}>{id === 'ALL' ? 'All Devices' : id}</option>
                      ))}
                    </select>
                  </>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {ttnLoading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
                  {applications.length > 1 && (
                    <select
                      value={selectedApplication?._id ?? ''}
                      onChange={(e) => {
                        const app = applications.find((a) => a._id === e.target.value);
                        if (app) dispatch(setSelectedApplication(app));
                      }}
                      className="px-3 py-1.5 text-xs bg-card/80 border border-border/50 rounded-xl outline-none appearance-none cursor-pointer dark:[color-scheme:dark]"
                    >
                      {applications.map((a) => (
                        <option key={a._id} value={a._id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={exportRSSI}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* RSSI summary stats */}
              {rssiStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border/50 bg-card/60 p-4">
                    <p className="text-xs text-muted-foreground mb-1">Avg RSSI</p>
                    <p className={`text-2xl font-bold font-mono ${rssiColor(parseFloat(rssiStats.avg))}`}>{rssiStats.avg} <span className="text-sm font-normal">dBm</span></p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs text-emerald-400/80 mb-1">Good (≥ -90 dBm)</p>
                    <p className="text-2xl font-bold text-emerald-400">{rssiStats.good}</p>
                    <p className="text-[10px] text-emerald-400/60">{Math.round((rssiStats.good / rssiStats.total) * 100)}% of uplinks</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-xs text-amber-400/80 mb-1">Fair (-100 to -90)</p>
                    <p className="text-2xl font-bold text-amber-400">{rssiStats.fair}</p>
                    <p className="text-[10px] text-amber-400/60">{Math.round((rssiStats.fair / rssiStats.total) * 100)}% of uplinks</p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-xs text-red-400/80 mb-1">Poor (&lt; -100 dBm)</p>
                    <p className="text-2xl font-bold text-red-400">{rssiStats.poor}</p>
                    <p className="text-[10px] text-red-400/60">{Math.round((rssiStats.poor / rssiStats.total) * 100)}% of uplinks</p>
                  </div>
                </div>
              )}

              {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wifi className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm mb-3">No TTN applications found.</p>
                  <Link href="/devices">
                    <Button size="sm" variant="outline">Go to Devices</Button>
                  </Link>
                </div>
              ) : filteredUplinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wifi className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No uplinks in the selected time range.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                  <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{filteredUplinks.length} uplinks</span>
                    <span className="text-[10px] text-muted-foreground/60">Sorted by newest first</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {['Timestamp', 'Device ID', 'Gateway', 'RSSI (dBm)', 'SNR (dB)', 'SF', 'Freq (MHz)', 'Quality'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredUplinks.map((u, idx) => {
                        const quality = rssiQuality(u.rssi);
                        return (
                          <tr key={`${u._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{new Date(u.receivedAt).toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs font-mono">{u.deviceId}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{u.gatewayId}</td>
                            <td className={`px-4 py-3 text-xs font-bold font-mono ${rssiColor(u.rssi)}`}>{u.rssi}</td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{u.snr.toFixed(1)}</td>
                            <td className="px-4 py-3 text-xs font-mono">{u.spreadingFactor}</td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{(u.frequency / 1e6).toFixed(3)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${quality.cls}`}>
                                {quality.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

      </div>
    </MainLayout>
  );
}

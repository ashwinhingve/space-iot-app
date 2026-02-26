'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@/store/slices/manifoldSlice';
import {
  fetchTTNApplications,
  fetchTTNUplinks,
  setSelectedApplication,
  TTNUplink,
} from '@/store/slices/ttnSlice';
import {
  FileText,
  ArrowLeft,
  Droplets,
  Zap,
  BarChart3,
  Wifi,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────

type ReportTab = 'pump' | 'electrical' | 'oms' | 'rssi';

// ─── Tab config ──────────────────────────────────────────────────────────

const REPORT_TABS: {
  id: ReportTab;
  label: string;
  icon: React.ElementType;
  activeColor: string;
}[] = [
  { id: 'pump',       label: 'Pump Reports',       icon: Droplets, activeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'electrical', label: 'Electrical Reports',  icon: Zap,      activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'oms',        label: 'OMS Reports',         icon: BarChart3,activeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'rssi',       label: 'RSSI Reports',        icon: Wifi,     activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
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

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<ReportTab>('pump');
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  const { manifolds, valves, components, loading } = useSelector((s: RootState) => s.manifolds);
  const { applications, selectedApplication, uplinks: ttnUplinks, loading: ttnLoading } = useSelector((s: RootState) => s.ttn);

  // Load manifolds + TTN apps on mount
  useEffect(() => {
    dispatch(fetchManifolds({}));
    dispatch(fetchTTNApplications());
  }, [dispatch]);

  // Load all manifold details once
  useEffect(() => {
    if (manifolds.length === 0 || detailsLoaded) return;
    Promise.all(manifolds.map((m) => dispatch(fetchManifoldDetail(m._id)))).then(
      () => setDetailsLoaded(true)
    );
  }, [manifolds, detailsLoaded, dispatch]);

  // Auto-select first TTN app
  useEffect(() => {
    if (applications.length > 0 && !selectedApplication) {
      dispatch(setSelectedApplication(applications[0]));
    }
  }, [applications, selectedApplication, dispatch]);

  // Fetch uplinks when RSSI tab is active
  useEffect(() => {
    if (activeTab === 'rssi' && selectedApplication) {
      dispatch(fetchTTNUplinks({ applicationId: selectedApplication._id, limit: 100 }));
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

  // Uplinks are stored as flat array in state, replaced on each fetch
  const activeUplinks: TTNUplink[] = ttnUplinks;

  // ─── Export handlers ──────────────────────────────────────────

  const exportPump = useCallback(() => {
    const headers = ['Manifold', 'Valve#', 'Status', 'Mode', 'Cycles', 'Runtime(hrs)', 'Last Command', 'Action'];
    const rows = allValves.map((v) => {
      const vv = v as unknown as {
        valveNumber: number;
        operationalData: { currentStatus: string; mode: string; cycleCount: number; totalRuntime: number; lastCommand?: { action: string; timestamp: string } };
        _id: string;
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
    const headers = ['Timestamp', 'Device ID', 'Gateway', 'RSSI (dBm)', 'SNR (dB)', 'SF', 'Frequency (MHz)'];
    const rows = activeUplinks.map((u) => [
      new Date(u.receivedAt).toLocaleString(),
      u.deviceId,
      u.gatewayId,
      u.rssi,
      u.snr,
      u.spreadingFactor,
      (u.frequency / 1e6).toFixed(3),
    ]);
    exportCSV('rssi-report', headers, rows);
  }, [activeUplinks]);

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
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
                  <FileText className="h-6 w-6 text-cyan-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500">
                Reports
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Pump, Electrical, OMS & RSSI reports — real device data
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id
                    ? tab.activeColor
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* ─── Pump Reports ────────────────────────────────────────── */}
          {activeTab === 'pump' && (
            <motion.div key="pump" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Valve Operations</h2>
                <div className="flex gap-2">
                  {loading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
                  <button
                    onClick={exportPump}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Summary chips */}
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-xl border border-border/50 bg-card/60 text-xs">
                  <span className="text-muted-foreground">Total Valves </span>
                  <span className="font-bold">{allValves.length}</span>
                </div>
                <div className="px-4 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400">
                  ON: <span className="font-bold">
                    {allValves.filter((v) => (v as unknown as { operationalData: { currentStatus: string } }).operationalData.currentStatus === 'ON').length}
                  </span>
                </div>
                <div className="px-4 py-2 rounded-xl border border-slate-500/20 bg-slate-500/10 text-xs text-slate-400">
                  OFF: <span className="font-bold">
                    {allValves.filter((v) => (v as unknown as { operationalData: { currentStatus: string } }).operationalData.currentStatus === 'OFF').length}
                  </span>
                </div>
                <div className="px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
                  FAULT: <span className="font-bold">
                    {allValves.filter((v) => (v as unknown as { operationalData: { currentStatus: string } }).operationalData.currentStatus === 'FAULT').length}
                  </span>
                </div>
              </div>

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
                        {['Manifold', 'Valve#', 'Status', 'Mode', 'Cycles', 'Runtime (hrs)', 'Last Command', 'Action'].map((h) => (
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
                          vv.operationalData.currentStatus === 'ON' ? 'text-emerald-400'
                          : vv.operationalData.currentStatus === 'FAULT' ? 'text-red-400'
                          : 'text-slate-400';
                        return (
                          <tr key={`${vv._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3 text-xs font-medium">{manifoldName}</td>
                            <td className="px-4 py-3 text-xs font-mono">V{vv.valveNumber}</td>
                            <td className={`px-4 py-3 text-xs font-bold ${statusColor}`}>{vv.operationalData.currentStatus}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{vv.operationalData.mode}</td>
                            <td className="px-4 py-3 text-xs font-mono">{vv.operationalData.cycleCount}</td>
                            <td className="px-4 py-3 text-xs font-mono">{(vv.operationalData.totalRuntime / 3600).toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                              {vv.operationalData.lastCommand ? new Date(vv.operationalData.lastCommand.timestamp).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs">{vv.operationalData.lastCommand?.action ?? '—'}</td>
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
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Valve Specifications</h2>
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
                            <td className="px-4 py-3 text-xs text-amber-400">{vv.specifications?.voltage ?? '—'}</td>
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

              <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                <div className="px-4 py-3 border-b border-border/50">
                  <h3 className="text-sm font-semibold">Manifold Hydraulic Specs</h3>
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
            <motion.div key="oms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Maintenance Records</h2>
                <button
                  onClick={exportOMS}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>

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
                        {['Component', 'Type', 'Manifold', 'Section', 'Last Service', 'Next Service', 'Interval (days)', 'History'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allComponents.map((comp, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium">
                            {[comp.manufacturer, comp.model].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{comp.componentType}</td>
                          <td className="px-4 py-3 text-xs font-medium">{comp.manifoldName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{comp.section}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{formatDate(comp.lastServiceDate)}</td>
                          <td className={`px-4 py-3 text-xs font-mono ${nextServiceColor(comp.nextServiceDate)}`}>{formatDate(comp.nextServiceDate)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{comp.serviceInterval ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{comp.historyCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── RSSI Reports ────────────────────────────────────────── */}
          {activeTab === 'rssi' && (
            <motion.div key="rssi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">RSSI / Signal Reports</h2>
                  {ttnLoading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
                </div>
                <div className="flex gap-2 items-center">
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

              {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wifi className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm mb-3">No TTN applications found.</p>
                  <Link href="/devices">
                    <Button size="sm" variant="outline">Go to Devices</Button>
                  </Link>
                </div>
              ) : activeUplinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Wifi className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-muted-foreground text-sm">No uplinks received yet for this application.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        {['Timestamp', 'Device ID', 'Gateway', 'RSSI (dBm)', 'SNR (dB)', 'SF', 'Freq (MHz)'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {activeUplinks.map((u, idx) => (
                        <tr key={`${u._id}-${idx}`} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{new Date(u.receivedAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs font-mono">{u.deviceId}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{u.gatewayId}</td>
                          <td className={`px-4 py-3 text-xs font-bold font-mono ${rssiColor(u.rssi)}`}>{u.rssi}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{u.snr.toFixed(1)}</td>
                          <td className="px-4 py-3 text-xs font-mono">{u.spreadingFactor}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{(u.frequency / 1e6).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}

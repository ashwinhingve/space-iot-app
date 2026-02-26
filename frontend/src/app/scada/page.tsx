'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  sendValveCommand,
  updateValveMode,
  updateValveStatus,
  updateDeviceSensorData,
} from '@/store/slices/manifoldSlice';
import { createAuthenticatedSocket } from '@/lib/socket';
import {
  Monitor,
  ArrowLeft,
  Zap,
  Gauge,
  Battery,
  Signal,
  ChevronRight,
  Power,
  Server,
  Activity,
  Loader2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

type ScadaTab = 'scada' | 'sld';

interface Valve {
  _id: string;
  valveNumber: number;
  operationalData: {
    currentStatus: 'ON' | 'OFF' | 'FAULT';
    mode: 'AUTO' | 'MANUAL';
  };
}

// ─── SLD Diagram ──────────────────────────────────────────────────────────

function SLDDiagram({ valves }: { valves: Valve[] }) {
  if (valves.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Select a manifold to view its electrical diagram.
      </div>
    );
  }

  const colWidth = 120;
  const svgWidth = Math.max(800, 60 + valves.length * colWidth + 60);
  const svgHeight = 480;

  const getLineColor = (status: 'ON' | 'OFF' | 'FAULT') => {
    if (status === 'ON') return '#10b981';
    if (status === 'FAULT') return '#ef4444';
    return '#475569';
  };
  const isDashed = (status: 'ON' | 'OFF' | 'FAULT') => status === 'OFF';

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 bg-slate-950">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ minWidth: Math.max(640, svgWidth) }}
        aria-label="Single Line Diagram"
      >
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="#0f172a" />

        {/* Grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={i} x1={0} y1={i * 48} x2={svgWidth} y2={i * 48} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
        ))}

        {/* Mains input (top) */}
        <rect x={svgWidth / 2 - 50} y={20} width={100} height={28} rx={4} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
        <text x={svgWidth / 2} y={38} textAnchor="middle" fill="#93c5fd" fontSize={11} fontWeight="bold">MAINS 230V</text>

        {/* Line from mains down to isolator */}
        <line x1={svgWidth / 2} y1={48} x2={svgWidth / 2} y2={90} stroke="#3b82f6" strokeWidth={2} />

        {/* Isolator */}
        <rect x={svgWidth / 2 - 30} y={90} width={60} height={22} rx={3} fill="#1a2a3a" stroke="#64748b" strokeWidth={1} />
        <text x={svgWidth / 2} y={105} textAnchor="middle" fill="#94a3b8" fontSize={9}>ISOLATOR</text>

        {/* Line to main DB */}
        <line x1={svgWidth / 2} y1={112} x2={svgWidth / 2} y2={140} stroke="#3b82f6" strokeWidth={2} />

        {/* Main DB */}
        <rect x={svgWidth / 2 - 60} y={140} width={120} height={28} rx={4} fill="#1a2030" stroke="#6366f1" strokeWidth={1.5} />
        <text x={svgWidth / 2} y={158} textAnchor="middle" fill="#a5b4fc" fontSize={11} fontWeight="bold">MAIN DB</text>

        {/* Horizontal bus bar */}
        {valves.length > 0 && (
          <line
            x1={60 + colWidth / 2}
            y1={168}
            x2={60 + (valves.length - 1) * colWidth + colWidth / 2}
            y2={168}
            stroke="#475569"
            strokeWidth={3}
          />
        )}

        {/* Per-valve columns */}
        {valves.map((valve, i) => {
          const cx = 60 + i * colWidth + colWidth / 2;
          const color = getLineColor(valve.operationalData.currentStatus);
          const dashed = isDashed(valve.operationalData.currentStatus);
          const strokeDash = dashed ? '6 4' : undefined;

          return (
            <g key={valve._id}>
              {/* Bus tap line */}
              <line x1={cx} y1={168} x2={cx} y2={200} stroke={color} strokeWidth={2} strokeDasharray={strokeDash} />

              {/* MCB rectangle */}
              <rect x={cx - 18} y={200} width={36} height={22} rx={3} fill="#1e293b" stroke={color} strokeWidth={1.5} />
              <text x={cx} y={214} textAnchor="middle" fill={color} fontSize={8} fontWeight="bold">MCB</text>

              {/* Line to valve */}
              <line x1={cx} y1={222} x2={cx} y2={268} stroke={color} strokeWidth={2} strokeDasharray={strokeDash} />

              {/* Valve circle */}
              <circle cx={cx} cy={282} r={18} fill="#0f172a" stroke={color} strokeWidth={2} />
              {valve.operationalData.currentStatus === 'ON' && (
                <>
                  <line x1={cx - 12} y1={282} x2={cx + 12} y2={282} stroke={color} strokeWidth={2} />
                  <line x1={cx} y1={270} x2={cx - 10} y2={294} stroke={color} strokeWidth={1.5} />
                  <line x1={cx} y1={270} x2={cx + 10} y2={294} stroke={color} strokeWidth={1.5} />
                </>
              )}
              {valve.operationalData.currentStatus === 'FAULT' && (
                <>
                  <line x1={cx - 10} y1={272} x2={cx + 10} y2={292} stroke={color} strokeWidth={2.5} />
                  <line x1={cx + 10} y1={272} x2={cx - 10} y2={292} stroke={color} strokeWidth={2.5} />
                </>
              )}
              {valve.operationalData.currentStatus === 'OFF' && (
                <line x1={cx - 12} y1={282} x2={cx + 12} y2={282} stroke={color} strokeWidth={2} strokeDasharray="4 3" />
              )}

              {/* Zone terminal label */}
              <line x1={cx} y1={300} x2={cx} y2={340} stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? '4 3' : undefined} />
              <rect x={cx - 22} y={340} width={44} height={20} rx={3} fill="#0f172a" stroke={color} strokeWidth={1} />
              <text x={cx} y={354} textAnchor="middle" fill={color} fontSize={9} fontWeight="bold">
                V{valve.valveNumber}
              </text>

              {/* Status label */}
              <text x={cx} y={380} textAnchor="middle" fill={color} fontSize={8}>
                {valve.operationalData.currentStatus}
              </text>
              <text x={cx} y={393} textAnchor="middle" fill="#64748b" fontSize={7}>
                {valve.operationalData.mode}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        {[
          { color: '#10b981', label: 'ON', x: 20, dashed: false },
          { color: '#475569', label: 'OFF', x: 70, dashed: true },
          { color: '#ef4444', label: 'FAULT', x: 120, dashed: false },
        ].map(({ color, label, x, dashed }) => (
          <g key={label}>
            <line x1={x} y1={svgHeight - 20} x2={x + 20} y2={svgHeight - 20} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} />
            <text x={x + 24} y={svgHeight - 16} fill={color} fontSize={9}>{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Sensor Chip ──────────────────────────────────────────────────────────

function SensorChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${color} text-sm transition-opacity ${value === null ? 'opacity-50' : ''}`}>
      {icon}
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="font-bold tabular-nums">{value ?? '—'}</span>
    </div>
  );
}

// ─── Valve Control Card ───────────────────────────────────────────────────

type PendingAction = 'ON' | 'OFF' | 'PULSE' | 'MODE' | null;

function ValveControlCard({
  valve,
  onCommand,
  onModeToggle,
}: {
  valve: Valve;
  onCommand: (action: 'ON' | 'OFF' | 'PULSE') => Promise<unknown>;
  onModeToggle: () => Promise<unknown>;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const status = valve.operationalData.currentStatus;
  const mode = valve.operationalData.mode;

  const handleCommand = useCallback(async (action: 'ON' | 'OFF' | 'PULSE') => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      await onCommand(action);
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, onCommand]);

  const handleModeToggle = useCallback(async () => {
    if (pendingAction) return;
    setPendingAction('MODE');
    try {
      await onModeToggle();
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, onModeToggle]);

  const statusClass =
    status === 'ON'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : status === 'FAULT'
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  const cardClass =
    status === 'FAULT'
      ? 'rounded-xl border border-red-500/40 bg-red-500/5 backdrop-blur-sm p-4 space-y-3 shadow-[0_0_14px_rgba(239,68,68,0.12)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300'
      : 'rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3 hover:border-border/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300';

  const ACTIONS = [
    { action: 'ON' as const, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25' },
    { action: 'OFF' as const, cls: 'bg-slate-500/15 text-slate-400 border-slate-500/25 hover:bg-slate-500/25' },
    { action: 'PULSE' as const, cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/25' },
  ];

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Power className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Valve {valve.valveNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
            {status}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
            mode === 'AUTO'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {mode}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {ACTIONS.map(({ action, cls }) => (
          <button
            key={action}
            onClick={() => handleCommand(action)}
            disabled={pendingAction !== null}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
          >
            {pendingAction === action ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : action}
          </button>
        ))}
      </div>

      <button
        onClick={handleModeToggle}
        disabled={pendingAction !== null}
        className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-muted/30 text-muted-foreground border border-border/40 hover:bg-muted/50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pendingAction === 'MODE' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : `Switch to ${mode === 'AUTO' ? 'MANUAL' : 'AUTO'}`}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ScadaPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<ScadaTab>('scada');
  const [selectedManifoldId, setSelectedManifoldId] = useState<string | null>(null);

  const { manifolds, valves, sensorData, loading } = useSelector((s: RootState) => s.manifolds);

  // Load manifolds if not cached
  useEffect(() => {
    if (manifolds.length === 0 && !loading) {
      dispatch(fetchManifolds({}));
    }
  }, [dispatch, manifolds.length, loading]);

  // Auto-select first manifold
  useEffect(() => {
    if (manifolds.length > 0 && !selectedManifoldId) {
      const firstId = manifolds[0]._id;
      setSelectedManifoldId(firstId);
      dispatch(fetchManifoldDetail(firstId));
    }
  }, [manifolds, selectedManifoldId, dispatch]);

  // Load detail when selection changes
  useEffect(() => {
    if (selectedManifoldId) {
      dispatch(fetchManifoldDetail(selectedManifoldId));
    }
  }, [selectedManifoldId, dispatch]);

  // Socket: live valve + sensor updates
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    socket.on('manifoldStatus', (d: unknown) => dispatch(updateValveStatus(d)));
    socket.on('deviceTelemetry', (d: unknown) => dispatch(updateDeviceSensorData(d as Parameters<typeof updateDeviceSensorData>[0])));
    return () => { socket.disconnect(); };
  }, [dispatch]);

  // Derived
  const selectedManifold = useMemo(
    () => manifolds.find((m) => m._id === selectedManifoldId) ?? null,
    [manifolds, selectedManifoldId]
  );

  const manifoldValves: Valve[] = selectedManifoldId ? (valves[selectedManifoldId] ?? []) : [];

  const deviceId = selectedManifold?.esp32DeviceId
    ? typeof selectedManifold.esp32DeviceId === 'string'
      ? selectedManifold.esp32DeviceId
      : (selectedManifold.esp32DeviceId as { _id: string })._id
    : null;

  const telemetry = deviceId ? (sensorData[deviceId] ?? null) : null;

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
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                  <Monitor className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                  Pump House SCADA
                </h1>
                <p className="text-muted-foreground text-sm">Real-time valve monitoring & control</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {manifolds.length > 0 && (
                <select
                  value={selectedManifoldId ?? ''}
                  onChange={(e) => setSelectedManifoldId(e.target.value || null)}
                  className="px-3 py-2 text-sm bg-card/80 border border-border/50 rounded-xl focus:border-blue-500/40 outline-none transition-colors appearance-none cursor-pointer dark:[color-scheme:dark]"
                >
                  {manifolds.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              )}
              {selectedManifold && (
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  selectedManifold.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {selectedManifold.status}
                </span>
              )}
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            {[
              { id: 'scada' as ScadaTab, label: 'SCADA Control', icon: Activity },
              { id: 'sld' as ScadaTab, label: 'Single Line Diagram', icon: Zap },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border-transparent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* SCADA Tab */}
          {activeTab === 'scada' && (
            <motion.div
              key="scada"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Sensor row */}
              <div className="flex flex-wrap gap-3 mb-6">
                <SensorChip
                  icon={<Gauge className="h-4 w-4" />}
                  label="PT1"
                  value={telemetry?.pt1 != null ? `${telemetry.pt1.toFixed(1)} PSI` : null}
                  color="bg-blue-500/10 border-blue-500/20 text-blue-400"
                />
                <SensorChip
                  icon={<Gauge className="h-4 w-4" />}
                  label="PT2"
                  value={telemetry?.pt2 != null ? `${telemetry.pt2.toFixed(1)} PSI` : null}
                  color="bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                />
                <SensorChip
                  icon={<Battery className="h-4 w-4" />}
                  label="Battery"
                  value={telemetry?.battery != null ? `${telemetry.battery.toFixed(0)}%` : null}
                  color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                />
                <SensorChip
                  icon={<Signal className="h-4 w-4" />}
                  label="RSSI"
                  value={telemetry?.rssi != null ? `${telemetry.rssi} dBm` : null}
                  color="bg-purple-500/10 border-purple-500/20 text-purple-400"
                />
              </div>

              {/* Valve grid */}
              {loading && manifoldValves.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-36 rounded-xl border border-border/30 bg-card/30 animate-pulse" />
                  ))}
                </div>
              ) : manifoldValves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Server className="h-8 w-8 text-muted-foreground mb-3 opacity-40" />
                  <p className="text-muted-foreground text-sm">
                    {manifolds.length === 0
                      ? 'No manifolds found. Add a manifold from the dashboard.'
                      : 'No valves configured for this manifold.'}
                  </p>
                  {manifolds.length === 0 && (
                    <Link href="/dashboard">
                      <Button size="sm" variant="outline" className="mt-3 gap-2">
                        <ChevronRight className="h-4 w-4" />
                        Go to Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {manifoldValves.map((valve) => (
                    <ValveControlCard
                      key={valve._id}
                      valve={valve}
                      onCommand={(action) =>
                        dispatch(sendValveCommand({ valveId: valve._id, action }))
                      }
                      onModeToggle={() =>
                        dispatch(
                          updateValveMode({
                            valveId: valve._id,
                            mode: valve.operationalData.mode === 'AUTO' ? 'MANUAL' : 'AUTO',
                          })
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* SLD Tab */}
          {activeTab === 'sld' && (
            <motion.div
              key="sld"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SLDDiagram valves={manifoldValves} />
            </motion.div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { AppDispatch, RootState } from '@/store/store';
import {
  fetchManifolds,
  fetchManifoldDetail,
  sendValveCommand,
  updateValveMode,
  updateValveStatus,
  updateDeviceSensorData,
  acknowledgeAlarm,
  resolveAlarm,
} from '@/store/slices/manifoldSlice';
import { createAuthenticatedSocket } from '@/lib/socket';
import {
  Monitor,
  Zap,
  Gauge,
  Battery,
  Signal,
  ChevronRight,
  Power,
  Server,
  Activity,
  Loader2,
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  Hash,
  MapPin,
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';

// ─── Types ─────────────────────────────────────────────────────────────────

type ScadaTab = 'scada' | 'sld' | 'alarms';

interface Alarm {
  alarmId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  resolved?: boolean;
}

interface Valve {
  _id: string;
  valveNumber: number;
  esp32PinNumber?: number;
  operationalData: {
    currentStatus: 'ON' | 'OFF' | 'FAULT';
    mode: 'AUTO' | 'MANUAL';
    lastCommand?: { action: string; timestamp: string; issuedBy?: string };
    cycleCount: number;
    totalRuntime: number;
    autoOffDurationSec?: number;
  };
  position?: { flowOrder?: number; zone?: string };
  alarms?: Alarm[];
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
        <rect width={svgWidth} height={svgHeight} fill="#0f172a" />
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={i} x1={0} y1={i * 48} x2={svgWidth} y2={i * 48} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
        ))}
        <rect x={svgWidth / 2 - 50} y={20} width={100} height={28} rx={4} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
        <text x={svgWidth / 2} y={38} textAnchor="middle" fill="#93c5fd" fontSize={11} fontWeight="bold">MAINS 230V</text>
        <line x1={svgWidth / 2} y1={48} x2={svgWidth / 2} y2={90} stroke="#3b82f6" strokeWidth={2} />
        <rect x={svgWidth / 2 - 30} y={90} width={60} height={22} rx={3} fill="#1a2a3a" stroke="#64748b" strokeWidth={1} />
        <text x={svgWidth / 2} y={105} textAnchor="middle" fill="#94a3b8" fontSize={9}>ISOLATOR</text>
        <line x1={svgWidth / 2} y1={112} x2={svgWidth / 2} y2={140} stroke="#3b82f6" strokeWidth={2} />
        <rect x={svgWidth / 2 - 60} y={140} width={120} height={28} rx={4} fill="#1a2030" stroke="#6366f1" strokeWidth={1.5} />
        <text x={svgWidth / 2} y={158} textAnchor="middle" fill="#a5b4fc" fontSize={11} fontWeight="bold">MAIN DB</text>
        {valves.length > 0 && (
          <line x1={60 + colWidth / 2} y1={168} x2={60 + (valves.length - 1) * colWidth + colWidth / 2} y2={168} stroke="#475569" strokeWidth={3} />
        )}
        {valves.map((valve, i) => {
          const cx = 60 + i * colWidth + colWidth / 2;
          const color = getLineColor(valve.operationalData.currentStatus);
          const dashed = isDashed(valve.operationalData.currentStatus);
          const strokeDash = dashed ? '6 4' : undefined;
          return (
            <g key={valve._id}>
              <line x1={cx} y1={168} x2={cx} y2={200} stroke={color} strokeWidth={2} strokeDasharray={strokeDash} />
              <rect x={cx - 18} y={200} width={36} height={22} rx={3} fill="#1e293b" stroke={color} strokeWidth={1.5} />
              <text x={cx} y={214} textAnchor="middle" fill={color} fontSize={8} fontWeight="bold">MCB</text>
              <line x1={cx} y1={222} x2={cx} y2={268} stroke={color} strokeWidth={2} strokeDasharray={strokeDash} />
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
              <line x1={cx} y1={300} x2={cx} y2={340} stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? '4 3' : undefined} />
              <rect x={cx - 22} y={340} width={44} height={20} rx={3} fill="#0f172a" stroke={color} strokeWidth={1} />
              <text x={cx} y={354} textAnchor="middle" fill={color} fontSize={9} fontWeight="bold">V{valve.valveNumber}</text>
              <text x={cx} y={380} textAnchor="middle" fill={color} fontSize={8}>{valve.operationalData.currentStatus}</text>
              <text x={cx} y={393} textAnchor="middle" fill="#64748b" fontSize={7}>{valve.operationalData.mode}</text>
            </g>
          );
        })}
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

function SensorChip({ icon, label, value, color, unit }: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  color: string;
  unit: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${color} transition-opacity ${value === null ? 'opacity-50' : ''}`}>
      {icon}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">{label}</p>
        <p className="text-base font-bold tabular-nums">
          {value !== null ? `${value.toFixed(value % 1 === 0 ? 0 : 1)}${unit}` : '—'}
        </p>
      </div>
    </div>
  );
}

// ─── Valve Control Card ───────────────────────────────────────────────────

type PendingAction = 'ON' | 'OFF' | 'PULSE' | 'MODE' | null;

function ValveControlCard({
  valve,
  canWrite,
  onCommand,
  onModeToggle,
}: {
  valve: Valve;
  canWrite: boolean;
  onCommand: (action: 'ON' | 'OFF' | 'PULSE') => Promise<unknown>;
  onModeToggle: () => Promise<unknown>;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const status = valve.operationalData.currentStatus;
  const mode = valve.operationalData.mode;
  const activeAlarms = (valve.alarms ?? []).filter((a) => !a.resolved);
  const zone = valve.position?.zone;
  const runtimeHrs = (valve.operationalData.totalRuntime / 3600).toFixed(1);
  const lastCmd = valve.operationalData.lastCommand;

  const handleCommand = useCallback(async (action: 'ON' | 'OFF' | 'PULSE') => {
    if (pendingAction || !canWrite) return;
    setPendingAction(action);
    try { await onCommand(action); } finally { setPendingAction(null); }
  }, [pendingAction, canWrite, onCommand]);

  const handleModeToggle = useCallback(async () => {
    if (pendingAction || !canWrite) return;
    setPendingAction('MODE');
    try { await onModeToggle(); } finally { setPendingAction(null); }
  }, [pendingAction, canWrite, onModeToggle]);

  const statusRingClass =
    status === 'ON' ? 'ring-emerald-500/40 bg-emerald-500/5' :
    status === 'FAULT' ? 'ring-red-500/40 bg-red-500/5' :
    'ring-border/40 bg-card/60';

  const statusBadgeClass =
    status === 'ON' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
    status === 'FAULT' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
    'bg-slate-500/20 text-slate-400 border-slate-500/30';

  const ACTIONS = [
    { action: 'ON' as const, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25' },
    { action: 'OFF' as const, cls: 'bg-slate-500/15 text-slate-400 border-slate-500/25 hover:bg-slate-500/25' },
    { action: 'PULSE' as const, cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/25' },
  ];

  return (
    <div className={`rounded-xl border ring-1 backdrop-blur-sm p-4 space-y-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 ${statusRingClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            status === 'ON' ? 'bg-emerald-500/15' :
            status === 'FAULT' ? 'bg-red-500/15' : 'bg-muted/30'
          }`}>
            <Power className={`h-4 w-4 ${
              status === 'ON' ? 'text-emerald-400' :
              status === 'FAULT' ? 'text-red-400' : 'text-muted-foreground'
            }`} />
          </div>
          <div>
            <p className="font-bold text-sm">Valve {valve.valveNumber}</p>
            {zone && <p className="text-[10px] text-muted-foreground">{zone}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {activeAlarms.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-0.5">
              <Bell className="h-2.5 w-2.5" />{activeAlarms.length}
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>{status}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
            mode === 'AUTO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>{mode}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/20 px-2 py-1.5 text-center">
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-widest flex items-center justify-center gap-0.5"><Hash className="h-2.5 w-2.5" />Cycles</p>
          <p className="text-sm font-bold tabular-nums">{valve.operationalData.cycleCount}</p>
        </div>
        <div className="rounded-lg bg-muted/20 px-2 py-1.5 text-center">
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-widest flex items-center justify-center gap-0.5"><Clock className="h-2.5 w-2.5" />Runtime</p>
          <p className="text-sm font-bold tabular-nums">{runtimeHrs}h</p>
        </div>
        <div className="rounded-lg bg-muted/20 px-2 py-1.5 text-center">
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-widest flex items-center justify-center gap-0.5"><MapPin className="h-2.5 w-2.5" />Flow#</p>
          <p className="text-sm font-bold tabular-nums">{valve.position?.flowOrder ?? valve.valveNumber}</p>
        </div>
      </div>

      {/* Last command */}
      {lastCmd && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/15 border border-border/30">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <p className="text-[10px] text-muted-foreground/70">
            Last: <span className="font-semibold text-foreground/80">{lastCmd.action}</span>
            {' · '}{new Date(lastCmd.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {ACTIONS.map(({ action, cls }) => (
          <button
            key={action}
            onClick={() => handleCommand(action)}
            disabled={pendingAction !== null || !canWrite}
            title={!canWrite ? 'Insufficient permissions' : undefined}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
          >
            {pendingAction === action ? <Loader2 className="h-3 w-3 animate-spin" /> : action}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <button
        onClick={handleModeToggle}
        disabled={pendingAction !== null || !canWrite}
        title={!canWrite ? 'Insufficient permissions' : undefined}
        className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-muted/30 text-muted-foreground border border-border/40 hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pendingAction === 'MODE' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            {mode === 'AUTO' ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
            Switch to {mode === 'AUTO' ? 'MANUAL' : 'AUTO'}
          </>
        )}
      </button>
    </div>
  );
}

// ─── Alarms Panel ─────────────────────────────────────────────────────────

function AlarmsPanel({
  valves,
  manifoldId,
  dispatch,
}: {
  valves: Valve[];
  manifoldId: string | null;
  dispatch: AppDispatch;
}) {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [showResolved, setShowResolved] = useState(false);

  const allAlarms = useMemo(() => {
    const result: Array<Alarm & { valveId: string; valveNumber: number }> = [];
    for (const valve of valves) {
      for (const alarm of valve.alarms ?? []) {
        result.push({ ...alarm, valveId: valve._id, valveNumber: valve.valveNumber });
      }
    }
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [valves]);

  const filtered = allAlarms.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (filter !== 'ALL' && a.severity !== filter) return false;
    return true;
  });

  const critCount = allAlarms.filter((a) => a.severity === 'CRITICAL' && !a.resolved).length;
  const warnCount = allAlarms.filter((a) => a.severity === 'WARNING' && !a.resolved).length;
  const infoCount = allAlarms.filter((a) => a.severity === 'INFO' && !a.resolved).length;

  if (!manifoldId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
        <p className="text-muted-foreground text-sm">Select a manifold to view alarms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Severity summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL' as const, label: 'All', count: allAlarms.filter((a) => !a.resolved).length, cls: 'border-border/50 text-muted-foreground' },
          { key: 'CRITICAL' as const, label: 'Critical', count: critCount, cls: 'border-red-500/30 text-red-400 bg-red-500/5' },
          { key: 'WARNING' as const, label: 'Warning', count: warnCount, cls: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
          { key: 'INFO' as const, label: 'Info', count: infoCount, cls: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filter === f.key ? `${f.cls} ring-1` : 'border-border/30 text-muted-foreground/60 hover:border-border/50'
            }`}
          >
            {f.label}
            <span className="px-1 py-0.5 rounded text-[10px] bg-muted/40">{f.count}</span>
          </button>
        ))}
        <button
          onClick={() => setShowResolved((v) => !v)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            showResolved ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-border/30 text-muted-foreground/60 hover:border-border/50'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-400 opacity-60 mb-3" />
          <p className="text-muted-foreground text-sm">No alarms match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((alarm) => (
              <motion.div
                key={alarm.alarmId}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  alarm.resolved ? 'border-border/30 bg-muted/10 opacity-60' :
                  alarm.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5' :
                  alarm.severity === 'WARNING' ? 'border-amber-500/30 bg-amber-500/5' :
                  'border-blue-500/30 bg-blue-500/5'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {alarm.resolved ? <CheckCircle className="h-4 w-4 text-emerald-400" /> :
                   alarm.acknowledged ? <AlertTriangle className="h-4 w-4 text-amber-400" /> :
                   <XCircle className="h-4 w-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      alarm.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      alarm.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>{alarm.severity}</span>
                    <span className="text-xs text-muted-foreground">Valve {alarm.valveNumber}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">
                      {new Date(alarm.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{alarm.message}</p>
                </div>
                {!alarm.resolved && (
                  <div className="flex gap-1.5 shrink-0">
                    {!alarm.acknowledged && (
                      <button
                        onClick={() => dispatch(acknowledgeAlarm({ valveId: alarm.valveId, alarmId: alarm.alarmId }))}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                      >
                        Ack
                      </button>
                    )}
                    <button
                      onClick={() => dispatch(resolveAlarm({ valveId: alarm.valveId, alarmId: alarm.alarmId }))}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ScadaPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<ScadaTab>('scada');
  const [selectedManifoldId, setSelectedManifoldId] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState<string | null>(null);
  const { canWrite } = useRole();

  const { manifolds, valves, sensorData, loading } = useSelector((s: RootState) => s.manifolds);

  useEffect(() => {
    if (manifolds.length === 0 && !loading) dispatch(fetchManifolds({}));
  }, [dispatch, manifolds.length, loading]);

  useEffect(() => {
    if (manifolds.length > 0 && !selectedManifoldId) {
      const firstId = manifolds[0]._id;
      setSelectedManifoldId(firstId);
      dispatch(fetchManifoldDetail(firstId));
    }
  }, [manifolds, selectedManifoldId, dispatch]);

  useEffect(() => {
    if (selectedManifoldId) dispatch(fetchManifoldDetail(selectedManifoldId));
  }, [selectedManifoldId, dispatch]);

  useEffect(() => {
    const socket = createAuthenticatedSocket();
    socket.on('manifoldStatus', (d: unknown) => dispatch(updateValveStatus(d)));
    socket.on('deviceTelemetry', (d: unknown) => dispatch(updateDeviceSensorData(d as Parameters<typeof updateDeviceSensorData>[0])));
    return () => { socket.disconnect(); };
  }, [dispatch]);

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

  // Derived alarm counts for the status banner
  const activeAlarmCount = manifoldValves.reduce(
    (sum, v) => sum + ((v.alarms ?? []).filter((a) => !a.resolved && !a.acknowledged).length),
    0
  );
  const faultCount = manifoldValves.filter((v) => v.operationalData.currentStatus === 'FAULT').length;
  const onCount = manifoldValves.filter((v) => v.operationalData.currentStatus === 'ON').length;

  // Batch operations
  const handleBatchCommand = async (action: 'ON' | 'OFF') => {
    if (!canWrite || batchPending) return;
    setBatchPending(action);
    try {
      await Promise.all(manifoldValves.map((v) => dispatch(sendValveCommand({ valveId: v._id, action }))));
    } finally {
      setBatchPending(null);
    }
  };

  const handleBatchMode = async (mode: 'AUTO' | 'MANUAL') => {
    if (!canWrite || batchPending) return;
    setBatchPending(`MODE_${mode}`);
    try {
      await Promise.all(manifoldValves.map((v) => dispatch(updateValveMode({ valveId: v._id, mode }))));
    } finally {
      setBatchPending(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-5">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-cyan-500 rounded-xl blur-lg opacity-40" />
                <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-cyan-500/10 rounded-xl border border-brand-500/20">
                  <Monitor className="h-6 w-6 text-brand-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-300 to-brand-500">
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
                  className="px-3 py-2 text-sm bg-card/80 border border-border/50 rounded-xl focus:border-brand-500/40 outline-none transition-colors appearance-none cursor-pointer dark:[color-scheme:dark]"
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

          {/* System status banner */}
          {selectedManifoldId && manifoldValves.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`flex flex-wrap items-center gap-4 px-5 py-3.5 rounded-xl border text-sm ${
                faultCount > 0 ? 'border-red-500/30 bg-red-500/5' :
                activeAlarmCount > 0 ? 'border-amber-500/30 bg-amber-500/5' :
                'border-emerald-500/20 bg-emerald-500/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {faultCount > 0 ? (
                  <XCircle className="h-4 w-4 text-red-400" />
                ) : activeAlarmCount > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                )}
                <span className={`font-semibold ${faultCount > 0 ? 'text-red-400' : activeAlarmCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {faultCount > 0 ? `${faultCount} valve${faultCount !== 1 ? 's' : ''} in FAULT` :
                   activeAlarmCount > 0 ? `${activeAlarmCount} active alarm${activeAlarmCount !== 1 ? 's' : ''}` :
                   'All Clear'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto">
                <span><span className="font-bold text-emerald-400">{onCount}</span> / {manifoldValves.length} valves ON</span>
                <span><span className="font-bold text-muted-foreground">{manifoldValves.filter((v) => v.operationalData.mode === 'AUTO').length}</span> AUTO mode</span>
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex flex-wrap gap-2"
          >
            {[
              { id: 'scada' as ScadaTab, label: 'SCADA Control', icon: Activity },
              { id: 'sld' as ScadaTab, label: 'Single Line Diagram', icon: Zap },
              { id: 'alarms' as ScadaTab, label: 'Alarms', icon: Bell, badge: activeAlarmCount > 0 ? activeAlarmCount : 0 },
            ].map((tab) => (
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
                {'badge' in tab && (tab as { badge: number }).badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    {(tab as { badge: number }).badge}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* ─── SCADA Control Tab ─────────────────────────────────────── */}
          {activeTab === 'scada' && (
            <motion.div key="scada" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">

              {/* Sensor row */}
              <div className="flex flex-wrap gap-3">
                <SensorChip icon={<Gauge className="h-4 w-4" />} label="PT1" value={telemetry?.pt1 ?? null} color="bg-brand-500/10 border-brand-500/20 text-brand-400" unit=" PSI" />
                <SensorChip icon={<Gauge className="h-4 w-4" />} label="PT2" value={telemetry?.pt2 ?? null} color="bg-cyan-500/10 border-cyan-500/20 text-cyan-400" unit=" PSI" />
                <SensorChip icon={<Battery className="h-4 w-4" />} label="Battery" value={telemetry?.battery ?? null} color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" unit="%" />
                <SensorChip icon={<Signal className="h-4 w-4" />} label="RSSI" value={telemetry?.rssi ?? null} color="bg-purple-500/10 border-purple-500/20 text-purple-400" unit=" dBm" />
              </div>

              {/* Batch controls (write-only) */}
              {canWrite && manifoldValves.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mr-2">Batch Control</span>
                  {[
                    { label: 'All ON', action: () => handleBatchCommand('ON'), key: 'ON', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' },
                    { label: 'All OFF', action: () => handleBatchCommand('OFF'), key: 'OFF', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20' },
                    { label: 'All AUTO', action: () => handleBatchMode('AUTO'), key: 'MODE_AUTO', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' },
                    { label: 'All MANUAL', action: () => handleBatchMode('MANUAL'), key: 'MODE_MANUAL', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      onClick={btn.action}
                      disabled={batchPending !== null}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${btn.cls}`}
                    >
                      {batchPending === btn.key ? <Loader2 className="h-3 w-3 animate-spin" /> : btn.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Valve grid */}
              {loading && manifoldValves.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-52 rounded-xl border border-border/30 bg-card/30 animate-pulse" />
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
                <>
                  {!canWrite && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      View-only mode — your role does not have write access to valve controls.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {manifoldValves.map((valve) => (
                      <ValveControlCard
                        key={valve._id}
                        valve={valve}
                        canWrite={canWrite}
                        onCommand={(action) => dispatch(sendValveCommand({ valveId: valve._id, action }))}
                        onModeToggle={() =>
                          dispatch(updateValveMode({
                            valveId: valve._id,
                            mode: valve.operationalData.mode === 'AUTO' ? 'MANUAL' : 'AUTO',
                          }))
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ─── SLD Tab ──────────────────────────────────────────────── */}
          {activeTab === 'sld' && (
            <motion.div key="sld" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <SLDDiagram valves={manifoldValves} />
            </motion.div>
          )}

          {/* ─── Alarms Tab ───────────────────────────────────────────── */}
          {activeTab === 'alarms' && (
            <motion.div key="alarms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <AlarmsPanel valves={manifoldValves} manifoldId={selectedManifoldId} dispatch={dispatch} />
            </motion.div>
          )}

          {/* Refresh button */}
          {selectedManifoldId && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => { if (selectedManifoldId) dispatch(fetchManifoldDetail(selectedManifoldId)); }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border/40 hover:bg-muted/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          )}

      </div>
    </MainLayout>
  );
}

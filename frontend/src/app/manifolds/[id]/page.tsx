'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  acknowledgeAlarm,
  resolveAlarm,
  createSchedule,
  deleteSchedule,
  fetchManifoldDetail,
  sendValveCommand,
  updateSchedule,
  updateValve,
  updateValveAlarmConfig,
  updateValveMode,
  updateValveStatus,
  updateDeviceSensorData,
} from '@/store/slices/manifoldSlice';
import type { DeviceSensorData } from '@/store/slices/manifoldSlice';
import {
  fetchTTNApplications,
  fetchTTNDevices,
  fetchTTNUplinks,
  sendTTNDownlink,
  TTNDevice as TTNDeviceType,
} from '@/store/slices/ttnSlice';
import { AppDispatch, RootState } from '@/store/store';
import { createAuthenticatedSocket } from '@/lib/socket';
import { useManifoldSimulation } from '@/hooks/useManifoldSimulation';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Gauge,
  History,
  Info,
  LayoutDashboard,
  Loader2,
  MapPin,
  Network,
  Pencil,
  Power,
  PowerOff,
  Radio,
  Save,
  Send,
  Settings2,
  ShieldAlert,
  Signal,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wifi,
  WifiOff,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────────────────────
type GlobalMode = 'MANUAL' | 'AUTO';
type MainTab = 'control' | 'scheduling';
type SchedulingTab = 'schedules' | 'history' | 'alarms' | 'alarm-history' | 'lorawan';
type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
type ValveAction = 'ON' | 'OFF' | 'PULSE';

interface ValveAlarm {
  alarmId: string;
  severity: AlarmSeverity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
}

interface ValveSchedule {
  scheduleId: string;
  enabled: boolean;
  cronExpression: string;
  action: 'ON' | 'OFF';
  duration: number;
  startAt?: string;
  endAt?: string;
  createdAt?: string;
}

interface ValveAlarmConfig {
  enabled: boolean;
  ruleType: 'THRESHOLD' | 'STATUS';
  metric: 'pressure' | 'flow' | 'runtime' | 'status';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold?: number;
  triggerStatus?: 'FAULT' | 'OFF';
  severity?: AlarmSeverity;
  notify: boolean;
}

interface ValveView {
  _id: string;
  valveNumber: number;
  esp32PinNumber: number;
  position?: { flowOrder: number; zone: string };
  specifications?: {
    type: string; size: string; voltage: string;
    manufacturer: string; model: string; serialNumber: string;
  };
  operationalData: {
    currentStatus: 'ON' | 'OFF' | 'FAULT';
    mode: 'AUTO' | 'MANUAL';
    cycleCount: number;
    totalRuntime?: number;
    autoOffDurationSec?: number;
  };
  alarms: ValveAlarm[];
  schedules: ValveSchedule[];
  alarmConfig?: ValveAlarmConfig;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function toDateTimeLocal(date?: string) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(startAt?: string, endAt?: string): string {
  if (!startAt || !endAt) return '';
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (ms <= 0) return '';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return `${Math.round(ms / 1000)}s`;
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleString();
}

function formatScheduleTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  if (diff < 3600000) return `in ${Math.round(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const DEFAULT_ALARM_CONFIG: ValveAlarmConfig = {
  enabled: false,
  ruleType: 'STATUS',
  metric: 'status',
  operator: '==',
  threshold: 0,
  triggerStatus: 'FAULT',
  severity: 'WARNING',
  notify: true,
};

// ──────────────────────────────────────────────────────────────
// Pressure Meter — semicircle arc gauge (reusable)
// ──────────────────────────────────────────────────────────────
function PressureMeter({
  value,
  max = 100,
  unit = 'PSI',
  small = false,
}: {
  value: number;
  max: number;
  unit?: string;
  small?: boolean;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const color = pct < 0.4 ? '#10b981' : pct < 0.7 ? '#f59e0b' : '#ef4444';

  // Geometry scales with `small`
  const CX = 40, CY = 38, R = small ? 28 : 34;
  const W = 80, H = small ? 54 : 62;

  const angle = Math.PI * (1 - pct);
  const ex = +(CX + R * Math.cos(angle)).toFixed(2);
  const ey = +(CY - R * Math.sin(angle)).toFixed(2);
  const bgPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const fillPath =
    pct > 0.005
      ? `M ${CX - R} ${CY} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${ex} ${ey}`
      : '';
  const nx = +(CX + R * 0.65 * Math.cos(angle)).toFixed(2);
  const ny = +(CY - R * 0.65 * Math.sin(angle)).toFixed(2);
  const sw = small ? 5 : 7;
  const fs = small ? 11 : 13;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={small ? 'h-auto w-16' : 'h-auto w-20'}>
      <path d={bgPath} fill="none" stroke="#1f2937" strokeWidth={sw} strokeLinecap="round" />
      {fillPath && (
        <>
          <path d={fillPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <path d={fillPath} fill="none" stroke={color} strokeWidth={sw - 2} strokeLinecap="round" opacity="0.2" />
        </>
      )}
      <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={small ? 2.5 : 3} fill={color} />
      <circle cx={CX} cy={CY} r={small ? 1.5 : 2} fill="#0f172a" />
      <text x={CX} y={CY + (small ? 11 : 13)} textAnchor="middle" fontSize={fs} fontWeight="bold" fill="#f9fafb">
        {value < 10 ? value.toFixed(1) : Math.round(value)}
      </text>
      <text x={CX} y={CY + (small ? 20 : 22)} textAnchor="middle" fontSize="7" fill="#6b7280">
        {unit}
      </text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Severity Badge
// ──────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: AlarmSeverity }) {
  const cfg: Record<AlarmSeverity, { cls: string; icon: React.ReactNode }> = {
    INFO: {
      cls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
      icon: <Info className="h-3 w-3" />,
    },
    WARNING: {
      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    CRITICAL: {
      cls: 'bg-red-500/10 text-red-400 border-red-500/25',
      icon: <AlertOctagon className="h-3 w-3" />,
    },
  };
  const { cls, icon } = cfg[severity];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {icon}
      {severity}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────
export default function ManifoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const manifoldId = params.id as string;

  const { selectedManifold, valves, sensorData, loading, error } = useSelector(
    (s: RootState) => s.manifolds
  );
  const manifoldValves = useMemo(
    () => (valves[manifoldId] || []) as ValveView[],
    [valves, manifoldId]
  );

  // ── TTN state ─────────────────────────────────────────────
  const { applications: ttnApps, devices: ttnDevices, uplinks: ttnUplinks } = useSelector(
    (s: RootState) => s.ttn
  );
  const [ttnAppId, setTtnAppId] = useState<string>('');
  const [ttnDeviceId, setTtnDeviceId] = useState<string>('');
  const [downlinkForm, setDownlinkForm] = useState({ fPort: 1, payload: '' });
  const [sendingDownlink, setSendingDownlink] = useState(false);
  const [downlinkResult, setDownlinkResult] = useState<'ok' | 'err' | null>(null);

  const selectedTTNApp = ttnApps.find((a) => a._id === ttnAppId) ?? null;
  const selectedTTNDevice: TTNDeviceType | null = ttnDevices.find((d) => d._id === ttnDeviceId) ?? null;

  const TTN_ONLINE_MS = 15 * 60 * 1000;
  const ttnIsOnline = selectedTTNDevice
    ? selectedTTNDevice.lastSeen != null &&
      Date.now() - new Date(selectedTTNDevice.lastSeen).getTime() < TTN_ONLINE_MS
    : false;

  // Pressure simulation (used until real LoRa uplink data is available)
  const simulation = useManifoldSimulation();

  // ── UI state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MainTab>('control');
  const [schedulingTab, setSchedulingTab] = useState<SchedulingTab>('schedules');
  const [globalMode, setGlobalMode] = useState<GlobalMode>('MANUAL');
  const [editingValve, setEditingValve] = useState<string | null>(null);
  const [alarmFilter, setAlarmFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'UNACKED'>('ALL');

  // Valve draft state
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [alarmDraft, setAlarmDraft] = useState<Record<string, ValveAlarmConfig>>({});

  // Schedule state (duration removed — derived from endAt-startAt)
  const [scheduleValveId, setScheduleValveId] = useState<string>('');
  const [scheduleDraft, setScheduleDraft] = useState({
    action: 'ON' as 'ON' | 'OFF',
    startAt: '',
    endAt: '',
  });
  const [scheduleEditId, setScheduleEditId] = useState<string | null>(null);

  // ── Initialise global mode from valves (majority) ─────────
  const initialisedMode = useRef(false);
  useEffect(() => {
    if (initialisedMode.current || manifoldValves.length === 0) return;
    initialisedMode.current = true;
    const autoCount = manifoldValves.filter((v) => v.operationalData.mode === 'AUTO').length;
    setGlobalMode(autoCount >= manifoldValves.length / 2 ? 'AUTO' : 'MANUAL');
  }, [manifoldValves]);

  // Default schedule valve selector
  useEffect(() => {
    if (manifoldValves.length > 0 && !scheduleValveId) {
      setScheduleValveId(manifoldValves[0]._id);
    }
  }, [manifoldValves, scheduleValveId]);

  // ── Fetch manifold ────────────────────────────────────────
  useEffect(() => {
    if (manifoldId) dispatch(fetchManifoldDetail(manifoldId));
  }, [dispatch, manifoldId]);

  // ── WebSocket ─────────────────────────────────────────────
  useEffect(() => {
    if (!selectedManifold) return;
    const socket = createAuthenticatedSocket();

    socket.on('connect', () => {
      socket.emit('joinManifold', selectedManifold.manifoldId);
      socket.emit('requestManifoldStatus', manifoldId);
    });

    // Valve state updates from backend/MQTT/LoRa
    socket.on(
      'manifoldStatus',
      (data: { manifoldId: string; valves: Array<{ valveNumber: number; status: 'ON' | 'OFF' | 'FAULT' }> }) => {
        dispatch(updateValveStatus(data));
      }
    );

    // LoRa uplink sensor data (PT1/PT2/battery/solar/tamper)
    // Backend may emit either of these event names when it receives a TTN uplink
    const handleTelemetry = (data: DeviceSensorData) => {
      dispatch(updateDeviceSensorData(data));
    };
    socket.on('deviceTelemetry', handleTelemetry);
    socket.on('deviceUplink', handleTelemetry);

    return () => {
      socket.emit('leaveManifold', selectedManifold.manifoldId);
      socket.disconnect();
    };
  }, [dispatch, manifoldId, selectedManifold]);

  // ── TTN data loading ──────────────────────────────────────
  useEffect(() => {
    if (ttnApps.length === 0) dispatch(fetchTTNApplications());
  }, [dispatch, ttnApps.length]);

  // Restore selection from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(`manifold-ttn-${manifoldId}`);
    if (saved) {
      try {
        const { appId, deviceId } = JSON.parse(saved);
        if (appId) setTtnAppId(appId);
        if (deviceId) setTtnDeviceId(deviceId);
      } catch { /* ignore */ }
    }
  }, [manifoldId]);

  // Load TTN devices when app changes
  useEffect(() => {
    if (!ttnAppId || !selectedTTNApp) return;
    dispatch(fetchTTNDevices(selectedTTNApp.applicationId));
  }, [ttnAppId, selectedTTNApp, dispatch]);

  // Load recent uplinks when device changes
  useEffect(() => {
    if (!selectedTTNApp || !selectedTTNDevice) return;
    dispatch(fetchTTNUplinks({
      applicationId: selectedTTNApp.applicationId,
      deviceId: selectedTTNDevice.deviceId,
      limit: 30,
    }));
  }, [selectedTTNApp, selectedTTNDevice, dispatch]);

  const handleTTNAppChange = (appId: string) => {
    setTtnAppId(appId);
    setTtnDeviceId('');
    if (typeof window !== 'undefined') {
      localStorage.setItem(`manifold-ttn-${manifoldId}`, JSON.stringify({ appId, deviceId: '' }));
    }
  };

  const handleTTNDeviceChange = (devId: string) => {
    setTtnDeviceId(devId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`manifold-ttn-${manifoldId}`, JSON.stringify({ appId: ttnAppId, deviceId: devId }));
    }
  };

  const handleSendDownlink = async () => {
    if (!selectedTTNApp || !selectedTTNDevice || !downlinkForm.payload.trim()) return;
    setSendingDownlink(true);
    setDownlinkResult(null);
    try {
      await dispatch(sendTTNDownlink({
        applicationId: selectedTTNApp.applicationId,
        deviceId: selectedTTNDevice.deviceId,
        fPort: downlinkForm.fPort,
        payload: downlinkForm.payload.trim(),
      })).unwrap();
      setDownlinkResult('ok');
      setDownlinkForm((p) => ({ ...p, payload: '' }));
    } catch {
      setDownlinkResult('err');
    } finally {
      setSendingDownlink(false);
      setTimeout(() => setDownlinkResult(null), 3000);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const isOnline =
    selectedManifold && typeof selectedManifold.esp32DeviceId === 'object'
      ? selectedManifold.esp32DeviceId.status === 'online'
      : true;

  // Derive device ID for sensor data lookup
  const deviceId =
    selectedManifold && typeof selectedManifold.esp32DeviceId === 'object'
      ? selectedManifold.esp32DeviceId._id
      : typeof selectedManifold?.esp32DeviceId === 'string'
      ? selectedManifold.esp32DeviceId
      : '';
  const telemetry: DeviceSensorData | null = (deviceId && sensorData[deviceId]) || null;

  const maxPressure = selectedManifold?.specifications?.maxPressure || 100;

  // ── Alarm derivations ─────────────────────────────────────
  const allAlarms = useMemo(
    () =>
      manifoldValves.flatMap((v) =>
        (v.alarms || []).map((a) => ({
          ...a,
          valveId: v._id,
          valveNumber: v.valveNumber,
          valveName: v.position?.zone || `Valve ${v.valveNumber}`,
        }))
      ),
    [manifoldValves]
  );
  const activeAlarms = useMemo(() => allAlarms.filter((a) => !a.resolved), [allAlarms]);
  const alarmHistory = useMemo(
    () =>
      allAlarms
        .filter((a) => a.resolved)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allAlarms]
  );
  const filteredActiveAlarms = useMemo(() => {
    let list = activeAlarms;
    if (alarmFilter === 'UNACKED') list = list.filter((a) => !a.acknowledged);
    else if (alarmFilter !== 'ALL') list = list.filter((a) => a.severity === alarmFilter);
    return list.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activeAlarms, alarmFilter]);

  const activeValveCount = manifoldValves.filter(
    (v) => v.operationalData.currentStatus === 'ON'
  ).length;

  // ── Global mode — batch update all valves ─────────────────
  const handleGlobalModeChange = useCallback(
    (mode: GlobalMode) => {
      setGlobalMode(mode);
      manifoldValves.forEach((v) => dispatch(updateValveMode({ valveId: v._id, mode })));
    },
    [dispatch, manifoldValves]
  );

  const onValveCommand = useCallback(
    (valveId: string, action: ValveAction) => {
      dispatch(sendValveCommand({ valveId, action }));
    },
    [dispatch]
  );

  // ── Schedule helpers ──────────────────────────────────────
  const resetScheduleDraft = () => {
    setScheduleDraft({ action: 'ON', startAt: '', endAt: '' });
    setScheduleEditId(null);
  };

  const handleAddOrUpdateSchedule = () => {
    if (!scheduleValveId) return;
    const payload = {
      action: scheduleDraft.action,
      startAt: scheduleDraft.startAt ? new Date(scheduleDraft.startAt).toISOString() : undefined,
      endAt: scheduleDraft.endAt ? new Date(scheduleDraft.endAt).toISOString() : undefined,
    };
    if (scheduleEditId) {
      dispatch(updateSchedule({ valveId: scheduleValveId, scheduleId: scheduleEditId, data: payload }));
      resetScheduleDraft();
    } else {
      dispatch(
        createSchedule({
          valveId: scheduleValveId,
          cronExpression: '',
          action: payload.action,
          startAt: payload.startAt,
          endAt: payload.endAt,
          enabled: true,
        })
      );
      setScheduleDraft({ action: 'ON', startAt: '', endAt: '' });
    }
  };

  const handleSaveAlarmConfig = (valve: ValveView) => {
    const cfg = alarmDraft[valve._id] ?? valve.alarmConfig;
    if (!cfg) return;
    dispatch(updateValveAlarmConfig({ valveId: valve._id, alarmConfig: cfg }));
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading || !selectedManifold) {
    return (
      <MainLayout>
        <div className="relative min-h-screen">
          <AnimatedBackground variant="subtle" showParticles showGradientOrbs />
          <div className="relative z-10 flex h-screen items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading manifold…
          </div>
        </div>
      </MainLayout>
    );
  }

  // ════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════
  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles showGradientOrbs />

        <div className="container relative z-10 space-y-5 px-4 py-6 md:py-8">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.push('/manifolds')}
                className="mb-1 px-0 hover:bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to manifolds
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">{selectedManifold.name}</h1>
              <p className="font-mono text-xs text-muted-foreground">{selectedManifold.manifoldId}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeAlarms.filter((a) => !a.acknowledged).length > 0 && (
                <Badge className="bg-red-600 text-white">
                  <AlertOctagon className="mr-1 h-3 w-3" />
                  {activeAlarms.filter((a) => !a.acknowledged).length} Unacked
                </Badge>
              )}
              <Badge className={isOnline ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}>
                {isOnline ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
                {isOnline ? 'LoRa Connected' : 'Offline'}
              </Badge>
              <Badge variant={selectedManifold.status === 'Active' ? 'default' : 'secondary'}>
                {selectedManifold.status}
              </Badge>
            </div>
          </div>

          {/* ── Global Mode Control ─────────────────────────── */}
          <Card
            className={`border-2 p-4 transition-colors ${
              globalMode === 'AUTO'
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-brand-500/40 bg-brand-500/5'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Global Control Mode
                </p>
                <h2 className={`mt-0.5 text-xl font-bold ${globalMode === 'AUTO' ? 'text-amber-400' : 'text-brand-400'}`}>
                  {globalMode === 'MANUAL' ? 'Manual Control' : 'Automatic Mode'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {globalMode === 'MANUAL'
                    ? 'Direct ON / OFF / PULSE control enabled on all valves via LoRaWAN downlinks'
                    : 'Valves are schedule-controlled — backend dispatches downlinks at scheduled times'}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-background/70 p-1 backdrop-blur">
                <button
                  onClick={() => handleGlobalModeChange('MANUAL')}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                    globalMode === 'MANUAL'
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ToggleLeft className="h-4 w-4" />
                  MANUAL
                </button>
                <button
                  onClick={() => handleGlobalModeChange('AUTO')}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                    globalMode === 'AUTO'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ToggleRight className="h-4 w-4" />
                  AUTO
                </button>
              </div>
            </div>
          </Card>

          {/* ── Main Tab Bar ────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'control', label: 'Control Panel', icon: LayoutDashboard },
                {
                  id: 'scheduling',
                  label: 'Schedule & Alarms',
                  icon: CalendarDays,
                  badge: activeAlarms.filter((a) => !a.acknowledged).length || undefined,
                },
              ] as Array<{ id: string; label: string; icon: React.ElementType; badge?: number }>
            ).map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as MainTab)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-lg shadow-brand-500/20'
                    : 'border border-border/50 bg-secondary/60 hover:border-brand-500/30'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge && badge > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {error && <Card className="border-red-500/30 p-3 text-sm text-red-400">{error}</Card>}

          {/* ════════════════════════════════════════════════
              CONTROL PANEL — Two clear cards
              LEFT: Valve Control Array  (span 2)
              RIGHT: Device Telemetry + System Monitor  (span 1)
          ════════════════════════════════════════════════ */}
          {activeTab === 'control' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* ─────────────────────────────────────────────
                  CARD 1 — Valve Control Array
              ───────────────────────────────────────────── */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
                    <h2 className="flex items-center gap-2 font-semibold">
                      <LayoutDashboard className="h-4 w-4 text-brand-500" />
                      Valve Control Array
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          activeValveCount > 0
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20'
                            : 'bg-secondary text-muted-foreground'
                        }
                        variant="outline"
                      >
                        {activeValveCount} / {manifoldValves.length} active
                      </Badge>
                      <Badge
                        className={
                          globalMode === 'AUTO'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                            : 'bg-brand-500/20 text-brand-400 border-brand-500/20'
                        }
                        variant="outline"
                      >
                        {globalMode}
                      </Badge>
                    </div>
                  </div>

                  {/* Valve grid — 2 columns inside the card */}
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                    {[...manifoldValves]
                      .sort((a, b) => a.valveNumber - b.valveNumber)
                      .map((valve) => {
                        const isOn = valve.operationalData.currentStatus === 'ON';
                        const isFault = valve.operationalData.currentStatus === 'FAULT';
                        const isEditing = editingValve === valve._id;
                        const valveName =
                          nameDraft[valve._id] ?? valve.position?.zone ?? `Valve ${valve.valveNumber}`;
                        const unackedCount = (valve.alarms || []).filter(
                          (a) => !a.acknowledged && !a.resolved
                        ).length;

                        // Pressure from simulation
                        const simIdx = valve.valveNumber - 1;
                        const pressure =
                          simIdx >= 0 && simIdx < simulation.pressures.outlets.length
                            ? simulation.pressures.outlets[simIdx]
                            : 0;
                        const flowRate =
                          simIdx >= 0 && simIdx < simulation.flowRates.length
                            ? simulation.flowRates[simIdx]
                            : 0;

                        // Next / current schedule for AUTO mode display
                        const now = new Date();
                        const nextSchedule = [...(valve.schedules || [])]
                          .filter((s) => s.enabled && s.startAt && new Date(s.startAt) > now)
                          .sort(
                            (a, b) =>
                              new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime()
                          )[0] ?? null;
                        const currentSchedule = (valve.schedules || []).find(
                          (s) =>
                            s.enabled &&
                            s.startAt &&
                            s.endAt &&
                            new Date(s.startAt) <= now &&
                            new Date(s.endAt) >= now
                        ) ?? null;

                        const alarmForm =
                          alarmDraft[valve._id] ?? valve.alarmConfig ?? DEFAULT_ALARM_CONFIG;

                        return (
                          <div
                            key={valve._id}
                            className={`relative overflow-hidden rounded-xl border transition-all ${
                              isFault
                                ? 'border-red-500/40 bg-red-500/5'
                                : isOn
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : 'border-border/60 bg-secondary/20'
                            } ${isEditing ? 'ring-1 ring-brand-500/40' : ''}`}
                          >
                            {/* Status strip — top border color bar */}
                            <div
                              className={`h-1 w-full ${
                                isOn
                                  ? 'bg-emerald-500'
                                  : isFault
                                  ? 'bg-red-500 animate-pulse'
                                  : 'bg-slate-600/40'
                              }`}
                            />

                            <div className="p-3 space-y-2.5">
                              {/* Header row */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <div
                                    className={`h-2 w-2 shrink-0 rounded-full ${
                                      isOn
                                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                                        : isFault
                                        ? 'bg-red-500 animate-pulse'
                                        : 'bg-slate-500'
                                    }`}
                                  />
                                  <div className="min-w-0">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={valveName}
                                        onChange={(e) =>
                                          setNameDraft((p) => ({
                                            ...p,
                                            [valve._id]: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded border border-brand-500/50 bg-background px-1.5 py-0.5 text-sm font-semibold focus:outline-none"
                                      />
                                    ) : (
                                      <p className="truncate text-sm font-semibold">{valveName}</p>
                                    )}
                                    <p className="truncate text-[10px] text-muted-foreground">
                                      GPIO {valve.esp32PinNumber} &bull; {valve.operationalData.cycleCount} cycles
                                    </p>
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  <Badge
                                    className={
                                      isOn
                                        ? 'bg-emerald-600 text-white text-[10px]'
                                        : isFault
                                        ? 'bg-red-600 text-white text-[10px]'
                                        : 'bg-slate-600 text-white text-[10px]'
                                    }
                                  >
                                    {valve.operationalData.currentStatus}
                                  </Badge>
                                  {unackedCount > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="border-red-500/50 text-red-400 text-[10px]"
                                    >
                                      <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                                      {unackedCount}
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      if (isEditing) {
                                        if (nameDraft[valve._id] !== undefined) {
                                          dispatch(
                                            updateValve({
                                              valveId: valve._id,
                                              data: {
                                                position: {
                                                  flowOrder: valve.position?.flowOrder ?? 0,
                                                  zone: nameDraft[valve._id],
                                                },
                                              },
                                            })
                                          );
                                        }
                                        setEditingValve(null);
                                      } else {
                                        setEditingValve(valve._id);
                                      }
                                    }}
                                  >
                                    {isEditing ? (
                                      <Save className="h-3.5 w-3.5 text-brand-400" />
                                    ) : (
                                      <Pencil className="h-3 w-3" />
                                    )}
                                  </Button>
                                  {isEditing && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setEditingValve(null)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Pressure gauge + controls row */}
                              <div className="flex items-center gap-3">
                                {/* Mini pressure gauge */}
                                <div className="shrink-0 flex flex-col items-center">
                                  <PressureMeter value={pressure} max={maxPressure} small />
                                  <p className="text-[9px] text-muted-foreground -mt-0.5">
                                    {flowRate.toFixed(1)} GPM
                                  </p>
                                </div>

                                {/* Control area */}
                                <div className="min-w-0 flex-1 space-y-2">
                                  {globalMode === 'MANUAL' ? (
                                    <>
                                      {/* ON / OFF / PULSE — three relay commands */}
                                      <div className="grid grid-cols-3 gap-1.5">
                                        <Button
                                          size="sm"
                                          onClick={() => onValveCommand(valve._id, 'ON')}
                                          disabled={!isOnline || isOn}
                                          className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                                          title="AT+RLN=1 — hold relay HIGH"
                                        >
                                          <Power className="mr-1 h-3 w-3" />
                                          ON
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => onValveCommand(valve._id, 'OFF')}
                                          disabled={!isOnline || !isOn}
                                          className="h-8 disabled:opacity-40"
                                          title="AT+RLN=0 — release relay"
                                        >
                                          <PowerOff className="mr-1 h-3 w-3" />
                                          OFF
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => onValveCommand(valve._id, 'PULSE')}
                                          disabled={!isOnline}
                                          className="h-8 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
                                          title="AT+RLN=2 — firmware-timed pulse (260ms or 1500ms)"
                                        >
                                          <Zap className="mr-1 h-3 w-3" />
                                          PULSE
                                        </Button>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground text-center">
                                        Commands sent as LoRaWAN downlinks
                                      </p>
                                    </>
                                  ) : (
                                    /* AUTO mode — show schedule status */
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 space-y-1">
                                      {currentSchedule ? (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                          <Activity className="h-3 w-3 animate-pulse" />
                                          Running until{' '}
                                          {new Date(currentSchedule.endAt!).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </div>
                                      ) : nextSchedule ? (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                          <Clock3 className="h-3 w-3" />
                                          Next: {formatScheduleTime(nextSchedule.startAt)}{' '}
                                          &bull; {nextSchedule.action}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-center text-muted-foreground">
                                          No upcoming schedules
                                        </p>
                                      )}
                                      <p className="text-[10px] text-muted-foreground">
                                        {(valve.schedules || []).filter((s) => s.enabled).length} schedule
                                        {(valve.schedules || []).filter((s) => s.enabled).length !== 1
                                          ? 's'
                                          : ''}{' '}
                                        active
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Edit / Alarm Config panel */}
                              {isEditing && (
                                <div className="border-t border-border/50 pt-2.5 space-y-2.5">
                                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    <Settings2 className="mr-1 inline h-3.5 w-3.5" />
                                    Alarm Config
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                                    <div className="space-y-0.5">
                                      <label className="text-muted-foreground">Rule</label>
                                      <select
                                        value={alarmForm.ruleType}
                                        onChange={(e) =>
                                          setAlarmDraft((p) => ({
                                            ...p,
                                            [valve._id]: {
                                              ...alarmForm,
                                              ruleType: e.target.value as 'THRESHOLD' | 'STATUS',
                                            },
                                          }))
                                        }
                                        className="w-full rounded border border-border/60 bg-background px-1.5 py-1 dark:[color-scheme:dark]"
                                      >
                                        <option value="STATUS">Status</option>
                                        <option value="THRESHOLD">Threshold</option>
                                      </select>
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-muted-foreground">Severity</label>
                                      <select
                                        value={alarmForm.severity || 'WARNING'}
                                        onChange={(e) =>
                                          setAlarmDraft((p) => ({
                                            ...p,
                                            [valve._id]: {
                                              ...alarmForm,
                                              severity: e.target.value as AlarmSeverity,
                                            },
                                          }))
                                        }
                                        className="w-full rounded border border-border/60 bg-background px-1.5 py-1 dark:[color-scheme:dark]"
                                      >
                                        <option value="INFO">Info</option>
                                        <option value="WARNING">Warning</option>
                                        <option value="CRITICAL">Critical</option>
                                      </select>
                                    </div>

                                    {alarmForm.ruleType === 'STATUS' ? (
                                      <div className="space-y-0.5 col-span-2">
                                        <label className="text-muted-foreground">Trigger On</label>
                                        <select
                                          value={alarmForm.triggerStatus || 'FAULT'}
                                          onChange={(e) =>
                                            setAlarmDraft((p) => ({
                                              ...p,
                                              [valve._id]: {
                                                ...alarmForm,
                                                triggerStatus: e.target.value as 'FAULT' | 'OFF',
                                              },
                                            }))
                                          }
                                          className="w-full rounded border border-border/60 bg-background px-1.5 py-1 dark:[color-scheme:dark]"
                                        >
                                          <option value="FAULT">FAULT</option>
                                          <option value="OFF">OFF</option>
                                        </select>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="space-y-0.5">
                                          <label className="text-muted-foreground">Operator</label>
                                          <select
                                            value={alarmForm.operator}
                                            onChange={(e) =>
                                              setAlarmDraft((p) => ({
                                                ...p,
                                                [valve._id]: {
                                                  ...alarmForm,
                                                  operator: e.target.value as ValveAlarmConfig['operator'],
                                                },
                                              }))
                                            }
                                            className="w-full rounded border border-border/60 bg-background px-1.5 py-1 dark:[color-scheme:dark]"
                                          >
                                            {(['>', '<', '>=', '<=', '==', '!='] as const).map((op) => (
                                              <option key={op}>{op}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-0.5">
                                          <label className="text-muted-foreground">Threshold</label>
                                          <input
                                            type="number"
                                            value={alarmForm.threshold ?? 0}
                                            onChange={(e) =>
                                              setAlarmDraft((p) => ({
                                                ...p,
                                                [valve._id]: {
                                                  ...alarmForm,
                                                  threshold: Number(e.target.value),
                                                },
                                              }))
                                            }
                                            className="w-full rounded border border-border/60 bg-background px-1.5 py-1"
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={alarmForm.enabled}
                                        onChange={(e) =>
                                          setAlarmDraft((p) => ({
                                            ...p,
                                            [valve._id]: { ...alarmForm, enabled: e.target.checked },
                                          }))
                                        }
                                      />
                                      Enable
                                    </label>
                                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={alarmForm.notify}
                                        onChange={(e) =>
                                          setAlarmDraft((p) => ({
                                            ...p,
                                            [valve._id]: { ...alarmForm, notify: e.target.checked },
                                          }))
                                        }
                                      />
                                      Notify
                                    </label>
                                    <Button
                                      size="sm"
                                      className="ml-auto h-7 text-xs"
                                      onClick={() => handleSaveAlarmConfig(valve)}
                                    >
                                      <Save className="mr-1 h-3 w-3" />
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </div>

              {/* ─────────────────────────────────────────────
                  CARD 2 — Device Telemetry + System Monitor
              ───────────────────────────────────────────── */}
              <div className="space-y-4">

                {/* Device Telemetry */}
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-brand-500" />
                    Device Telemetry
                    {telemetry && (
                      <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                        {formatRelativeTime(telemetry.receivedAt)}
                      </span>
                    )}
                  </h3>

                  {/* LoRa connection status */}
                  <div
                    className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                      isOnline
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-slate-500/10 border border-slate-500/20'
                    }`}
                  >
                    <span className="font-medium">LoRaWAN Class C</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isOnline ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {isOnline ? 'Connected' : 'Offline'}
                    </span>
                  </div>

                  {!telemetry ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      <Wifi className="mx-auto mb-2 h-6 w-6 opacity-20" />
                      Waiting for device uplink…
                      <p className="mt-1 opacity-60">Uplinks every ~3 minutes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Pressure sensors PT1 / PT2 */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'PT1', value: telemetry.pt1 },
                          { label: 'PT2', value: telemetry.pt2 },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-secondary/50 p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p className="text-lg font-bold">
                              {value != null ? value.toFixed(1) : '—'}
                            </p>
                            <p className="text-[9px] text-muted-foreground">PSI</p>
                          </div>
                        ))}
                      </div>

                      {/* Battery */}
                      {telemetry.battery != null && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Battery</span>
                            <span className="font-medium">{telemetry.battery}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                telemetry.battery < 20
                                  ? 'bg-red-500'
                                  : telemetry.battery < 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, telemetry.battery)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Solar + Tamper row */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-secondary/40 px-2 py-1.5">
                          <p className="text-muted-foreground">Solar</p>
                          <p className="font-medium">
                            {telemetry.solar != null ? `${telemetry.solar.toFixed(1)} V` : '—'}
                          </p>
                        </div>
                        <div
                          className={`rounded-lg px-2 py-1.5 ${
                            telemetry.tamper
                              ? 'border border-red-500/30 bg-red-500/10'
                              : 'bg-secondary/40'
                          }`}
                        >
                          <p className="text-muted-foreground">Tamper</p>
                          <p
                            className={`font-medium ${
                              telemetry.tamper ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {telemetry.tamper ? 'ALERT' : 'Clear'}
                          </p>
                        </div>
                      </div>

                      {/* RSSI / SNR */}
                      {(telemetry.rssi != null || telemetry.snr != null) && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          {telemetry.rssi != null && <span>RSSI: {telemetry.rssi} dBm</span>}
                          {telemetry.snr != null && <span>SNR: {telemetry.snr} dB</span>}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* System Monitor */}
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Gauge className="h-4 w-4 text-brand-500" />
                    System Monitor
                  </h3>

                  <div className="mb-3 space-y-1.5 text-sm">
                    {[
                      ['Total Cycles', selectedManifold.metadata.totalCycles.toLocaleString()],
                      ['Active Valves', `${activeValveCount} / ${manifoldValves.length}`],
                      ['Active Alarms', activeAlarms.filter((a) => !a.acknowledged).length],
                      ['Mode', globalMode],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between">
                        <span className="text-muted-foreground">{k}</span>
                        <span
                          className={
                            k === 'Mode'
                              ? globalMode === 'AUTO'
                                ? 'font-medium text-amber-400'
                                : 'font-medium text-brand-400'
                              : k === 'Active Alarms' && Number(v) > 0
                              ? 'font-medium text-red-400'
                              : ''
                          }
                        >
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* System pressure gauges */}
                  <div className="flex items-center justify-around border-t border-border/40 pt-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <PressureMeter value={simulation.pressures.inlet} max={maxPressure} small />
                      <span className="text-[10px] text-muted-foreground">Inlet</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <PressureMeter
                        value={simulation.pressures.distribution}
                        max={maxPressure}
                        small
                      />
                      <span className="text-[10px] text-muted-foreground">Distribution</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    <Zap className="mr-1.5 inline h-3 w-3 text-brand-400" />
                    {isOnline ? 'LoRaWAN Class C — always listening' : 'Device offline'} &bull;{' '}
                    {selectedManifold.status}
                  </div>
                </Card>

                {/* Installation & Specs (compact) */}
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-brand-500" />
                    Installation
                  </h3>
                  <p className="text-sm">
                    {selectedManifold.installationDetails.location || 'Not specified'}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(
                      selectedManifold.installationDetails.installationDate
                    ).toLocaleDateString()}
                  </p>
                  <div className="mt-3 space-y-1 text-xs">
                    {[
                      ['Max Pressure', `${selectedManifold.specifications.maxPressure} PSI`],
                      ['Max Flow', `${selectedManifold.specifications.maxFlowRate} GPM`],
                      ['Model', selectedManifold.specifications.model],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground">{k}</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Device Navigation */}
                  <div className="mt-3 border-t border-border/40 pt-3 space-y-2">
                    {typeof selectedManifold.esp32DeviceId === 'object' && selectedManifold.esp32DeviceId && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Device</span>
                        <span className="font-medium truncate max-w-[120px]">
                          {(selectedManifold.esp32DeviceId as { name: string }).name}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => router.push('/devices')}
                      >
                        <Network className="mr-1 h-3 w-3" />
                        Devices
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => router.push('/ttn')}
                      >
                        <Radio className="mr-1 h-3 w-3" />
                        LoRaWAN
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* LoRaWAN Node Card */}
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Radio className="h-4 w-4 text-violet-500" />
                      LoRaWAN Node
                    </h3>
                    {selectedTTNDevice && (
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${ttnIsOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${ttnIsOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                        {ttnIsOnline ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Application selector */}
                    <select
                      value={ttnAppId}
                      onChange={(e) => handleTTNAppChange(e.target.value)}
                      className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs dark:[color-scheme:dark]"
                    >
                      <option value="">Select TTN application…</option>
                      {ttnApps.map((app) => (
                        <option key={app._id} value={app._id}>{app.name}</option>
                      ))}
                    </select>

                    {/* Device selector */}
                    {ttnAppId && (
                      <select
                        value={ttnDeviceId}
                        onChange={(e) => handleTTNDeviceChange(e.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs dark:[color-scheme:dark]"
                      >
                        <option value="">Select device…</option>
                        {ttnDevices.map((d) => (
                          <option key={d._id} value={d._id}>{d.displayName || d.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Device info when selected */}
                  {selectedTTNDevice && (
                    <div className="mt-3 space-y-2">
                      {/* Signal quality */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="rounded-lg bg-secondary/50 px-2 py-1.5 text-center">
                          <p className="text-muted-foreground">RSSI</p>
                          <p className={`font-bold font-mono ${
                            selectedTTNDevice.metrics.avgRssi == null ? 'text-muted-foreground' :
                            selectedTTNDevice.metrics.avgRssi >= -75 ? 'text-emerald-400' :
                            selectedTTNDevice.metrics.avgRssi >= -90 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {selectedTTNDevice.metrics.avgRssi != null
                              ? `${selectedTTNDevice.metrics.avgRssi.toFixed(0)} dBm`
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 px-2 py-1.5 text-center">
                          <p className="text-muted-foreground">SNR</p>
                          <p className="font-bold font-mono text-foreground">
                            {selectedTTNDevice.metrics.avgSnr != null
                              ? `${selectedTTNDevice.metrics.avgSnr.toFixed(1)} dB`
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Uplinks / last seen row */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/30 pt-2">
                        <span>
                          <Signal className="mr-1 inline h-3 w-3" />
                          {selectedTTNDevice.metrics.totalUplinks} uplinks
                        </span>
                        <span>
                          {selectedTTNDevice.lastSeen
                            ? `${formatRelativeTime(selectedTTNDevice.lastSeen)}`
                            : 'Never seen'}
                        </span>
                      </div>

                      {/* Last decoded payload */}
                      {selectedTTNDevice.lastUplink?.decodedPayload && (
                        <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 px-2 py-1.5 text-[10px]">
                          <p className="text-muted-foreground mb-1">Last Payload</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(selectedTTNDevice.lastUplink.decodedPayload).slice(0, 4).map(([k, v]) => (
                              <span key={k} className="rounded bg-violet-500/10 px-1.5 py-0.5 font-mono text-violet-300">
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Send Downlink */}
                      <div className="border-t border-border/30 pt-2 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Send Downlink</p>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={223}
                            value={downlinkForm.fPort}
                            onChange={(e) => setDownlinkForm((p) => ({ ...p, fPort: Number(e.target.value) }))}
                            className="w-12 rounded border border-border/60 bg-background px-1.5 py-1 text-xs text-center"
                            placeholder="Port"
                            title="fPort (1–223)"
                          />
                          <input
                            type="text"
                            value={downlinkForm.payload}
                            onChange={(e) => setDownlinkForm((p) => ({ ...p, payload: e.target.value }))}
                            placeholder="Base64 payload…"
                            className="min-w-0 flex-1 rounded border border-border/60 bg-background px-1.5 py-1 text-xs font-mono"
                          />
                        </div>
                        <Button
                          size="sm"
                          className={`w-full h-7 text-xs ${
                            downlinkResult === 'ok'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : downlinkResult === 'err'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-violet-600 hover:bg-violet-700'
                          }`}
                          onClick={handleSendDownlink}
                          disabled={sendingDownlink || !downlinkForm.payload.trim()}
                        >
                          {sendingDownlink ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="mr-1 h-3 w-3" />
                          )}
                          {downlinkResult === 'ok' ? 'Sent!' : downlinkResult === 'err' ? 'Failed' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!ttnAppId && ttnApps.length === 0 && (
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                      No TTN applications configured.{' '}
                      <button
                        onClick={() => router.push('/ttn')}
                        className="text-violet-400 underline"
                      >
                        Add one
                      </button>
                    </p>
                  )}
                </Card>

              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              SCHEDULE & ALARMS TAB
          ════════════════════════════════════════════════ */}
          {activeTab === 'scheduling' && (
            <div className="space-y-4">
              {/* Sub-tab bar */}
              <div className="flex flex-wrap gap-1.5 border-b border-border/40 pb-3">
                {(
                  [
                    { id: 'schedules', label: 'Schedule', icon: Clock3 },
                    { id: 'history', label: 'Scheduling History', icon: History },
                    {
                      id: 'alarms',
                      label: 'Alarms',
                      icon: ShieldAlert,
                      badge: activeAlarms.filter((a) => !a.acknowledged).length || undefined,
                    },
                    {
                      id: 'alarm-history',
                      label: 'Alarm History',
                      icon: Bell,
                      badge: alarmHistory.length || undefined,
                    },
                    { id: 'lorawan', label: 'LoRaWAN Uplinks', icon: Radio },
                  ] as Array<{ id: string; label: string; icon: React.ElementType; badge?: number }>
                ).map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => setSchedulingTab(id as SchedulingTab)}
                    className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      schedulingTab === id
                        ? 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {badge && badge > 0 ? (
                      <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* ── Schedules ── */}
              {schedulingTab === 'schedules' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  {/* Add/Edit form */}
                  <div className="lg:col-span-2">
                    <Card className="space-y-4 p-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Clock3 className="h-4 w-4 text-brand-500" />
                        {scheduleEditId ? 'Edit Schedule' : 'Add Schedule'}
                      </h3>

                      <div className="space-y-3">
                        {/* Valve selector */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Valve</label>
                          <select
                            value={scheduleValveId}
                            onChange={(e) => setScheduleValveId(e.target.value)}
                            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm dark:[color-scheme:dark]"
                          >
                            {[...manifoldValves]
                              .sort((a, b) => a.valveNumber - b.valveNumber)
                              .map((v) => (
                                <option key={v._id} value={v._id}>
                                  {v.position?.zone || `Valve ${v.valveNumber}`} (GPIO{' '}
                                  {v.esp32PinNumber})
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Action — ON turns relay ON at startAt, OFF releases at endAt */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Action at Start Time
                          </label>
                          <select
                            value={scheduleDraft.action}
                            onChange={(e) =>
                              setScheduleDraft((p) => ({
                                ...p,
                                action: e.target.value as 'ON' | 'OFF',
                              }))
                            }
                            className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm dark:[color-scheme:dark]"
                          >
                            <option value="ON">Turn ON (relay HIGH)</option>
                            <option value="OFF">Turn OFF (relay LOW)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Start Time</label>
                          <input
                            type="datetime-local"
                            value={scheduleDraft.startAt}
                            onChange={(e) =>
                              setScheduleDraft((p) => ({ ...p, startAt: e.target.value }))
                            }
                            className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm text-foreground dark:[color-scheme:dark]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">End Time</label>
                          <input
                            type="datetime-local"
                            value={scheduleDraft.endAt}
                            onChange={(e) =>
                              setScheduleDraft((p) => ({ ...p, endAt: e.target.value }))
                            }
                            className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm text-foreground dark:[color-scheme:dark]"
                          />
                        </div>

                        {/* Computed duration (readonly) */}
                        {scheduleDraft.startAt && scheduleDraft.endAt && (
                          <div className="rounded-md bg-secondary/40 px-3 py-2 text-xs">
                            <span className="text-muted-foreground">Run duration: </span>
                            <span className="font-semibold text-brand-400">
                              {formatDuration(
                                new Date(scheduleDraft.startAt).toISOString(),
                                new Date(scheduleDraft.endAt).toISOString()
                              ) || 'Invalid range'}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              (ON at start → OFF at end via LoRa downlinks)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={handleAddOrUpdateSchedule}
                          disabled={
                            !scheduleDraft.startAt || !scheduleDraft.endAt || !scheduleValveId
                          }
                        >
                          <Save className="mr-1.5 h-4 w-4" />
                          {scheduleEditId ? 'Update' : 'Add Schedule'}
                        </Button>
                        {scheduleEditId && (
                          <Button variant="outline" onClick={resetScheduleDraft}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {globalMode === 'MANUAL' && (
                        <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                          Switch to AUTO mode to enable scheduled execution
                        </p>
                      )}
                    </Card>
                  </div>

                  {/* Schedule list */}
                  <div className="space-y-3 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">All Schedules</h3>
                    {manifoldValves.every((v) => (v.schedules || []).length === 0) ? (
                      <Card className="p-10 text-center text-muted-foreground">
                        <Clock3 className="mx-auto mb-2 h-8 w-8 opacity-20" />
                        <p className="text-sm">No schedules configured</p>
                        <p className="mt-1 text-xs">Use the form to add a schedule</p>
                      </Card>
                    ) : (
                      [...manifoldValves]
                        .filter((v) => (v.schedules || []).length > 0)
                        .sort((a, b) => a.valveNumber - b.valveNumber)
                        .map((valve) => (
                          <Card key={valve._id} className="p-3">
                            <p className="mb-2 text-xs font-semibold text-muted-foreground">
                              {valve.position?.zone || `Valve ${valve.valveNumber}`}
                            </p>
                            <div className="space-y-2">
                              {valve.schedules.map((schedule) => {
                                const dur = formatDuration(schedule.startAt, schedule.endAt);
                                return (
                                  <div
                                    key={schedule.scheduleId}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2"
                                  >
                                    <div className="min-w-0 text-xs">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={
                                            schedule.action === 'ON'
                                              ? 'border-emerald-500/30 text-emerald-400'
                                              : 'border-slate-500/30 text-slate-400'
                                          }
                                        >
                                          {schedule.action}
                                        </Badge>
                                        <Badge
                                          variant={schedule.enabled ? 'default' : 'secondary'}
                                          className="text-[10px]"
                                        >
                                          {schedule.enabled ? 'Active' : 'Disabled'}
                                        </Badge>
                                        {dur && (
                                          <span className="text-muted-foreground">{dur}</span>
                                        )}
                                      </div>
                                      <p className="mt-1 truncate text-muted-foreground">
                                        {schedule.startAt && schedule.endAt
                                          ? `${new Date(schedule.startAt).toLocaleString()} → ${new Date(schedule.endAt).toLocaleString()}`
                                          : schedule.cronExpression || 'Time range not set'}
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        title="Edit"
                                        onClick={() => {
                                          setScheduleValveId(valve._id);
                                          setScheduleEditId(schedule.scheduleId);
                                          setScheduleDraft({
                                            action: schedule.action,
                                            startAt: toDateTimeLocal(schedule.startAt),
                                            endAt: toDateTimeLocal(schedule.endAt),
                                          });
                                        }}
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        title={schedule.enabled ? 'Disable' : 'Enable'}
                                        onClick={() =>
                                          dispatch(
                                            updateSchedule({
                                              valveId: valve._id,
                                              scheduleId: schedule.scheduleId,
                                              data: { enabled: !schedule.enabled },
                                            })
                                          )
                                        }
                                      >
                                        {schedule.enabled ? (
                                          <BellOff className="h-3 w-3" />
                                        ) : (
                                          <Bell className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-400"
                                        title="Delete"
                                        onClick={() =>
                                          dispatch(
                                            deleteSchedule({
                                              valveId: valve._id,
                                              scheduleId: schedule.scheduleId,
                                            })
                                          )
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </Card>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* ── Scheduling History ── */}
              {schedulingTab === 'history' && (
                <Card className="overflow-hidden p-0">
                  <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                    <History className="h-4 w-4 text-brand-500" />
                    <h3 className="text-sm font-semibold">Scheduling History</h3>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Schedules with past end times
                    </span>
                  </div>
                  <div className="p-4">
                    {(() => {
                      const completed = manifoldValves.flatMap((v) =>
                        (v.schedules || [])
                          .filter((s) => s.endAt && new Date(s.endAt) < new Date())
                          .map((s) => ({
                            ...s,
                            valveName: v.position?.zone || `Valve ${v.valveNumber}`,
                          }))
                      );
                      if (completed.length === 0) {
                        return (
                          <div className="py-12 text-center text-muted-foreground">
                            <History className="mx-auto mb-2 h-8 w-8 opacity-20" />
                            <p className="text-sm">No completed schedules yet</p>
                          </div>
                        );
                      }
                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/50 text-left text-muted-foreground">
                                <th className="pb-2 pr-4 font-medium">Valve</th>
                                <th className="pb-2 pr-4 font-medium">Action</th>
                                <th className="pb-2 pr-4 font-medium">Duration</th>
                                <th className="pb-2 pr-4 font-medium">Started</th>
                                <th className="pb-2 font-medium">Ended</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {completed
                                .sort(
                                  (a, b) =>
                                    new Date(b.endAt!).getTime() -
                                    new Date(a.endAt!).getTime()
                                )
                                .map((s) => (
                                  <tr key={s.scheduleId} className="hover:bg-secondary/20">
                                    <td className="py-2 pr-4">{s.valveName}</td>
                                    <td className="py-2 pr-4">
                                      <Badge
                                        variant="outline"
                                        className={
                                          s.action === 'ON'
                                            ? 'border-emerald-500/30 text-emerald-400'
                                            : 'border-slate-500/30 text-slate-400'
                                        }
                                      >
                                        {s.action}
                                      </Badge>
                                    </td>
                                    <td className="py-2 pr-4">
                                      {formatDuration(s.startAt, s.endAt) || '—'}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {s.startAt
                                        ? new Date(s.startAt).toLocaleString()
                                        : '—'}
                                    </td>
                                    <td className="py-2 text-muted-foreground">
                                      {s.endAt ? new Date(s.endAt).toLocaleString() : '—'}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              )}

              {/* ── Alarms ── */}
              {schedulingTab === 'alarms' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      ['ALL', 'CRITICAL', 'WARNING', 'INFO', 'UNACKED'] as const
                    ).map((f) => {
                      const count =
                        f === 'ALL'
                          ? activeAlarms.length
                          : f === 'UNACKED'
                          ? activeAlarms.filter((a) => !a.acknowledged).length
                          : activeAlarms.filter((a) => a.severity === f).length;
                      return (
                        <button
                          key={f}
                          onClick={() => setAlarmFilter(f)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            alarmFilter === f
                              ? f === 'CRITICAL'
                                ? 'bg-red-500 text-white'
                                : f === 'WARNING'
                                ? 'bg-amber-500 text-white'
                                : f === 'INFO'
                                ? 'bg-blue-500 text-white'
                                : 'bg-brand-500 text-white'
                              : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {f === 'UNACKED' ? 'Unacknowledged' : f} ({count})
                        </button>
                      );
                    })}
                    {activeAlarms.filter((a) => !a.acknowledged).length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() => {
                          activeAlarms
                            .filter((a) => !a.acknowledged)
                            .forEach((a) =>
                              dispatch(acknowledgeAlarm({ valveId: a.valveId, alarmId: a.alarmId }))
                            );
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Acknowledge All
                      </Button>
                    )}
                  </div>

                  {filteredActiveAlarms.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground">
                      <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500 opacity-20" />
                      <p className="font-medium">No active alarms</p>
                      <p className="mt-1 text-xs">All systems operating normally</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {filteredActiveAlarms.map((alarm) => (
                        <Card
                          key={alarm.alarmId}
                          className={`border-l-4 p-4 ${
                            alarm.severity === 'CRITICAL'
                              ? 'border-l-red-500 bg-red-500/5'
                              : alarm.severity === 'WARNING'
                              ? 'border-l-amber-500 bg-amber-500/5'
                              : 'border-l-blue-500 bg-blue-500/5'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              {alarm.severity === 'CRITICAL' ? (
                                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                              ) : alarm.severity === 'WARNING' ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              ) : (
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <SeverityBadge severity={alarm.severity} />
                                  <span className="text-xs text-muted-foreground">
                                    {alarm.valveName}
                                  </span>
                                  {alarm.acknowledged && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Acknowledged
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm">{alarm.message}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {new Date(alarm.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {!alarm.acknowledged && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs"
                                  onClick={() =>
                                    dispatch(
                                      acknowledgeAlarm({
                                        valveId: alarm.valveId,
                                        alarmId: alarm.alarmId,
                                      })
                                    )
                                  }
                                >
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                  Acknowledge
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-emerald-400 hover:border-emerald-500/50 hover:text-emerald-400"
                                onClick={() =>
                                  dispatch(
                                    resolveAlarm({
                                      valveId: alarm.valveId,
                                      alarmId: alarm.alarmId,
                                    })
                                  )
                                }
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Resolve
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── LoRaWAN Uplinks ── */}
              {schedulingTab === 'lorawan' && (
                <div className="space-y-4">
                  {!selectedTTNDevice ? (
                    <Card className="p-12 text-center text-muted-foreground">
                      <Radio className="mx-auto mb-3 h-8 w-8 opacity-20" />
                      <p className="text-sm font-medium">No LoRaWAN device linked</p>
                      <p className="mt-1 text-xs opacity-70">
                        Select a TTN application and device in the Control Panel → LoRaWAN Node card.
                      </p>
                    </Card>
                  ) : (
                    <>
                      {/* Device summary header */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${ttnIsOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                          <span className="text-sm font-semibold">{selectedTTNDevice.displayName || selectedTTNDevice.name}</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">{selectedTTNDevice.devEui}</span>
                        <Badge variant="outline" className={ttnIsOnline ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-500/30 text-slate-400'}>
                          {ttnIsOnline ? 'Online' : 'Offline'}
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground">{selectedTTNDevice.metrics.totalUplinks} total uplinks</span>
                      </div>

                      {/* Uplinks table */}
                      {ttnUplinks.length === 0 ? (
                        <Card className="p-10 text-center text-muted-foreground">
                          <Activity className="mx-auto mb-2 h-6 w-6 opacity-20" />
                          <p className="text-sm">No uplinks recorded yet</p>
                        </Card>
                      ) : (
                        <Card className="overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border/40 bg-muted/20">
                                  {['Time', 'RSSI', 'SNR', 'SF', 'Freq (MHz)', 'Port', 'Payload', 'Decoded'].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/20">
                                {ttnUplinks.map((uplink) => (
                                  <tr key={uplink._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                                      {formatRelativeTime(uplink.receivedAt)}
                                    </td>
                                    <td className={`whitespace-nowrap px-3 py-2 text-xs font-mono font-semibold ${
                                      uplink.rssi >= -75 ? 'text-emerald-400' :
                                      uplink.rssi >= -90 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                      {uplink.rssi} dBm
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-xs font-mono text-muted-foreground">
                                      {uplink.snr} dB
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                                      SF{uplink.spreadingFactor}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-xs font-mono text-muted-foreground">
                                      {uplink.frequency ? (uplink.frequency / 1e6).toFixed(1) : '—'}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                                      {uplink.fPort}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-[10px] font-mono text-muted-foreground max-w-[80px] truncate">
                                      {uplink.rawPayload || '—'}
                                    </td>
                                    <td className="px-3 py-2 text-[10px]">
                                      {uplink.decodedPayload ? (
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(uplink.decodedPayload).slice(0, 3).map(([k, v]) => (
                                            <span key={k} className="rounded bg-violet-500/10 px-1 py-0.5 font-mono text-violet-300 whitespace-nowrap">
                                              {k}:{String(v)}
                                            </span>
                                          ))}
                                        </div>
                                      ) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      )}

                      {/* Refresh button */}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5"
                          onClick={() => {
                            if (selectedTTNApp && selectedTTNDevice) {
                              dispatch(fetchTTNUplinks({
                                applicationId: selectedTTNApp.applicationId,
                                deviceId: selectedTTNDevice.deviceId,
                                limit: 30,
                              }));
                            }
                          }}
                        >
                          <Activity className="h-3.5 w-3.5" />
                          Refresh Uplinks
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Alarm History ── */}
              {schedulingTab === 'alarm-history' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Bell className="h-4 w-4" />
                      Alarm History
                    </h3>
                    <Badge variant="secondary">{alarmHistory.length}</Badge>
                  </div>
                  {alarmHistory.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground">
                      <Bell className="mx-auto mb-2 h-8 w-8 opacity-20" />
                      <p className="text-sm">No alarm history yet</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {alarmHistory.map((alarm) => (
                        <Card key={alarm.alarmId} className="p-3 opacity-75 transition-opacity hover:opacity-100">
                          <div className="flex items-start gap-3">
                            <SeverityBadge severity={alarm.severity} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium">{alarm.valveName}</span>
                                {alarm.resolved ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                                    <XCircle className="h-3 w-3" />
                                    Resolved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Acknowledged
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm">{alarm.message}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Triggered: {new Date(alarm.timestamp).toLocaleString()}
                                {alarm.acknowledgedAt &&
                                  ` · Acked: ${new Date(alarm.acknowledgedAt).toLocaleString()}`}
                                {alarm.resolvedAt &&
                                  ` · Resolved: ${new Date(alarm.resolvedAt).toLocaleString()}`}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

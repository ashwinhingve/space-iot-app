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
  fetchTTNDownlinks,
  fetchTTNGateways,
  fetchTTNUplinks,
  sendTTNDownlink,
  TTNDevice as TTNDeviceType,
  TTNDownlink,
  TTNGateway,
} from '@/store/slices/ttnSlice';
import { AppDispatch, RootState } from '@/store/store';
import { createAuthenticatedSocket } from '@/lib/socket';
import { API_ENDPOINTS } from '@/lib/config';
import { useSocketTTN } from '@/hooks/useSocketTTN';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  BellOff,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Clock3,
  Edit3,
  Gauge,
  History,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  MapPin,
  Network,
  Pencil,
  Power,
  PowerOff,
  Radio,
  RefreshCw,
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
type MainTab = 'control' | 'scheduling' | 'lorawan';
type SchedulingTab = 'schedules' | 'history' | 'alarms' | 'alarm-history';
type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
type ValveAction = 'ON' | 'OFF' | 'PULSE';

type AlarmType = 'COMM_LOSS' | 'LOW_PRESSURE' | 'HIGH_PRESSURE' | 'VALVE_FAULT' |
                 'IO_FAULT' | 'DEVICE_OFFLINE' | 'BATTERY_LOW' | 'SENSOR_FAULT' |
                 'THRESHOLD_BREACH' | 'TAMPER' | 'MANUAL';

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
  alarmType?: AlarmType;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// IO Payload Builder helper (3-byte SCADA protocol)
// Byte 0: 0x01 (IO control), Byte 1: IO number, Byte 2: state
// ──────────────────────────────────────────────────────────────
function buildIOPayload(io: number, state: 'ON' | 'OFF' | 'PULSE'): string {
  const stateVal = state === 'ON' ? 0x01 : state === 'OFF' ? 0x00 : 0x02;
  const bytes = new Uint8Array([0x01, io, stateVal]);
  return btoa(String.fromCharCode(...bytes));
}

function ioPayloadHex(io: number, state: 'ON' | 'OFF' | 'PULSE'): string {
  const stateVal = state === 'ON' ? 0x01 : state === 'OFF' ? 0x00 : 0x02;
  return `01 ${io.toString(16).padStart(2, '0').toUpperCase()} 0${stateVal}`;
}

// ──────────────────────────────────────────────────────────────
// Alarm type icon resolver
// ──────────────────────────────────────────────────────────────
function AlarmTypeIcon({ alarmType, className }: { alarmType?: AlarmType; className?: string }) {
  const cls = className || 'h-4 w-4 shrink-0';
  switch (alarmType) {
    case 'COMM_LOSS':
    case 'DEVICE_OFFLINE':
      return <WifiOff className={`${cls} text-red-500`} />;
    case 'LOW_PRESSURE':
    case 'HIGH_PRESSURE':
      return <Gauge className={`${cls} text-amber-500`} />;
    case 'VALVE_FAULT':
    case 'IO_FAULT':
      return <AlertOctagon className={`${cls} text-red-500`} />;
    case 'BATTERY_LOW':
      return <Zap className={`${cls} text-amber-500`} />;
    case 'SENSOR_FAULT':
      return <Activity className={`${cls} text-orange-500`} />;
    case 'TAMPER':
      return <ShieldAlert className={`${cls} text-red-500`} />;
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────
// SCADA Status Chip — compact status indicator pill
// ──────────────────────────────────────────────────────────────
type ChipStatus = 'ok' | 'warn' | 'fault' | 'offline';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StatusChip({
  label,
  value,
  chipStatus,
  icon: Icon,
}: {
  label: string;
  value: string;
  chipStatus: ChipStatus;
  icon?: React.ElementType;
}) {
  const cfg: Record<ChipStatus, { cls: string; dot: string }> = {
    ok:      { cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-500 animate-pulse' },
    warn:    { cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400',       dot: 'bg-amber-500' },
    fault:   { cls: 'border-red-500/30 bg-red-500/10 text-red-400',             dot: 'bg-red-500 animate-pulse' },
    offline: { cls: 'border-border/40 bg-secondary/40 text-muted-foreground',   dot: 'bg-slate-500' },
  };
  const { cls, dot } = cfg[chipStatus];
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="text-muted-foreground font-normal">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Signal Bars — 4-bar SVG signal strength indicator
// ──────────────────────────────────────────────────────────────
function SignalBars({ rssi, size = 'md' }: { rssi: number | null; size?: 'sm' | 'md' }) {
  const strength = rssi == null ? 0 : rssi >= -70 ? 4 : rssi >= -80 ? 3 : rssi >= -90 ? 2 : 1;
  const color = rssi == null ? '#374151'
    : rssi >= -75 ? '#10b981'
    : rssi >= -90 ? '#f59e0b'
    : '#ef4444';
  const W = size === 'sm' ? 22 : 30;
  const H = size === 'sm' ? 14 : 18;
  const BW = size === 'sm' ? 4 : 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={size === 'sm' ? 'h-auto w-5' : 'h-auto w-8'}>
      {[1, 2, 3, 4].map((i) => (
        <rect key={i} x={(i - 1) * (BW + 1)} y={H - (i / 4) * H}
          width={BW} height={(i / 4) * H} rx="0.5"
          fill={i <= strength ? color : '#1f2937'} />
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Pressure Meter — SCADA semicircle arc gauge (reusable)
// Accepts null to show a "no data" idle state.
// ──────────────────────────────────────────────────────────────
function PressureMeter({
  value,
  max = 100,
  unit = 'PSI',
  small = false,
}: {
  value: number | null;
  max: number;
  unit?: string;
  small?: boolean;
}) {
  const hasData = value != null;
  const pct = hasData ? Math.min(1, Math.max(0, value! / max)) : 0;
  const color = !hasData ? '#374151' : pct < 0.4 ? '#10b981' : pct < 0.7 ? '#f59e0b' : '#ef4444';

  // Geometry scales with `small`
  const CX = 40, CY = 38, R = small ? 28 : 34;
  const W = 80, H = small ? 54 : 62;
  const sw = small ? 5 : 7;
  const fs = small ? 11 : 13;

  const angle = Math.PI * (1 - pct);
  const ex = +(CX + R * Math.cos(angle)).toFixed(2);
  const ey = +(CY - R * Math.sin(angle)).toFixed(2);
  const bgPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const fillPath =
    hasData && pct > 0.005
      ? `M ${CX - R} ${CY} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${ex} ${ey}`
      : '';
  const nx = +(CX + R * 0.65 * Math.cos(angle)).toFixed(2);
  const ny = +(CY - R * 0.65 * Math.sin(angle)).toFixed(2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={small ? 'h-auto w-16' : 'h-auto w-20'}>
      {/* Background arc */}
      <path d={bgPath} fill="none" stroke="#1f2937" strokeWidth={sw} strokeLinecap="round" />
      {/* Scale marks at 0%, 50%, 100% */}
      {([0, 0.5, 1] as const).map((t, i) => {
        const a = Math.PI * (1 - t);
        const mx1 = +(CX + (R - (small ? 4 : 5)) * Math.cos(a)).toFixed(2);
        const my1 = +(CY - (R - (small ? 4 : 5)) * Math.sin(a)).toFixed(2);
        const mx2 = +(CX + (R + 1) * Math.cos(a)).toFixed(2);
        const my2 = +(CY - (R + 1) * Math.sin(a)).toFixed(2);
        return <line key={i} x1={mx1} y1={my1} x2={mx2} y2={my2} stroke="#374151" strokeWidth="1.5" />;
      })}
      {/* Fill arc */}
      {fillPath && (
        <>
          <path d={fillPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <path d={fillPath} fill="none" stroke={color} strokeWidth={sw - 2} strokeLinecap="round" opacity="0.25" />
        </>
      )}
      {/* Needle — CSS transition for smooth updates */}
      {hasData && (
        <>
          <line
            x1={CX} y1={CY} x2={nx} y2={ny}
            stroke={color} strokeWidth="1.5" strokeLinecap="round"
            style={{ transition: 'x2 0.5s ease, y2 0.5s ease' }}
          />
          <circle cx={CX} cy={CY} r={small ? 2.5 : 3} fill={color} />
          <circle cx={CX} cy={CY} r={small ? 1.5 : 2} fill="#0f172a" />
        </>
      )}
      {/* Center dot (no data) */}
      {!hasData && <circle cx={CX} cy={CY} r={small ? 2 : 2.5} fill="#374151" />}
      {/* Value */}
      <text x={CX} y={CY + (small ? 11 : 13)} textAnchor="middle" fontSize={fs} fontWeight="bold"
        fill={hasData ? '#f9fafb' : '#4b5563'}>
        {hasData ? (value! < 10 ? value!.toFixed(1) : Math.round(value!)) : '—'}
      </text>
      <text x={CX} y={CY + (small ? 20 : 22)} textAnchor="middle" fontSize="7" fill="#6b7280">
        {unit}
      </text>
      {/* Scale labels at arc endpoints (large gauge only) */}
      {!small && (
        <>
          <text x={CX - R + 2} y={CY + 9} textAnchor="start" fontSize="6" fill="#374151">0</text>
          <text x={CX + R - 2} y={CY + 9} textAnchor="end" fontSize="6" fill="#374151">{max}</text>
        </>
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// SCADA Gauge — full-size professional analog/digital gauge
// Used in System Monitor. Accepts null for "no data" state.
// ──────────────────────────────────────────────────────────────
function SCADAGauge({
  value,
  max = 100,
  unit = 'PSI',
  label = '',
}: {
  value: number | null;
  max: number;
  unit?: string;
  label?: string;
}) {
  const CX = 60, CY = 56, R = 42;
  const W = 120, H = 85;
  const SW = 8; // main arc stroke width

  const hasData = value != null;
  const pct = hasData ? Math.min(1, Math.max(0, value! / max)) : 0;
  const color = !hasData
    ? '#374151'
    : pct < 0.4 ? '#10b981'
    : pct < 0.7 ? '#f59e0b'
    : '#ef4444';

  // Point on the arc at percentage t (0=left/0%, 1=right/100%)
  const pt = (t: number, r: number = R): [number, number] => {
    const a = Math.PI * (1 - t);
    return [+(CX + r * Math.cos(a)).toFixed(2), +(CY - r * Math.sin(a)).toFixed(2)];
  };

  // SVG arc path from percentage t1 → t2 (clockwise, going up through top)
  const arc = (t1: number, t2: number, r: number = R): string => {
    const [x1, y1] = pt(t1, r);
    const [x2, y2] = pt(t2, r);
    const large = (t2 - t1) > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  // Needle tip
  const [nx, ny] = pt(pct, R * 0.68);
  // Zone band radius (thin arcs just outside main track)
  const ZR = R + SW / 2 + 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {/* Background track */}
      <path d={arc(0, 1)} fill="none" stroke="#0f172a" strokeWidth={SW + 2} strokeLinecap="round" />
      <path d={arc(0, 1)} fill="none" stroke="#1e293b" strokeWidth={SW} strokeLinecap="round" />

      {/* Colored zone bands */}
      <path d={arc(0, 0.4, ZR)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d={arc(0.4, 0.7, ZR)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <path d={arc(0.7, 1.0, ZR)} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />

      {/* Major tick marks at 0%, 25%, 50%, 75%, 100% */}
      {([0, 0.25, 0.5, 0.75, 1.0] as const).map((t, i) => {
        const [ix, iy] = pt(t, R - SW / 2 - 2);
        const [ox, oy] = pt(t, R + SW / 2 + 1);
        return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#334155" strokeWidth="1.5" />;
      })}

      {/* Minor tick marks at 10% intervals */}
      {([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9] as const).map((t, i) => {
        const [ix, iy] = pt(t, R - SW / 2);
        const [ox, oy] = pt(t, R + SW / 2 - 1);
        return <line key={i} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#1e293b" strokeWidth="1" />;
      })}

      {/* Value fill arc */}
      {hasData && pct > 0.005 && (
        <path d={arc(0, pct)} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      )}

      {/* Pivot glow */}
      {hasData && <circle cx={CX} cy={CY} r="7" fill={color} opacity="0.12" />}

      {/* Needle */}
      {hasData ? (
        <>
          <line x1={CX} y1={CY} x2={nx} y2={ny}
            stroke={color} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: 'all 0.5s ease' }}
          />
          <circle cx={CX} cy={CY} r="5" fill="#0f172a" stroke={color} strokeWidth="2" />
          <circle cx={CX} cy={CY} r="2" fill={color} />
        </>
      ) : (
        <circle cx={CX} cy={CY} r="4" fill="#1e293b" stroke="#374151" strokeWidth="1.5" />
      )}

      {/* Scale endpoint labels */}
      <text x={CX - R + 1} y={CY + 12} textAnchor="middle" fontSize="7" fill="#374151">0</text>
      <text x={CX + R - 1} y={CY + 12} textAnchor="middle" fontSize="7" fill="#374151">{max}</text>

      {/* Digital value (monospace) */}
      <text x={CX} y={CY + 17} textAnchor="middle" fontSize="17" fontWeight="bold"
        fill={hasData ? '#f1f5f9' : '#374151'} fontFamily="ui-monospace,monospace">
        {hasData ? (value! < 10 ? value!.toFixed(1) : Math.round(value!)) : '—'}
      </text>

      {/* Unit */}
      <text x={CX} y={CY + 27} textAnchor="middle" fontSize="8" fill="#64748b">
        {unit}
      </text>

      {/* Label */}
      {label && (
        <text x={CX} y={H - 2} textAnchor="middle" fontSize="8" fill="#475569"
          fontWeight="600" letterSpacing="0.5">
          {label.toUpperCase()}
        </text>
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Schedule status helper — determines if a schedule is upcoming
// ──────────────────────────────────────────────────────────────
function scheduleStatus(schedule: { action: 'ON' | 'OFF'; startAt?: string; endAt?: string; enabled: boolean }):
  'upcoming' | 'expired' | 'disabled' {
  if (!schedule.enabled) return 'disabled';
  const triggerTime = schedule.action === 'ON' ? schedule.startAt : schedule.endAt;
  if (!triggerTime) return 'disabled';
  return new Date(triggerTime) > new Date() ? 'upcoming' : 'expired';
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
  const {
    applications: ttnApps,
    devices: ttnDevices,
    uplinks: ttnUplinks,
    downlinks: ttnDownlinks,
    gateways: ttnGateways,
  } = useSelector((s: RootState) => s.ttn);
  const [ttnAppId, setTtnAppId] = useState<string>('');
  const [ttnDeviceId, setTtnDeviceId] = useState<string>('');
  const [downlinkForm, setDownlinkForm] = useState({ fPort: 1, payload: '' });
  const [sendingDownlink, setSendingDownlink] = useState(false);
  const [downlinkResult, setDownlinkResult] = useState<'ok' | 'err' | null>(null);

  // IO Payload Builder state
  const [ioBuilderIO, setIoBuilderIO] = useState(1);
  const [ioBuilderState, setIoBuilderState] = useState<'ON' | 'OFF' | 'PULSE'>('ON');

  // Export / download state
  const [dlFrom, setDlFrom] = useState('');
  const [dlTo, setDlTo] = useState('');
  const [dlLoading, setDlLoading] = useState(false);

  const selectedTTNApp = ttnApps.find((a) => a._id === ttnAppId) ?? null;
  const selectedTTNDevice: TTNDeviceType | null = ttnDevices.find((d) => d._id === ttnDeviceId) ?? null;

  const TTN_ONLINE_MS = 15 * 60 * 1000;
  const ttnIsOnline = selectedTTNDevice
    ? selectedTTNDevice.lastSeen != null &&
      Date.now() - new Date(selectedTTNDevice.lastSeen).getTime() < TTN_ONLINE_MS
    : false;

  // Gateways that have seen this device (derived from uplinks)
  const deviceGateways = useMemo<TTNGateway[]>(() => {
    const seen = new Set(ttnUplinks.map((u) => u.gatewayId).filter(Boolean));
    return ttnGateways.filter((g) => seen.has(g.gatewayId));
  }, [ttnUplinks, ttnGateways]);

  // Combined recent uplinks + downlinks for the selected device, newest first
  const recentEntries = useMemo(() => {
    if (!selectedTTNDevice) return [] as Array<
      ({ _type: 'uplink' } & (typeof ttnUplinks)[number]) |
      ({ _type: 'downlink' } & TTNDownlink)
    >;
    const deviceId = selectedTTNDevice.deviceId;
    const upls = ttnUplinks
      .filter((u) => u.deviceId === deviceId)
      .map((u) => ({ ...u, _type: 'uplink' as const }));
    const dnls = ttnDownlinks
      .filter((d) => d.deviceId === deviceId)
      .map((d) => ({ ...d, _type: 'downlink' as const }));
    return [...upls, ...dnls].sort((a, b) => {
      const aTime = a._type === 'uplink' ? a.receivedAt : a.createdAt;
      const bTime = b._type === 'uplink' ? b.receivedAt : b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [ttnUplinks, ttnDownlinks, selectedTTNDevice]);

  // ── UI state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MainTab>('control');
  const [schedulingTab, setSchedulingTab] = useState<SchedulingTab>('schedules');
  const [globalMode, setGlobalMode] = useState<GlobalMode>('MANUAL');
  const [editingValve, setEditingValve] = useState<string | null>(null);
  const [savingNameValveId, setSavingNameValveId] = useState<string | null>(null);
  const [nameUpdateResult, setNameUpdateResult] = useState<Record<string, 'ok' | 'err'>>({});
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
  // Which valve's inline schedule panel is expanded (one at a time)
  const [scheduleExpandedValveId, setScheduleExpandedValveId] = useState<string | null>(null);

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

  // ── Real-time TTN socket (uplinks, device status, gateway updates) ────────
  // useSocketTTN joins the TTN application room and dispatches addUplink /
  // deviceJoined / deviceOffline / updateDownlinkStatus actions so that
  // ttnIsOnline and recentEntries update without a manual refresh.
  useSocketTTN(selectedTTNApp?.applicationId ?? null);

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

  // URL params override: ?ttnAppId=...&ttnDeviceId=... (from Devices page navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlAppId = urlParams.get('ttnAppId');
    const urlDeviceId = urlParams.get('ttnDeviceId');
    if (urlAppId) setTtnAppId(urlAppId);
    if (urlDeviceId) setTtnDeviceId(urlDeviceId);
    if (urlAppId || urlDeviceId) setActiveTab('lorawan');
  }, []); // run once on mount

  // Load TTN devices when app changes
  useEffect(() => {
    if (!ttnAppId || !selectedTTNApp) return;
    dispatch(fetchTTNDevices(selectedTTNApp.applicationId));
  }, [ttnAppId, selectedTTNApp, dispatch]);

  // Load recent uplinks, downlinks + gateways when device changes
  useEffect(() => {
    if (!selectedTTNApp || !selectedTTNDevice) return;
    dispatch(fetchTTNUplinks({
      applicationId: selectedTTNApp.applicationId,
      deviceId: selectedTTNDevice.deviceId,
      limit: 30,
    }));
    dispatch(fetchTTNDownlinks({
      applicationId: selectedTTNApp.applicationId,
      deviceId: selectedTTNDevice.deviceId,
      limit: 20,
    }));
    dispatch(fetchTTNGateways(selectedTTNApp.applicationId));
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

  const handleDownloadUplinks = async (fmt: 'csv' | 'json') => {
    if (!selectedTTNApp || !selectedTTNDevice) return;
    setDlLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const params = new URLSearchParams({
        deviceId: selectedTTNDevice.deviceId,
        eventType: 'uplink',
        format: fmt,
      });
      if (dlFrom) params.set('startDate', new Date(dlFrom).toISOString());
      if (dlTo) params.set('endDate', new Date(dlTo + 'T23:59:59').toISOString());
      const url = `${API_ENDPOINTS.TTN_LOGS_EXPORT(selectedTTNApp.applicationId)}?${params.toString()}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `uplinks-${selectedTTNDevice.deviceId}-${Date.now()}.${fmt}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch { /* silent — user sees nothing on fail */ } finally {
      setDlLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const isOnline =
    selectedManifold && typeof selectedManifold.esp32DeviceId === 'object'
      ? selectedManifold.esp32DeviceId.status === 'online'
      : true;

  // Single source of truth for device online status:
  // When a TTN device is linked, use the 15-min lastSeen threshold (matches TTN page).
  // Otherwise fall back to the esp32 device status field.
  const deviceOnline = selectedTTNDevice ? ttnIsOnline : isOnline;

  // Derive device ID for sensor data lookup
  const deviceId =
    selectedManifold && typeof selectedManifold.esp32DeviceId === 'object'
      ? selectedManifold.esp32DeviceId._id
      : typeof selectedManifold?.esp32DeviceId === 'string'
      ? selectedManifold.esp32DeviceId
      : '';
  const telemetry: DeviceSensorData | null = (deviceId && sensorData[deviceId]) || null;

  const maxPressure = selectedManifold?.specifications?.maxPressure || 100;

  // Component-level pressure values (used in status panel and valve cards)
  const inletPressure: number | null = telemetry?.pt1 ?? null;
  const outletPressure: number | null = telemetry?.pt2 ?? null;

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

  // Total cycles: count of enabled ON schedules with a past startAt (real-time, no backend needed)
  const totalCycles = useMemo(() => {
    const now = new Date();
    return manifoldValves.reduce((sum, v) =>
      sum + (v.schedules || []).filter(s =>
        s.action === 'ON' && s.enabled && s.startAt != null && new Date(s.startAt) < now
      ).length,
    0);
  }, [manifoldValves]);

  // ── System status derivations ──────────────────────────────
  const irrigationStatus: ChipStatus =
    manifoldValves.some((v) => v.operationalData.currentStatus === 'FAULT')
      ? 'fault'
      : manifoldValves.some((v) => v.operationalData.currentStatus === 'ON')
      ? 'ok'
      : 'offline';

  const TELEMETRY_STALE_MS = 15 * 60 * 1000;
  const telemetryAge = telemetry
    ? Date.now() - new Date(telemetry.receivedAt).getTime()
    : Infinity;
  const pt1Status: ChipStatus = !telemetry
    ? 'offline'
    : telemetryAge > TELEMETRY_STALE_MS
    ? 'warn'
    : telemetry.pt1 == null
    ? 'fault'
    : 'ok';
  const pt2Status: ChipStatus = !telemetry
    ? 'offline'
    : telemetryAge > TELEMETRY_STALE_MS
    ? 'warn'
    : telemetry.pt2 == null
    ? 'fault'
    : 'ok';

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
    // Single-trigger: ON uses startAt only, OFF uses endAt only
    const payload = {
      action: scheduleDraft.action,
      startAt: scheduleDraft.action === 'ON' && scheduleDraft.startAt
        ? new Date(scheduleDraft.startAt).toISOString()
        : undefined,
      endAt: scheduleDraft.action === 'OFF' && scheduleDraft.endAt
        ? new Date(scheduleDraft.endAt).toISOString()
        : undefined,
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
                onClick={() => router.push('/devices')}
                className="mb-1 px-0 hover:bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to devices
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
              {selectedTTNDevice ? (
                <Badge className={ttnIsOnline ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}>
                  {ttnIsOnline ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
                  {ttnIsOnline ? 'LoRa Connected' : 'Offline'}
                </Badge>
              ) : (
                <Badge className="bg-secondary text-muted-foreground">
                  <Radio className="mr-1 h-3 w-3" />
                  No LoRa Device
                </Badge>
              )}
              <Badge variant={selectedManifold.status === 'Active' ? 'default' : 'secondary'}>
                {selectedManifold.status}
              </Badge>
            </div>
          </div>

          {/* ── SCADA Status Panel ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            {/* Block 1 — Irrigation Status */}
            <div className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 ${
              irrigationStatus === 'ok'    ? 'border-emerald-500/30 bg-emerald-500/5'
              : irrigationStatus === 'fault' ? 'border-red-500/30 bg-red-500/5'
              : 'border-border/30 bg-secondary/20'
            }`}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Irrigation</p>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                irrigationStatus === 'ok'    ? 'bg-emerald-500/20'
                : irrigationStatus === 'fault' ? 'bg-red-500/20'
                : 'bg-secondary/50'
              }`}>
                <Activity className={`h-4 w-4 ${
                  irrigationStatus === 'ok'    ? 'text-emerald-400'
                  : irrigationStatus === 'fault' ? 'text-red-400'
                  : 'text-muted-foreground'
                }`} />
              </div>
              <p className={`text-xs font-bold ${
                irrigationStatus === 'ok'    ? 'text-emerald-400'
                : irrigationStatus === 'fault' ? 'text-red-400'
                : 'text-muted-foreground'
              }`}>
                {irrigationStatus === 'ok' ? 'Running' : irrigationStatus === 'fault' ? 'Fault' : 'Stopped'}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {irrigationStatus === 'ok'
                  ? `${activeValveCount} valve${activeValveCount !== 1 ? 's' : ''} active`
                  : `${manifoldValves.length} valve${manifoldValves.length !== 1 ? 's' : ''} total`}
              </p>
            </div>

            {/* Block 2 — PT-01 Inlet */}
            <div className={`rounded-xl border p-3 flex flex-col items-center gap-1 ${
              pt1Status === 'ok'    ? 'border-cyan-500/20 bg-secondary/20'
              : pt1Status === 'fault' ? 'border-amber-500/20 bg-amber-500/5'
              : 'border-border/30 bg-secondary/20'
            }`}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">PT-01 Inlet</p>
              <PressureMeter value={inletPressure} max={maxPressure} unit="PSI" small />
              <p className={`text-[9px] tabular-nums font-medium ${
                pt1Status === 'ok' ? 'text-cyan-400' : 'text-muted-foreground/60'
              }`}>
                {pt1Status === 'ok' && inletPressure != null
                  ? `${inletPressure.toFixed(1)} PSI`
                  : pt1Status === 'warn' ? 'Stale' : pt1Status === 'fault' ? 'Fault' : 'No Signal'}
              </p>
            </div>

            {/* Block 3 — PT-02 Dist */}
            <div className={`rounded-xl border p-3 flex flex-col items-center gap-1 ${
              pt2Status === 'ok'    ? 'border-emerald-500/20 bg-secondary/20'
              : pt2Status === 'fault' ? 'border-amber-500/20 bg-amber-500/5'
              : 'border-border/30 bg-secondary/20'
            }`}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">PT-02 Dist</p>
              <PressureMeter value={outletPressure} max={maxPressure} unit="PSI" small />
              <p className={`text-[9px] tabular-nums font-medium ${
                pt2Status === 'ok' ? 'text-emerald-400' : 'text-muted-foreground/60'
              }`}>
                {pt2Status === 'ok' && outletPressure != null
                  ? `${outletPressure.toFixed(1)} PSI`
                  : pt2Status === 'warn' ? 'Stale' : pt2Status === 'fault' ? 'Fault' : 'No Signal'}
              </p>
            </div>

            {/* Block 4 — RSSI Signal */}
            <div className="rounded-xl border border-border/30 bg-secondary/20 p-3 flex flex-col items-center gap-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Signal RSSI</p>
              <SignalBars rssi={telemetry?.rssi ?? null} size="md" />
              <p className={`text-xs font-bold tabular-nums ${
                telemetry?.rssi == null ? 'text-muted-foreground'
                : telemetry.rssi >= -75 ? 'text-emerald-400'
                : telemetry.rssi >= -90 ? 'text-amber-400'
                : 'text-red-400'
              }`}>
                {telemetry?.rssi != null ? `${telemetry.rssi} dBm` : 'No Signal'}
              </p>
              <p className="text-[9px] text-muted-foreground">LoRaWAN RF</p>
            </div>
          </div>

          {/* Last uplink timestamp */}
          {telemetry && (
            <p className="text-right text-[10px] text-muted-foreground">
              Last uplink {formatRelativeTime(telemetry.receivedAt)}
            </p>
          )}

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
                { id: 'lorawan', label: 'LoRaWAN', icon: Radio },
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

                        // Next upcoming schedule — single-trigger model:
                        //   ON schedules fire at startAt, OFF schedules fire at endAt
                        const now = new Date();
                        const nextSchedule = [...(valve.schedules || [])]
                          .filter((s) => {
                            if (!s.enabled) return false;
                            const t = s.action === 'ON' ? s.startAt : s.endAt;
                            return t && new Date(t) > now;
                          })
                          .sort((a, b) => {
                            const aT = (a.action === 'ON' ? a.startAt : a.endAt) ?? '';
                            const bT = (b.action === 'ON' ? b.startAt : b.endAt) ?? '';
                            return new Date(aT).getTime() - new Date(bT).getTime();
                          })[0] ?? null;
                        const nextTriggerTime = nextSchedule
                          ? (nextSchedule.action === 'ON' ? nextSchedule.startAt : nextSchedule.endAt)
                          : null;

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
                                        autoFocus
                                        onChange={(e) =>
                                          setNameDraft((p) => ({
                                            ...p,
                                            [valve._id]: e.target.value,
                                          }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') {
                                            setEditingValve(null);
                                            setNameDraft((p) => {
                                              const n = { ...p };
                                              delete n[valve._id];
                                              return n;
                                            });
                                          }
                                        }}
                                        className={`w-full rounded border bg-background px-1.5 py-0.5 text-sm font-semibold focus:outline-none ${
                                          nameUpdateResult[valve._id] === 'err'
                                            ? 'border-red-500/50'
                                            : 'border-brand-500/50'
                                        }`}
                                      />
                                    ) : (
                                      <p className="truncate text-sm font-semibold">{valveName}</p>
                                    )}
                                    <p className="truncate text-[10px] text-muted-foreground">
                                      {nameUpdateResult[valve._id] === 'err' ? (
                                        <span className="text-red-400">Save failed — try again</span>
                                      ) : (
                                        <>GPIO {valve.esp32PinNumber} &bull; {valve.operationalData.cycleCount} cycles</>
                                      )}
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
                                    disabled={savingNameValveId === valve._id}
                                    onClick={async () => {
                                      if (isEditing) {
                                        const newName = nameDraft[valve._id]?.trim();
                                        if (newName !== undefined && newName !== '') {
                                          setSavingNameValveId(valve._id);
                                          try {
                                            await dispatch(
                                              updateValve({
                                                valveId: valve._id,
                                                data: {
                                                  position: {
                                                    flowOrder: valve.position?.flowOrder ?? 0,
                                                    zone: newName,
                                                  },
                                                },
                                              })
                                            ).unwrap();
                                            // Clear draft — store now holds the API-confirmed name
                                            setNameDraft((p) => {
                                              const n = { ...p };
                                              delete n[valve._id];
                                              return n;
                                            });
                                            setNameUpdateResult((p) => ({ ...p, [valve._id]: 'ok' }));
                                            setEditingValve(null);
                                            setTimeout(
                                              () =>
                                                setNameUpdateResult((p) => {
                                                  const n = { ...p };
                                                  delete n[valve._id];
                                                  return n;
                                                }),
                                              2000
                                            );
                                          } catch {
                                            setNameUpdateResult((p) => ({ ...p, [valve._id]: 'err' }));
                                            setTimeout(
                                              () =>
                                                setNameUpdateResult((p) => {
                                                  const n = { ...p };
                                                  delete n[valve._id];
                                                  return n;
                                                }),
                                              3000
                                            );
                                          } finally {
                                            setSavingNameValveId(null);
                                          }
                                        } else {
                                          // No change or empty — exit without saving
                                          setEditingValve(null);
                                        }
                                      } else {
                                        // Enter edit mode — pre-populate draft with current name
                                        setNameDraft((p) => ({
                                          ...p,
                                          [valve._id]: valve.position?.zone ?? `Valve ${valve.valveNumber}`,
                                        }));
                                        setEditingValve(valve._id);
                                      }
                                    }}
                                  >
                                    {savingNameValveId === valve._id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
                                    ) : isEditing ? (
                                      <Save className="h-3.5 w-3.5 text-brand-400" />
                                    ) : nameUpdateResult[valve._id] === 'ok' ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : nameUpdateResult[valve._id] === 'err' ? (
                                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                                    ) : (
                                      <Pencil className="h-3 w-3" />
                                    )}
                                  </Button>
                                  {isEditing && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingValve(null);
                                        setNameDraft((p) => {
                                          const n = { ...p };
                                          delete n[valve._id];
                                          return n;
                                        });
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Pressure gauge + controls row */}
                              <div className="flex items-center gap-3">
                                {/* Mini PT1 inlet gauge (real telemetry only) */}
                                <div className="shrink-0 flex flex-col items-center">
                                  <PressureMeter value={inletPressure} max={maxPressure} small />
                                  <p className="text-[9px] text-muted-foreground -mt-0.5">
                                    {inletPressure != null ? 'PT-01' : 'No data'}
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
                                          disabled={!deviceOnline || isOn}
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
                                          disabled={!deviceOnline || !isOn}
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
                                          disabled={!deviceOnline}
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
                                    /* AUTO mode — show upcoming schedule status */
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 space-y-1">
                                      {nextSchedule ? (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                          <Clock3 className="h-3 w-3" />
                                          Next {nextSchedule.action}:{' '}
                                          {formatScheduleTime(nextTriggerTime ?? undefined)}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-center text-muted-foreground">
                                          No upcoming schedules
                                        </p>
                                      )}
                                      {(() => {
                                        const upcoming = (valve.schedules || []).filter((s) => {
                                          if (!s.enabled) return false;
                                          const t = s.action === 'ON' ? s.startAt : s.endAt;
                                          return t && new Date(t) > now;
                                        }).length;
                                        return (
                                          <p className="text-[10px] text-muted-foreground">
                                            {upcoming} upcoming schedule{upcoming !== 1 ? 's' : ''}
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* ── Valve Metrics Strip: PT-01 | PT-02 | Signal ── */}
                              <div className="mt-1 grid grid-cols-3 divide-x divide-border/30 overflow-hidden rounded-lg border border-border/30 bg-secondary/20 text-center">
                                {/* PT-01 Inlet Pressure */}
                                <div className="px-2 py-2 flex flex-col items-center gap-0.5">
                                  <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">PT-01</p>
                                  <PressureMeter value={inletPressure} max={maxPressure} unit="PSI" small />
                                  <p className={`text-[9px] tabular-nums ${inletPressure != null ? 'text-cyan-400' : 'text-muted-foreground/50'}`}>
                                    {inletPressure != null ? `${inletPressure.toFixed(1)} PSI` : 'No Signal'}
                                  </p>
                                </div>

                                {/* PT-02 Distribution Pressure */}
                                <div className="px-2 py-2 flex flex-col items-center gap-0.5">
                                  <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">PT-02</p>
                                  <PressureMeter value={outletPressure} max={maxPressure} unit="PSI" small />
                                  <p className={`text-[9px] tabular-nums ${outletPressure != null ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                                    {outletPressure != null ? `${outletPressure.toFixed(1)} PSI` : 'No Signal'}
                                  </p>
                                </div>

                                {/* RSSI signal strength */}
                                <div className="px-2 py-2 flex flex-col items-center gap-0.5">
                                  <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">RSSI</p>
                                  <SignalBars rssi={telemetry?.rssi ?? null} size="sm" />
                                  <p className={`text-[9px] tabular-nums font-bold ${
                                    telemetry?.rssi == null ? 'text-muted-foreground/50'
                                    : telemetry.rssi >= -75 ? 'text-emerald-400'
                                    : telemetry.rssi >= -90 ? 'text-amber-400'
                                    : 'text-red-400'
                                  }`}>
                                    {telemetry?.rssi != null ? `${telemetry.rssi}` : '—'} dBm
                                  </p>
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

                              {/* ── Per-Valve Inline Schedule Panel ────────────────── */}
                              <div className="border-t border-border/30 pt-2">
                                {globalMode === 'MANUAL' ? (
                                  /* Locked in MANUAL mode */
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                                    <Lock className="h-3 w-3 shrink-0" />
                                    Scheduling available in AUTO mode only
                                  </div>
                                ) : scheduleExpandedValveId !== valve._id ? (
                                  /* Collapsed — show toggle with schedule count */
                                  <button
                                    onClick={() => {
                                      setScheduleExpandedValveId(valve._id);
                                      setScheduleValveId(valve._id);
                                      setScheduleEditId(null);
                                      setScheduleDraft({ action: 'ON', startAt: '', endAt: '' });
                                    }}
                                    className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors group"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="h-3 w-3" />
                                      <span>Schedules</span>
                                      {(valve.schedules || []).length > 0 && (
                                        <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">
                                          {valve.schedules.length}
                                        </span>
                                      )}
                                    </span>
                                    <ChevronDown className="h-3 w-3 transition-transform group-hover:translate-y-0.5" />
                                  </button>
                                ) : (
                                  /* Expanded — add/edit form + schedule list */
                                  <div className="space-y-2">
                                    {/* Panel header */}
                                    <div className="flex items-center justify-between">
                                      <p className="flex items-center gap-1.5 text-xs font-semibold">
                                        <Calendar className="h-3.5 w-3.5 text-brand-500" />
                                        {scheduleEditId ? 'Edit Schedule' : 'Add Schedule'}
                                      </p>
                                      <button
                                        onClick={() => {
                                          setScheduleExpandedValveId(null);
                                          setScheduleEditId(null);
                                          setScheduleDraft({ action: 'ON', startAt: '', endAt: '' });
                                        }}
                                        className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                        title="Collapse"
                                      >
                                        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                                      </button>
                                    </div>

                                    {/* Action select */}
                                    <select
                                      value={scheduleDraft.action}
                                      onChange={(e) => {
                                        const a = e.target.value as 'ON' | 'OFF';
                                        setScheduleDraft({
                                          action: a,
                                          startAt: a === 'ON' ? scheduleDraft.startAt : '',
                                          endAt: a === 'OFF' ? scheduleDraft.endAt : '',
                                        });
                                      }}
                                      className="w-full rounded border border-border/60 bg-background px-2 py-1.5 text-xs dark:[color-scheme:dark]"
                                    >
                                      <option value="ON">Turn ON at time</option>
                                      <option value="OFF">Turn OFF at time</option>
                                    </select>

                                    {/* Single datetime input (label changes with action) */}
                                    <div className="space-y-0.5">
                                      <label className="text-[11px] text-muted-foreground">
                                        Execute Time{' '}
                                        <span className={scheduleDraft.action === 'ON' ? 'text-brand-400' : 'text-slate-400'}>
                                          ({scheduleDraft.action})
                                        </span>
                                      </label>
                                      <input
                                        type="datetime-local"
                                        value={
                                          scheduleDraft.action === 'ON'
                                            ? scheduleDraft.startAt
                                            : scheduleDraft.endAt
                                        }
                                        onChange={(e) =>
                                          setScheduleDraft((p) => ({
                                            ...p,
                                            [p.action === 'ON' ? 'startAt' : 'endAt']: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground dark:[color-scheme:dark]"
                                      />
                                    </div>

                                    {/* Save / Cancel */}
                                    <div className="flex gap-1.5">
                                      <Button
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={handleAddOrUpdateSchedule}
                                        disabled={
                                          (scheduleDraft.action === 'ON' && !scheduleDraft.startAt) ||
                                          (scheduleDraft.action === 'OFF' && !scheduleDraft.endAt)
                                        }
                                      >
                                        <Save className="mr-1 h-3 w-3" />
                                        {scheduleEditId ? 'Update' : 'Add'}
                                      </Button>
                                      {scheduleEditId && (
                                        <button
                                          onClick={() => {
                                            setScheduleEditId(null);
                                            setScheduleDraft({ action: 'ON', startAt: '', endAt: '' });
                                          }}
                                          className="flex h-7 items-center gap-1 rounded-md border border-border/60 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Existing schedules for this valve */}
                                    {(valve.schedules || []).length > 0 && (
                                      <div className="space-y-1 border-t border-border/30 pt-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                          {valve.schedules.length} schedule{valve.schedules.length !== 1 ? 's' : ''}
                                        </p>
                                        {valve.schedules.map((schedule) => (
                                          <div
                                            key={schedule.scheduleId}
                                            className="flex items-center justify-between gap-1 rounded-lg bg-secondary/40 px-2.5 py-1.5"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1">
                                                <span
                                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                                    schedule.action === 'ON'
                                                      ? 'bg-emerald-500/10 text-emerald-400'
                                                      : 'bg-slate-500/10 text-slate-400'
                                                  }`}
                                                >
                                                  {schedule.action}
                                                </span>
                                                {!schedule.enabled && (
                                                  <span className="text-[10px] text-muted-foreground">disabled</span>
                                                )}
                                              </div>
                                              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                                {schedule.action === 'ON' && schedule.startAt
                                                  ? new Date(schedule.startAt).toLocaleString()
                                                  : schedule.action === 'OFF' && schedule.endAt
                                                  ? new Date(schedule.endAt).toLocaleString()
                                                  : 'Time not set'}
                                              </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-0.5">
                                              <button
                                                title="Edit"
                                                onClick={() => {
                                                  setScheduleEditId(schedule.scheduleId);
                                                  setScheduleDraft({
                                                    action: schedule.action,
                                                    startAt: schedule.action === 'ON' ? toDateTimeLocal(schedule.startAt) : '',
                                                    endAt: schedule.action === 'OFF' ? toDateTimeLocal(schedule.endAt) : '',
                                                  });
                                                }}
                                                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                <Edit3 className="h-3 w-3" />
                                              </button>
                                              <button
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
                                                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                {schedule.enabled ? (
                                                  <BellOff className="h-3 w-3" />
                                                ) : (
                                                  <Bell className="h-3 w-3" />
                                                )}
                                              </button>
                                              <button
                                                title="Delete"
                                                onClick={() =>
                                                  dispatch(
                                                    deleteSchedule({
                                                      valveId: valve._id,
                                                      scheduleId: schedule.scheduleId,
                                                    })
                                                  )
                                                }
                                                className="rounded p-1 text-red-400/60 hover:text-red-400 transition-colors"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
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
                  <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${
                    !selectedTTNDevice
                      ? 'border-border/30 bg-secondary/20'
                      : ttnIsOnline
                      ? 'border-emerald-500/20 bg-emerald-500/10'
                      : 'border-slate-500/20 bg-slate-500/10'
                  }`}>
                    <span className="font-medium text-muted-foreground">LoRaWAN Class C</span>
                    <span className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                      !selectedTTNDevice ? 'text-muted-foreground'
                      : ttnIsOnline ? 'text-emerald-400'
                      : 'text-slate-400'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        !selectedTTNDevice ? 'bg-slate-600'
                        : ttnIsOnline ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-500'
                      }`} />
                      {!selectedTTNDevice ? 'No LoRa Device' : ttnIsOnline ? 'Connected' : 'Offline'}
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
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'PT-01 Inlet', value: telemetry.pt1 },
                          { label: 'PT-02 Dist',  value: telemetry.pt2 },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col items-center rounded-lg bg-secondary/50 p-2">
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                            <PressureMeter value={value ?? null} max={maxPressure} unit="PSI" small={false} />
                            <p className={`text-[10px] tabular-nums ${value != null ? 'text-cyan-400' : 'text-muted-foreground/50'}`}>
                              {value != null ? `${value.toFixed(1)} PSI` : 'No Signal'}
                            </p>
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
                        <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <SignalBars rssi={telemetry.rssi ?? null} size="sm" />
                            {telemetry.rssi != null && (
                              <span className={`text-xs font-bold tabular-nums ${
                                telemetry.rssi >= -75 ? 'text-emerald-400'
                                : telemetry.rssi >= -90 ? 'text-amber-400'
                                : 'text-red-400'
                              }`}>{telemetry.rssi} dBm</span>
                            )}
                          </div>
                          {telemetry.snr != null && (
                            <span className="text-[10px] text-sky-400 tabular-nums font-medium">SNR {telemetry.snr} dB</span>
                          )}
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
                      ['Total Cycles', totalCycles.toLocaleString()],
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

                  {/* SCADA pressure gauges — real PT1/PT2 telemetry */}
                  <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3">
                    <SCADAGauge
                      value={telemetry?.pt1 ?? null}
                      max={maxPressure}
                      unit="PSI"
                      label="PT-01 Inlet"
                    />
                    <SCADAGauge
                      value={telemetry?.pt2 ?? null}
                      max={maxPressure}
                      unit="PSI"
                      label="PT-02 Dist"
                    />
                  </div>
                  {/* RSSI + SNR row */}
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <SignalBars rssi={telemetry?.rssi ?? null} size="sm" />
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Signal RSSI</p>
                        <p className={`text-sm font-bold tabular-nums ${
                          telemetry?.rssi == null ? 'text-muted-foreground'
                          : telemetry.rssi >= -75 ? 'text-emerald-400'
                          : telemetry.rssi >= -90 ? 'text-amber-400'
                          : 'text-red-400'
                        }`}>
                          {telemetry?.rssi != null ? `${telemetry.rssi} dBm` : 'No Signal'}
                        </p>
                      </div>
                    </div>
                    {telemetry?.snr != null && (
                      <div className="text-right">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">SNR</p>
                        <p className="text-sm font-bold text-sky-400 tabular-nums">{telemetry.snr} dB</p>
                      </div>
                    )}
                  </div>

                  {!telemetry && (
                    <p className="mt-1 text-center text-[10px] text-muted-foreground/40">
                      Awaiting first LoRaWAN uplink
                    </p>
                  )}

                  <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    <Zap className="mr-1.5 inline h-3 w-3 text-brand-400" />
                    {selectedTTNDevice
                      ? ttnIsOnline
                        ? 'LoRaWAN Class C — always listening'
                        : 'Device offline'
                      : 'No LoRa device linked'
                    } &bull; {selectedManifold.status}
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
                        onClick={() => setActiveTab('lorawan')}
                      >
                        <Radio className="mr-1 h-3 w-3" />
                        LoRaWAN
                      </Button>
                    </div>
                  </div>
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

                        {/* Action — single trigger: ON fires at startAt, OFF fires at endAt */}
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Action</label>
                          <select
                            value={scheduleDraft.action}
                            onChange={(e) => {
                              const newAction = e.target.value as 'ON' | 'OFF';
                              setScheduleDraft((p) => ({
                                action: newAction,
                                // Clear the opposite field when switching action
                                startAt: newAction === 'ON' ? p.startAt : '',
                                endAt: newAction === 'OFF' ? p.endAt : '',
                              }));
                            }}
                            className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm dark:[color-scheme:dark]"
                          >
                            <option value="ON">Turn ON (relay HIGH)</option>
                            <option value="OFF">Turn OFF (relay LOW)</option>
                          </select>
                        </div>

                        {/* Single time input — label changes based on action */}
                        {scheduleDraft.action === 'ON' ? (
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Execute Time <span className="text-brand-400">(turns valve ON)</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduleDraft.startAt}
                              onChange={(e) =>
                                setScheduleDraft((p) => ({ ...p, startAt: e.target.value }))
                              }
                              className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm text-foreground dark:[color-scheme:dark]"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              Execute Time <span className="text-slate-400">(turns valve OFF)</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduleDraft.endAt}
                              onChange={(e) =>
                                setScheduleDraft((p) => ({ ...p, endAt: e.target.value }))
                              }
                              className="w-full rounded-md border border-border/60 bg-background px-2 py-2 text-sm text-foreground dark:[color-scheme:dark]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={handleAddOrUpdateSchedule}
                          disabled={
                            !scheduleValveId ||
                            (scheduleDraft.action === 'ON' && !scheduleDraft.startAt) ||
                            (scheduleDraft.action === 'OFF' && !scheduleDraft.endAt)
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
                                const sStatus = scheduleStatus(schedule);
                                const triggerTime = schedule.action === 'ON' ? schedule.startAt : schedule.endAt;
                                return (
                                  <div
                                    key={schedule.scheduleId}
                                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                                      sStatus === 'expired'
                                        ? 'bg-secondary/20 opacity-60'
                                        : 'bg-secondary/40'
                                    }`}
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
                                          variant={sStatus === 'upcoming' ? 'default' : 'secondary'}
                                          className={`text-[10px] ${
                                            sStatus === 'expired'
                                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                              : ''
                                          }`}
                                        >
                                          {sStatus === 'upcoming' ? 'Upcoming' : sStatus === 'expired' ? 'Expired' : 'Disabled'}
                                        </Badge>
                                      </div>
                                      <p className="mt-1 truncate text-muted-foreground">
                                        {triggerTime
                                          ? `${schedule.action} at ${new Date(triggerTime).toLocaleString()}`
                                          : schedule.cronExpression || 'Time not set'}
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
                                            // Only populate the relevant field
                                            startAt: schedule.action === 'ON' ? toDateTimeLocal(schedule.startAt) : '',
                                            endAt: schedule.action === 'OFF' ? toDateTimeLocal(schedule.endAt) : '',
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
                      Past ON &amp; OFF triggers
                    </span>
                  </div>
                  <div className="p-4">
                    {(() => {
                      // A schedule is "past" when its trigger time has elapsed:
                      //   ON → startAt < now    OFF → endAt < now
                      const now = new Date();
                      const past = manifoldValves
                        .flatMap((v) =>
                          (v.schedules || [])
                            .filter((s) => {
                              const triggerTime = s.action === 'ON' ? s.startAt : s.endAt;
                              return triggerTime && new Date(triggerTime) < now;
                            })
                            .map((s) => ({
                              ...s,
                              valveName: v.position?.zone || `Valve ${v.valveNumber}`,
                              executedAt: (s.action === 'ON' ? s.startAt : s.endAt) as string,
                            }))
                        )
                        .sort((a, b) =>
                          new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
                        );

                      if (past.length === 0) {
                        return (
                          <div className="py-12 text-center text-muted-foreground">
                            <History className="mx-auto mb-2 h-8 w-8 opacity-20" />
                            <p className="text-sm">No past schedules yet</p>
                            <p className="mt-1 text-xs opacity-60">
                              Schedules appear here after their trigger time passes
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="max-h-[480px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-card">
                              <tr className="border-b border-border/50 text-left text-muted-foreground">
                                <th className="pb-2 pr-4 font-medium">Valve</th>
                                <th className="pb-2 pr-4 font-medium">Action</th>
                                <th className="pb-2 pr-4 font-medium">Executed At</th>
                                <th className="pb-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {past.map((s) => (
                                <tr key={s.scheduleId} className="hover:bg-secondary/20">
                                  <td className="py-2 pr-4 font-medium">{s.valveName}</td>
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
                                  <td className="py-2 pr-4 text-muted-foreground">
                                    {new Date(s.executedAt).toLocaleString()}
                                  </td>
                                  <td className="py-2">
                                    {s.enabled ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        Executed
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                        <XCircle className="h-2.5 w-2.5" />
                                        Skipped
                                      </span>
                                    )}
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
                              {/* Alarm-type-specific icon (falls back to severity icon) */}
                              {alarm.alarmType && alarm.alarmType !== 'MANUAL' ? (
                                <AlarmTypeIcon alarmType={alarm.alarmType} className="mt-0.5 h-4 w-4 shrink-0" />
                              ) : alarm.severity === 'CRITICAL' ? (
                                <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                              ) : alarm.severity === 'WARNING' ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              ) : (
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <SeverityBadge severity={alarm.severity} />
                                  {/* Alarm type badge */}
                                  {alarm.alarmType && alarm.alarmType !== 'MANUAL' && (
                                    <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                      {alarm.alarmType.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {alarm.valveName}
                                  </span>
                                  {/* Lifecycle state chip */}
                                  {!alarm.acknowledged ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                                      <AlertOctagon className="h-2.5 w-2.5" />
                                      ACTIVE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      ACKNOWLEDGED
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
                              {/* Resolve only available after acknowledgement (SCADA lifecycle) */}
                              {alarm.acknowledged && (
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
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
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
                            {alarm.alarmType && alarm.alarmType !== 'MANUAL' ? (
                              <AlarmTypeIcon alarmType={alarm.alarmType} className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : (
                              <SeverityBadge severity={alarm.severity} />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <SeverityBadge severity={alarm.severity} />
                                {alarm.alarmType && alarm.alarmType !== 'MANUAL' && (
                                  <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                                    {alarm.alarmType.replace(/_/g, ' ')}
                                  </span>
                                )}
                                <span className="text-xs font-medium">{alarm.valveName}</span>
                                {alarm.resolved ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                    <XCircle className="h-3 w-3" />
                                    RESOLVED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    ACKNOWLEDGED
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

          {/* ════════════════════════════════════════════════
              LORAWAN TAB
          ════════════════════════════════════════════════ */}
          {activeTab === 'lorawan' && (
            <div className="space-y-6">
              {/* ── Selectors ── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">TTN Application</label>
                  <select
                    value={ttnAppId}
                    onChange={(e) => handleTTNAppChange(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm dark:[color-scheme:dark]"
                  >
                    <option value="">Select application…</option>
                    {ttnApps.map((app) => (
                      <option key={app._id} value={app._id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Device</label>
                  <select
                    value={ttnDeviceId}
                    onChange={(e) => handleTTNDeviceChange(e.target.value)}
                    disabled={!ttnAppId}
                    className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm disabled:opacity-50 dark:[color-scheme:dark]"
                  >
                    <option value="">Select device…</option>
                    {ttnDevices.map((dev) => (
                      <option key={dev._id} value={dev._id}>
                        {dev.displayName || dev.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedTTNDevice ? (
                <Card className="p-16 text-center text-muted-foreground">
                  <Radio className="mx-auto mb-3 h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">No LoRaWAN device selected</p>
                  <p className="mt-1 text-xs opacity-70">
                    Select a TTN application and device above to view uplinks and send downlinks.
                  </p>
                </Card>
              ) : (
                <>
                  {/* ── Device status bar ── */}
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${ttnIsOnline ? 'animate-pulse bg-emerald-500' : 'bg-slate-500'}`} />
                        <span className="font-semibold">{selectedTTNDevice.displayName || selectedTTNDevice.name}</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{selectedTTNDevice.devEui}</span>
                      <Badge variant="outline" className={ttnIsOnline ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-500/30 text-slate-400'}>
                        {ttnIsOnline ? 'Online' : 'Offline'}
                      </Badge>
                      {selectedTTNDevice.lastSeen && (
                        <span className="text-xs text-muted-foreground">
                          Last seen: {formatRelativeTime(selectedTTNDevice.lastSeen)}
                        </span>
                      )}
                      <div className="ml-auto flex gap-4 text-center">
                        {[
                          { label: 'Total Uplinks', value: selectedTTNDevice.metrics.totalUplinks },
                          { label: 'Avg RSSI', value: selectedTTNDevice.metrics.avgRssi != null ? `${selectedTTNDevice.metrics.avgRssi} dBm` : '—' },
                          { label: 'Avg SNR', value: selectedTTNDevice.metrics.avgSnr != null ? `${selectedTTNDevice.metrics.avgSnr} dB` : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="min-w-[80px]">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* ── Recent Uplinks & Downlinks table ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Activity className="h-4 w-4 text-brand-500" />
                        Recent Uplinks &amp; Downlinks
                        {recentEntries.length > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({recentEntries.length})
                          </span>
                        )}
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          if (selectedTTNApp && selectedTTNDevice) {
                            dispatch(fetchTTNUplinks({
                              applicationId: selectedTTNApp.applicationId,
                              deviceId: selectedTTNDevice.deviceId,
                              limit: 30,
                            }));
                            dispatch(fetchTTNDownlinks({
                              applicationId: selectedTTNApp.applicationId,
                              deviceId: selectedTTNDevice.deviceId,
                              limit: 20,
                            }));
                          }
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                      </Button>
                    </div>

                    {recentEntries.length === 0 ? (
                      <Card className="p-10 text-center text-muted-foreground">
                        <Activity className="mx-auto mb-2 h-6 w-6 opacity-20" />
                        <p className="text-sm">No uplinks or downlinks recorded yet</p>
                        <p className="mt-1 text-xs opacity-60">Real-time updates when connected</p>
                      </Card>
                    ) : (
                      <Card className="overflow-hidden">
                        {/* Scrollable body — fixed height, mouse-wheel scroll, overscroll contained */}
                        <div
                          className="overflow-x-auto overflow-y-scroll h-80 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-secondary/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/70 [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/40"
                          style={{ overscrollBehavior: 'contain', scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border) / 0.7) transparent' }}
                        >
                          <table className="w-full min-w-[560px] text-sm">
                            <thead className="sticky top-0 z-10">
                              <tr className="border-b border-border/40 bg-card">
                                {['Timestamp', 'Type', 'FCnt', 'Payload', 'RSSI', 'SNR', 'Gateway'].map((h) => (
                                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {recentEntries.map((entry, idx) => {
                                if (entry._type === 'uplink') {
                                  // Find previous uplink for session-boundary detection
                                  let prevUplinkFCnt: number | null = null;
                                  for (let i = idx - 1; i >= 0; i--) {
                                    const e = recentEntries[i];
                                    if (e._type === 'uplink' && e.fCnt != null) { prevUplinkFCnt = e.fCnt; break; }
                                  }
                                  const isBoundary = entry.isSessionStart === true ||
                                    (prevUplinkFCnt != null && entry.fCnt != null && entry.fCnt > prevUplinkFCnt);
                                  return (
                                    <React.Fragment key={entry._id}>
                                      {isBoundary && (
                                        <tr>
                                          <td colSpan={7} className="px-3 py-1">
                                            <div className="flex items-center gap-2 text-[10px] font-semibold text-blue-400/80 uppercase tracking-wider">
                                              <span className="flex-1 border-t border-blue-500/20" />
                                              ↑ New LoRaWAN Session (FCnt Reset)
                                              <span className="flex-1 border-t border-blue-500/20" />
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                      <tr className="transition-colors hover:bg-muted/20">
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                                          {formatRelativeTime(entry.receivedAt)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2">
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                            <ArrowUp className="h-2.5 w-2.5" />
                                            Uplink
                                          </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                                          {entry.fCnt != null ? `#${entry.fCnt}` : '—'}
                                        </td>
                                        <td className="max-w-[100px] truncate whitespace-nowrap px-3 py-2 text-[10px] font-mono text-muted-foreground">
                                          {entry.rawPayload || '—'}
                                        </td>
                                        <td className={`whitespace-nowrap px-3 py-2 text-xs font-mono font-semibold ${
                                          entry.rssi >= -75 ? 'text-emerald-400' :
                                          entry.rssi >= -90 ? 'text-amber-400' : 'text-red-400'
                                        }`}>
                                          {entry.rssi} dBm
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-xs font-mono text-muted-foreground">
                                          {entry.snr} dB
                                        </td>
                                        <td className="max-w-[130px] truncate whitespace-nowrap px-3 py-2 text-[10px] font-mono text-muted-foreground">
                                          {entry.gatewayId || '—'}
                                        </td>
                                      </tr>
                                    </React.Fragment>
                                  );
                                } else {
                                  return (
                                    <tr key={entry._id} className="transition-colors hover:bg-muted/20">
                                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                                        {formatRelativeTime(entry.createdAt)}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                          <ArrowDown className="h-2.5 w-2.5" />
                                          Downlink
                                        </span>
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">—</td>
                                      <td className="max-w-[100px] truncate whitespace-nowrap px-3 py-2 text-[10px] font-mono text-muted-foreground">
                                        {entry.payload || '—'}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">—</td>
                                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">—</td>
                                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">—</td>
                                    </tr>
                                  );
                                }
                              })}
                            </tbody>
                          </table>
                        </div>
                        {recentEntries.length >= 10 && (
                          <div className="border-t border-border/30 px-3 py-2 text-center text-[10px] text-muted-foreground/60">
                            Scroll to view older entries · Updates in real-time
                          </div>
                        )}
                      </Card>
                    )}
                  </div>

                  {/* ── Gateways ── */}
                  {deviceGateways.length > 0 && (
                    <Card className="p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Signal className="h-4 w-4 text-brand-500" />
                        Gateways
                        <span className="ml-1 text-xs text-muted-foreground font-normal">({deviceGateways.length} seen)</span>
                      </h3>
                      <div className="space-y-1.5">
                        {deviceGateways.map((gw) => (
                          <div key={gw._id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${gw.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                            <span className="flex-1 text-sm font-medium truncate">{gw.name}</span>
                            <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground shrink-0">{gw.gatewayId}</span>
                            <span className={`font-mono text-xs font-semibold shrink-0 ${
                              gw.metrics.avgRssi >= -75 ? 'text-emerald-400' :
                              gw.metrics.avgRssi >= -90 ? 'text-amber-400' : 'text-red-400'
                            }`}>{gw.metrics.avgRssi.toFixed(0)} dBm</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{gw.metrics.totalUplinksSeen} pkts</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* ── Export Uplinks ── */}
                  <Card className="p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Download className="h-4 w-4 text-brand-500" />
                      Export Uplinks
                    </h3>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">From</label>
                        <input
                          type="date"
                          value={dlFrom}
                          onChange={(e) => setDlFrom(e.target.value)}
                          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm dark:[color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">To</label>
                        <input
                          type="date"
                          value={dlTo}
                          onChange={(e) => setDlTo(e.target.value)}
                          className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm dark:[color-scheme:dark]"
                        />
                      </div>
                      <div className="flex gap-2 items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={dlLoading}
                          onClick={() => handleDownloadUplinks('csv')}
                        >
                          {dlLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={dlLoading}
                          onClick={() => handleDownloadUplinks('json')}
                        >
                          {dlLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          JSON
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {dlFrom || dlTo
                        ? `Range: ${dlFrom || 'earliest'} → ${dlTo || 'now'}`
                        : 'Default: last 24 h · Max 31-day range'}
                    </p>
                  </Card>

                  {/* ── IO Payload Builder ── */}
                  <Card className="p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Zap className="h-4 w-4 text-amber-500" />
                      IO Control Payload Builder
                      <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                        3-byte SCADA protocol
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">IO Number</label>
                        <select
                          value={ioBuilderIO}
                          onChange={(e) => setIoBuilderIO(Number(e.target.value))}
                          className="w-28 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm dark:[color-scheme:dark]"
                        >
                          {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>IO {n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">State</label>
                        <select
                          value={ioBuilderState}
                          onChange={(e) => setIoBuilderState(e.target.value as 'ON' | 'OFF' | 'PULSE')}
                          className="w-28 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm dark:[color-scheme:dark]"
                        >
                          <option value="ON">ON</option>
                          <option value="OFF">OFF</option>
                          <option value="PULSE">PULSE</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => {
                          const b64 = buildIOPayload(ioBuilderIO, ioBuilderState);
                          setDownlinkForm((p) => ({ ...p, payload: b64 }));
                        }}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Insert into Payload
                      </Button>
                    </div>
                    <div className="mt-2 rounded-md bg-secondary/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      <span className="text-violet-400">hex:</span>{' '}
                      <span className="text-foreground">{ioPayloadHex(ioBuilderIO, ioBuilderState)}</span>
                      <span className="ml-4 text-violet-400">base64:</span>{' '}
                      <span className="text-foreground">{buildIOPayload(ioBuilderIO, ioBuilderState)}</span>
                    </div>
                  </Card>

                  {/* ── Downlink sender ── */}
                  <Card className="p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <Send className="h-4 w-4 text-brand-500" />
                      Send Downlink
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Port</label>
                        <input
                          type="number"
                          min={1}
                          max={223}
                          value={downlinkForm.fPort}
                          onChange={(e) => setDownlinkForm((p) => ({ ...p, fPort: Number(e.target.value) }))}
                          className="w-20 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <label className="text-xs text-muted-foreground">Payload (hex or base64)</label>
                        <input
                          type="text"
                          placeholder="e.g. AABB or base64..."
                          value={downlinkForm.payload}
                          onChange={(e) => setDownlinkForm((p) => ({ ...p, payload: e.target.value }))}
                          className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm font-mono"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={handleSendDownlink}
                          disabled={sendingDownlink || !downlinkForm.payload.trim()}
                          className="gap-1.5"
                        >
                          {sendingDownlink ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                    {downlinkResult === 'ok' && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Downlink queued successfully
                      </p>
                    )}
                    {downlinkResult === 'err' && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                        <XCircle className="h-3.5 w-3.5" />
                        Failed to queue downlink
                      </p>
                    )}
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

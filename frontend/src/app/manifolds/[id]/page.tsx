'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  acknowledgeAlarm,
  createSchedule,
  deleteSchedule,
  fetchManifoldDetail,
  sendValveCommand,
  updateSchedule,
  updateValveAlarmConfig,
  updateValveMode,
  updateValveStatus,
  updateValveTimer,
} from '@/store/slices/manifoldSlice';
import { AppDispatch, RootState } from '@/store/store';
import { createAuthenticatedSocket } from '@/lib/socket';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Box,
  Calendar,
  Clock3,
  Droplet,
  Gauge,
  LayoutDashboard,
  Loader2,
  MapPin,
  Power,
  PowerOff,
  Settings2,
  ShieldAlert,
  Sparkles,
  Timer,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

type AlarmRuleType = 'THRESHOLD' | 'STATUS';
type TabType = 'control' | '3d-view';

interface ValveAlarm {
  alarmId: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface ValveView {
  _id: string;
  valveNumber: number;
  esp32PinNumber: number;
  operationalData: {
    currentStatus: 'ON' | 'OFF' | 'FAULT';
    mode: 'AUTO' | 'MANUAL';
    cycleCount: number;
    autoOffDurationSec?: number;
  };
  alarms: ValveAlarm[];
  schedules: Array<{
    scheduleId: string;
    enabled: boolean;
    action: 'ON' | 'OFF';
    duration: number;
    startAt?: string;
    endAt?: string;
    cronExpression: string;
  }>;
  alarmConfig?: {
    enabled: boolean;
    ruleType: AlarmRuleType;
    metric: 'pressure' | 'flow' | 'runtime' | 'status';
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold?: number;
    triggerStatus?: 'FAULT' | 'OFF';
    notify: boolean;
  };
}

const Manifold3DViewer = dynamic(() => import('@/components/Manifold3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center bg-slate-900/80">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
    </div>
  ),
});

export default function ManifoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const manifoldId = params.id as string;
  const { selectedManifold, valves, loading, error } = useSelector((s: RootState) => s.manifolds);
  const manifoldValves = useMemo(
    () => (valves[manifoldId] || []) as ValveView[],
    [valves, manifoldId]
  );
  const [activeTab, setActiveTab] = useState<TabType>('control');

  const [timerDraft, setTimerDraft] = useState<Record<string, number>>({});
  const [scheduleDraft, setScheduleDraft] = useState<Record<string, { action: 'ON' | 'OFF'; duration: number; startAt: string; endAt: string }>>({});
  const [scheduleEditId, setScheduleEditId] = useState<Record<string, string | null>>({});
  const [alarmDraft, setAlarmDraft] = useState<Record<string, {
    enabled: boolean;
    ruleType: AlarmRuleType;
    metric: 'pressure' | 'flow' | 'runtime' | 'status';
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold?: number;
    triggerStatus?: 'FAULT' | 'OFF';
    notify: boolean;
  }>>({});

  useEffect(() => {
    if (manifoldId) dispatch(fetchManifoldDetail(manifoldId));
  }, [dispatch, manifoldId]);

  useEffect(() => {
    if (!selectedManifold) return;
    const socket = createAuthenticatedSocket();

    socket.on('connect', () => {
      socket.emit('joinManifold', selectedManifold.manifoldId);
      socket.emit('requestManifoldStatus', manifoldId);
    });

    socket.on('manifoldStatus', (data: { manifoldId: string; valves: Array<{ valveNumber: number; status: 'ON' | 'OFF' | 'FAULT' }> }) => {
      dispatch(updateValveStatus(data));
    });

    return () => {
      socket.emit('leaveManifold', selectedManifold.manifoldId);
      socket.disconnect();
    };
  }, [dispatch, manifoldId, selectedManifold]);

  const unackedAlarms = useMemo(
    () =>
      manifoldValves.flatMap((v) =>
        (v.alarms || [])
          .filter((a) => !a.acknowledged)
          .map((a) => ({ ...a, valveId: v._id, valveNumber: v.valveNumber }))
      ),
    [manifoldValves]
  );

  const isOnline =
    selectedManifold && typeof selectedManifold.esp32DeviceId === 'object'
      ? selectedManifold.esp32DeviceId.status === 'online'
      : true;

  const onValveCommand = (valveId: string, action: 'ON' | 'OFF') => {
    dispatch(sendValveCommand({ valveId, action }));
  };

  const toDateTimeLocal = (date?: string) => {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const valveStatesFor3D = manifoldValves.map((v) => ({
    id: v.valveNumber,
    label: `Valve ${v.valveNumber}`,
    isOpen: v.operationalData.currentStatus === 'ON',
    pressure: 0,
    flowRate: 0,
  }));

  const activeValveCount = manifoldValves.filter((v) => v.operationalData.currentStatus === 'ON').length;

  if (loading || !selectedManifold) {
    return (
      <MainLayout>
        <div className="relative min-h-screen">
          <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />
          <div className="relative z-10 flex h-screen items-center justify-center text-muted-foreground">Loading manifold...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />
        <div className="container relative z-10 px-4 py-6 md:py-8 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button variant="ghost" onClick={() => router.push('/manifolds')} className="mb-2 px-0 hover:bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to manifolds
              </Button>
              <h1 className="text-3xl font-semibold">{selectedManifold.name}</h1>
              <p className="text-sm text-muted-foreground font-mono">{selectedManifold.manifoldId}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={isOnline ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}>
                {isOnline ? <Wifi className="mr-1 h-3.5 w-3.5" /> : <WifiOff className="mr-1 h-3.5 w-3.5" />}
                {isOnline ? 'Connected' : 'Disconnected'}
              </Badge>
              <Badge variant={selectedManifold.status === 'Active' ? 'default' : 'secondary'}>
                {selectedManifold.status}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('control')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                activeTab === 'control'
                  ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-secondary/60 border border-border/50 hover:border-brand-500/30'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Control Panel
              {activeTab === 'control' && <Sparkles className="h-3 w-3 opacity-70" />}
            </button>
            <button
              onClick={() => setActiveTab('3d-view')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all ${
                activeTab === '3d-view'
                  ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-secondary/60 border border-border/50 hover:border-brand-500/30'
              }`}
            >
              <Box className="h-4 w-4" />
              3D View
              {activeTab === '3d-view' && <Sparkles className="h-3 w-3 opacity-70" />}
            </button>
          </div>

          {error && <Card className="p-3 text-sm text-red-500 border-red-500/30">{error}</Card>}

          {activeTab === 'control' && unackedAlarms.length > 0 && (
            <Card className="p-4 border-red-500/30 bg-red-500/5">
              <div className="mb-3 flex items-center gap-2 text-red-500">
                <ShieldAlert className="h-4 w-4" />
                Active alarms ({unackedAlarms.length})
              </div>
              <div className="space-y-2">
                {unackedAlarms.map((alarm) => (
                  <div key={alarm.alarmId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background/70 p-3">
                    <div>
                      <p className="text-sm">Valve {alarm.valveNumber}: {alarm.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(alarm.timestamp).toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dispatch(acknowledgeAlarm({ valveId: alarm.valveId, alarmId: alarm.alarmId }))}
                    >
                      Acknowledge
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'control' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {[...manifoldValves].sort((a, b) => a.valveNumber - b.valveNumber).map((valve) => {
                  const alarmForm = alarmDraft[valve._id] || valve.alarmConfig || {
                    enabled: false,
                    ruleType: 'STATUS',
                    metric: 'status' as const,
                    operator: '==' as const,
                    threshold: 0,
                    triggerStatus: 'FAULT' as const,
                    notify: true,
                  };
                  const scheduleForm = scheduleDraft[valve._id] || {
                    action: 'ON' as 'ON' | 'OFF',
                    duration: 0,
                    startAt: '',
                    endAt: '',
                  };
                  const timerValue = timerDraft[valve._id] ?? valve.operationalData.autoOffDurationSec ?? 0;
                  const isOn = valve.operationalData.currentStatus === 'ON';
                  const isAuto = valve.operationalData.mode === 'AUTO';
                  const activeSchedules = (valve.schedules || []).filter((s) => s.enabled);
                  const valveAlarmCount = (valve.alarms || []).filter((a) => !a.acknowledged).length;

                  return (
                    <Card key={valve._id} className="overflow-hidden border-border/60 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold">Valve {valve.valveNumber}</h3>
                          <p className="text-xs text-muted-foreground">
                            GPIO {valve.esp32PinNumber} • Cycles {valve.operationalData.cycleCount}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={isOn ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}>
                            {valve.operationalData.currentStatus}
                          </Badge>
                          <Badge variant={isAuto ? 'default' : 'secondary'}>
                            {isAuto ? 'AUTO' : 'MANUAL'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border border-border/50 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant={isAuto ? 'outline' : 'default'}
                              onClick={() => dispatch(updateValveMode({ valveId: valve._id, mode: 'MANUAL' }))}
                              className={!isAuto ? 'bg-brand-600 hover:bg-brand-700 text-white' : ''}
                            >
                              Manual
                            </Button>
                            <Button
                              variant={isAuto ? 'default' : 'outline'}
                              onClick={() => dispatch(updateValveMode({ valveId: valve._id, mode: 'AUTO' }))}
                              className={isAuto ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                            >
                              Auto
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => onValveCommand(valve._id, 'ON')}
                              disabled={!isOnline || isAuto}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Power className="mr-1 h-4 w-4" />
                              ON
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => onValveCommand(valve._id, 'OFF')}
                              disabled={!isOnline || isAuto}
                            >
                              <PowerOff className="mr-1 h-4 w-4" />
                              OFF
                            </Button>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-secondary/40 px-2 py-1.5 text-xs">
                            <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-amber-500" /> Auto-off</span>
                            <span>{timerValue}s</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              value={timerValue}
                              onChange={(e) => setTimerDraft((prev) => ({ ...prev, [valve._id]: Number(e.target.value) }))}
                              className="w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
                            />
                            <Button size="sm" onClick={() => dispatch(updateValveTimer({ valveId: valve._id, autoOffDurationSec: timerValue }))}>
                              Save
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-lg border border-border/50 p-3">
                          <div className="rounded-md bg-secondary/30 p-2 text-xs">
                            <div className="mb-1 flex items-center gap-1 font-medium">
                              <Clock3 className="h-3.5 w-3.5 text-indigo-500" />
                              Scheduling ({activeSchedules.length})
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="datetime-local"
                                value={scheduleForm.startAt}
                                onChange={(e) =>
                                  setScheduleDraft((prev) => ({ ...prev, [valve._id]: { ...scheduleForm, startAt: e.target.value } }))
                                }
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground dark:[color-scheme:dark]"
                              />
                              <input
                                type="datetime-local"
                                value={scheduleForm.endAt}
                                onChange={(e) =>
                                  setScheduleDraft((prev) => ({ ...prev, [valve._id]: { ...scheduleForm, endAt: e.target.value } }))
                                }
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground dark:[color-scheme:dark]"
                              />
                              <select
                                value={scheduleForm.action}
                                onChange={(e) => setScheduleDraft((prev) => ({ ...prev, [valve._id]: { ...scheduleForm, action: e.target.value as 'ON' | 'OFF' } }))}
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground dark:[color-scheme:dark]"
                              >
                                <option value="ON">Start ON</option>
                                <option value="OFF">Start OFF</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                value={scheduleForm.duration}
                                onChange={(e) => setScheduleDraft((prev) => ({ ...prev, [valve._id]: { ...scheduleForm, duration: Number(e.target.value) } }))}
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs text-foreground"
                                placeholder="Duration sec"
                              />
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const editId = scheduleEditId[valve._id];
                                  if (editId) {
                                    dispatch(updateSchedule({
                                      valveId: valve._id,
                                      scheduleId: editId,
                                      data: {
                                        action: scheduleForm.action,
                                        duration: scheduleForm.duration,
                                        startAt: scheduleForm.startAt ? new Date(scheduleForm.startAt).toISOString() : undefined,
                                        endAt: scheduleForm.endAt ? new Date(scheduleForm.endAt).toISOString() : undefined,
                                        cronExpression: '',
                                      },
                                    }));
                                    setScheduleEditId((prev) => ({ ...prev, [valve._id]: null }));
                                  } else {
                                    dispatch(createSchedule({
                                      valveId: valve._id,
                                      cronExpression: '',
                                      action: scheduleForm.action,
                                      duration: scheduleForm.duration,
                                      startAt: scheduleForm.startAt ? new Date(scheduleForm.startAt).toISOString() : undefined,
                                      endAt: scheduleForm.endAt ? new Date(scheduleForm.endAt).toISOString() : undefined,
                                      enabled: true,
                                    }));
                                  }
                                }}
                                disabled={!scheduleForm.startAt || !scheduleForm.endAt}
                              >
                                {scheduleEditId[valve._id] ? 'Update' : 'Add'}
                              </Button>
                              {scheduleEditId[valve._id] && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setScheduleEditId((prev) => ({ ...prev, [valve._id]: null }));
                                    setScheduleDraft((prev) => ({ ...prev, [valve._id]: { action: 'ON', duration: 0, startAt: '', endAt: '' } }));
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              {valve.schedules.map((schedule) => (
                                <div key={schedule.scheduleId} className="flex items-center justify-between gap-2 rounded border border-border/50 px-2 py-1.5 text-[11px]">
                                  <div className="min-w-0">
                                    <p className="truncate">
                                      {schedule.startAt && schedule.endAt
                                        ? `${new Date(schedule.startAt).toLocaleString()} → ${new Date(schedule.endAt).toLocaleString()}`
                                        : schedule.cronExpression || 'No time range'}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {schedule.action} • {schedule.duration}s • {schedule.enabled ? 'Enabled' : 'Disabled'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={() => {
                                        setScheduleEditId((prev) => ({ ...prev, [valve._id]: schedule.scheduleId }));
                                        setScheduleDraft((prev) => ({
                                          ...prev,
                                          [valve._id]: {
                                            action: schedule.action,
                                            duration: schedule.duration,
                                            startAt: toDateTimeLocal(schedule.startAt),
                                            endAt: toDateTimeLocal(schedule.endAt),
                                          },
                                        }));
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={() =>
                                        dispatch(updateSchedule({
                                          valveId: valve._id,
                                          scheduleId: schedule.scheduleId,
                                          data: { enabled: !schedule.enabled },
                                        }))
                                      }
                                    >
                                      {schedule.enabled ? 'Disable' : 'Enable'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={() => dispatch(deleteSchedule({ valveId: valve._id, scheduleId: schedule.scheduleId }))}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-md bg-secondary/30 p-2 text-xs">
                            <div className="mb-1 flex items-center gap-1 font-medium">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                              Alarm ({valveAlarmCount} active)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={alarmForm.ruleType}
                                onChange={(e) => setAlarmDraft((prev) => ({ ...prev, [valve._id]: { ...alarmForm, ruleType: e.target.value as AlarmRuleType } }))}
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-foreground dark:[color-scheme:dark]"
                              >
                                <option value="STATUS">Status</option>
                                <option value="THRESHOLD">Threshold</option>
                              </select>
                              <select
                                value={alarmForm.metric}
                                onChange={(e) => setAlarmDraft((prev) => ({ ...prev, [valve._id]: { ...alarmForm, metric: e.target.value as 'pressure' | 'flow' | 'runtime' | 'status' } }))}
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-foreground dark:[color-scheme:dark]"
                              >
                                <option value="status">status</option>
                                <option value="pressure">pressure</option>
                                <option value="flow">flow</option>
                                <option value="runtime">runtime</option>
                              </select>
                              <input
                                type="number"
                                value={alarmForm.threshold ?? 0}
                                onChange={(e) => setAlarmDraft((prev) => ({ ...prev, [valve._id]: { ...alarmForm, threshold: Number(e.target.value) } }))}
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-foreground"
                              />
                              <select
                                value={alarmForm.triggerStatus || 'FAULT'}
                                onChange={(e) => setAlarmDraft((prev) => ({ ...prev, [valve._id]: { ...alarmForm, triggerStatus: e.target.value as 'FAULT' | 'OFF' } }))}
                                className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-foreground dark:[color-scheme:dark]"
                              >
                                <option value="FAULT">FAULT</option>
                                <option value="OFF">OFF</option>
                              </select>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={alarmForm.enabled}
                                  onChange={(e) => setAlarmDraft((prev) => ({ ...prev, [valve._id]: { ...alarmForm, enabled: e.target.checked } }))}
                                />
                                Enabled
                              </label>
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={alarmForm.notify}
                                  onChange={(e) => setAlarmDraft((prev) => ({ ...prev, [valve._id]: { ...alarmForm, notify: e.target.checked } }))}
                                />
                                Notify
                              </label>
                              <Button size="sm" className="ml-auto" onClick={() => dispatch(updateValveAlarmConfig({ valveId: valve._id, alarmConfig: alarmForm }))}>
                                <Settings2 className="mr-1 h-3.5 w-3.5" />
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-brand-500" />
                    Installation
                  </h3>
                  <p className="text-sm">{selectedManifold.installationDetails.location || 'Not specified'}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(selectedManifold.installationDetails.installationDate).toLocaleDateString()}
                  </p>
                </Card>

                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Gauge className="h-4 w-4 text-brand-500" />
                    Specifications
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Inlet</span><span>{selectedManifold.specifications.inletSize}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Outlet</span><span>{selectedManifold.specifications.outletSize}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Max Pressure</span><span>{selectedManifold.specifications.maxPressure} PSI</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Max Flow</span><span>{selectedManifold.specifications.maxFlowRate} GPM</span></div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Droplet className="h-4 w-4 text-brand-500" />
                    Statistics
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Cycles</span><span>{selectedManifold.metadata.totalCycles.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Active Valves</span><span>{activeValveCount}/{manifoldValves.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Unacked Alarms</span><span>{unackedAlarms.length}</span></div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-brand-500" />
                    Live Summary
                  </h3>
                  <div className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-brand-500" />
                      Device {isOnline ? 'connected' : 'disconnected'} • {selectedManifold.status}
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === '3d-view' && (
            <div className="space-y-4">
              <Card className="overflow-hidden p-0">
                <div className="h-[560px] lg:h-[680px]">
                  <Manifold3DViewer
                    valves={valveStatesFor3D}
                    ptfcOn={false}
                    sasfOn={false}
                    pressures={{ inlet: 0, postFilter: 0, distribution: 0, outlets: [0, 0, 0, 0] }}
                    flowRates={[0, 0, 0, 0]}
                    maxPressure={10}
                    isOnline={isOnline}
                    onValveClick={(id: number) => {
                      const valve = manifoldValves.find((v) => v.valveNumber === id);
                      if (!valve) return;
                      const action = valve.operationalData.currentStatus === 'ON' ? 'OFF' : 'ON';
                      onValveCommand(valve._id, action);
                    }}
                    onPTFCClick={() => {}}
                    onSASFClick={() => {}}
                  />
                </div>
              </Card>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="p-4 text-sm">
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-semibold">MANIFOLD-27</p>
                </Card>
                <Card className="p-4 text-sm">
                  <p className="text-muted-foreground">Active Valves</p>
                  <p className="font-semibold">{activeValveCount} / {manifoldValves.length}</p>
                </Card>
                <Card className="p-4 text-sm">
                  <p className="text-muted-foreground">Connection</p>
                  <p className="font-semibold">{isOnline ? 'Online' : 'Offline'}</p>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

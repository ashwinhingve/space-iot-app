'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AnimatedBackground from '@/components/AnimatedBackground';
import {
  fetchManifoldDetail,
  sendValveCommand,
  updateValveStatus,
  acknowledgeAlarm,
} from '@/store/slices/manifoldSlice';
import { RootState, AppDispatch } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Power,
  PowerOff,
  Activity,
  MapPin,
  Calendar,
  Gauge,
  Droplet,
  AlertTriangle,
  Settings,
  Wifi,
  WifiOff,
  Eye,
  Box,
  LayoutDashboard,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '@/lib/config';

const Manifold3DViewer = dynamic(
  () => import('@/components/Manifold3DViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
        <p className="text-white/60 text-sm">Loading 3D Model...</p>
      </div>
    )
  }
);

type TabType = 'control' | '3d-view' | 'diagram';

export default function ManifoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const manifoldId = params.id as string;

  const { selectedManifold, valves, loading } = useSelector(
    (state: RootState) => state.manifolds
  );
  const socketRef = useRef<Socket | null>(null);
  const [localValveStates, setLocalValveStates] = useState<{
    [key: number]: string;
  }>({});
  const [activeTab, setActiveTab] = useState<TabType>('control');

  // Fetch manifold details on mount
  useEffect(() => {
    if (manifoldId) {
      dispatch(fetchManifoldDetail(manifoldId));
    }
  }, [manifoldId, dispatch]);

  // Socket.io real-time connection
  useEffect(() => {
    if (!selectedManifold) return;

    const socket = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Socket.io');
      socket.emit('joinManifold', selectedManifold.manifoldId);
      socket.emit('requestManifoldStatus', manifoldId);
    });

    socket.on('manifoldStatus', (data: { valves?: Array<{ valveNumber: number; status: string }> }) => {
      console.log('Manifold status update:', data);
      dispatch(updateValveStatus(data));

      // Update local state for immediate UI feedback
      const newStates: { [key: number]: string } = {};
      data.valves?.forEach((v) => {
        newStates[v.valveNumber] = v.status;
      });
      setLocalValveStates(newStates);
    });

    socket.on('commandAcknowledged', (data: { valveId: string; action: string }) => {
      console.log('Command acknowledged:', data);
    });

    socket.on('manifoldOnline', (data: { manifoldId: string; online: boolean }) => {
      console.log('Manifold online status:', data);
    });

    return () => {
      socket.emit('leaveManifold', selectedManifold.manifoldId);
      socket.disconnect();
    };
  }, [selectedManifold, manifoldId, dispatch]);

  const manifoldValves = valves[manifoldId] || [];

  const handleValveCommand = async (valveId: string, action: 'ON' | 'OFF') => {
    // Optimistic update
    const valve = manifoldValves.find((v) => v._id === valveId);
    if (valve) {
      setLocalValveStates((prev) => ({
        ...prev,
        [valve.valveNumber]: action,
      }));
    }

    try {
      await dispatch(sendValveCommand({ valveId, action }));
    } catch (error) {
      console.error('Failed to send valve command:', error);
      // Revert on error
      if (valve) {
        setLocalValveStates((prev) => ({
          ...prev,
          [valve.valveNumber]: valve.operationalData.currentStatus,
        }));
      }
    }
  };

  const handleAcknowledgeAlarm = async (valveId: string, alarmId: string) => {
    try {
      await dispatch(acknowledgeAlarm({ valveId, alarmId }));
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  };

  const handleValveClickFrom3D = (valveNumber: number) => {
    const valve = manifoldValves.find((v) => v.valveNumber === valveNumber);
    if (valve) {
      // Toggle the valve state
      const currentStatus = getValveStatus(valve);
      const newAction = currentStatus === 'ON' ? 'OFF' : 'ON';
      handleValveCommand(valve._id, newAction);
    }
  };

  if (loading || !selectedManifold) {
    return (
      <MainLayout>
        <div className="relative min-h-screen">
          <AnimatedBackground variant="subtle" showParticles={false} />
          <div className="relative z-10 flex flex-col items-center justify-center h-screen gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <div className="h-14 w-14 rounded-full border-2 border-transparent border-t-brand-500 border-r-purple-500" />
              </motion.div>
            </div>
            <motion.p
              className="text-muted-foreground text-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading manifold details...
            </motion.p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const getValveStatus = (valve: { valveNumber: number; operationalData: { currentStatus: string } }) => {
    return localValveStates[valve.valveNumber] || valve.operationalData.currentStatus;
  };

  const isOnline =
    typeof selectedManifold.esp32DeviceId === 'object'
      ? selectedManifold.esp32DeviceId.status === 'online'
      : true;

  // Get all unacknowledged alarms
  const allAlarms = manifoldValves.flatMap((v) =>
    v.alarms
      .filter((a) => !a.acknowledged)
      .map((a) => ({ ...a, valveId: v._id, valveNumber: v.valveNumber }))
  );

  // Prepare valve data for 3D viewer
  const valveStatesFor3D = manifoldValves.map((v) => ({
    valveNumber: v.valveNumber,
    status: getValveStatus(v) as 'ON' | 'OFF' | 'FAULT',
    mode: v.operationalData.mode as 'AUTO' | 'MANUAL',
    cycleCount: v.operationalData.cycleCount,
  }));

  const tabs = [
    { id: 'control' as TabType, label: 'Control Panel', icon: LayoutDashboard },
    { id: '3d-view' as TabType, label: '3D View', icon: Box },
  ];

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        {/* Animated Background */}
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="container relative z-10 py-6">
          {/* Header */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                variant="ghost"
                onClick={() => router.push('/manifolds')}
                className="mb-4 hover:bg-secondary/80 group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to Manifolds
              </Button>
            </motion.div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  {selectedManifold.name}
                </h1>
                <p className="text-muted-foreground font-mono text-sm flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  {selectedManifold.manifoldId}
                </p>
              </motion.div>

              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Badge
                    variant={isOnline ? 'default' : 'secondary'}
                    className={`flex items-center gap-2 px-4 py-2 transition-all duration-300 ${
                      isOnline
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30'
                        : 'bg-slate-500'
                    }`}
                  >
                    {isOnline ? (
                      <Wifi className="h-4 w-4" />
                    ) : (
                      <WifiOff className="h-4 w-4" />
                    )}
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Badge
                    variant={
                      selectedManifold.status === 'Active' ? 'default' : 'secondary'
                    }
                    className={`transition-all duration-300 ${
                      selectedManifold.status === 'Active'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30'
                        : selectedManifold.status === 'Fault'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-500/30'
                        : ''
                    }`}
                  >
                    {selectedManifold.status}
                  </Badge>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            className="flex gap-2 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white shadow-lg shadow-brand-500/25'
                    : 'bg-secondary/50 hover:bg-secondary/80 border border-border/50 hover:border-brand-500/30'
                }`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <Sparkles className="h-3 w-3 ml-1 opacity-70" />
                )}
              </motion.button>
            ))}
          </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'control' && (
            <motion.div
              key="control"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Valve Control */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Alarms */}
                  {allAlarms.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-6 border-red-500/50 bg-red-500/5">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <h3 className="font-semibold text-red-600">
                            Active Alarms ({allAlarms.length})
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {allAlarms.map((alarm) => (
                            <div
                              key={alarm.alarmId}
                              className="flex items-start justify-between gap-4 p-3 bg-background rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  Valve {alarm.valveNumber}: {alarm.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(alarm.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleAcknowledgeAlarm(alarm.valveId, alarm.alarmId)
                                }
                              >
                                Acknowledge
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Valve Control Panel */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-brand-600" />
                        Valve Control Panel
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...manifoldValves]
                          .sort((a, b) => a.valveNumber - b.valveNumber)
                          .map((valve) => {
                            const status = getValveStatus(valve);
                            const isOn = status === 'ON';
                            const isFault = status === 'FAULT';

                            return (
                              <div
                                key={valve._id}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                  isOn
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : isFault
                                    ? 'border-red-500 bg-red-500/10'
                                    : 'border-border bg-secondary/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h4 className="font-semibold">
                                      Valve {valve.valveNumber}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      GPIO {valve.esp32PinNumber}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={isOn ? 'default' : 'secondary'}
                                    className={
                                      isOn
                                        ? 'bg-emerald-500'
                                        : isFault
                                        ? 'bg-red-500'
                                        : ''
                                    }
                                  >
                                    {status}
                                  </Badge>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    className={`flex-1 ${
                                      isOn
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : ''
                                    }`}
                                    variant={isOn ? 'default' : 'outline'}
                                    onClick={() => handleValveCommand(valve._id, 'ON')}
                                    disabled={
                                      !isOnline ||
                                      valve.operationalData.mode === 'AUTO'
                                    }
                                  >
                                    <Power className="h-4 w-4 mr-2" />
                                    ON
                                  </Button>
                                  <Button
                                    className={`flex-1 ${
                                      !isOn && !isFault
                                        ? 'bg-slate-500 hover:bg-slate-600'
                                        : ''
                                    }`}
                                    variant={!isOn && !isFault ? 'default' : 'outline'}
                                    onClick={() =>
                                      handleValveCommand(valve._id, 'OFF')
                                    }
                                    disabled={
                                      !isOnline ||
                                      valve.operationalData.mode === 'AUTO'
                                    }
                                  >
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    OFF
                                  </Button>
                                </div>

                                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Mode: {valve.operationalData.mode}</span>
                                  <span>Cycles: {valve.operationalData.cycleCount}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Right Column - Info & Stats */}
                <div className="space-y-6">
                  {/* Installation Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-brand-600" />
                        Installation Details
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-muted-foreground text-xs">Location</p>
                            <p className="font-medium">
                              {selectedManifold.installationDetails.location ||
                                'Not specified'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Installation Date
                            </p>
                            <p className="font-medium">
                              {new Date(
                                selectedManifold.installationDetails.installationDate
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Specifications */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-brand-600" />
                        Specifications
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Inlet Size</span>
                          <span className="font-medium">
                            {selectedManifold.specifications.inletSize}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Outlet Size</span>
                          <span className="font-medium">
                            {selectedManifold.specifications.outletSize}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Pressure</span>
                          <span className="font-medium">
                            {selectedManifold.specifications.maxPressure} PSI
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Flow Rate</span>
                          <span className="font-medium">
                            {selectedManifold.specifications.maxFlowRate} GPM
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Statistics */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Droplet className="h-5 w-5 text-brand-600" />
                        Statistics
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Total Cycles
                          </p>
                          <p className="text-2xl font-bold">
                            {selectedManifold.metadata.totalCycles.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Active Valves
                          </p>
                          <p className="text-2xl font-bold">
                            {
                              manifoldValves.filter(
                                (v) => getValveStatus(v) === 'ON'
                              ).length
                            }
                            /{manifoldValves.length}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === '3d-view' && (
            <motion.div
              key="3d-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-0 overflow-hidden">
                <div className="h-[600px] lg:h-[700px]">
                  <Manifold3DViewer
                    valves={valveStatesFor3D}
                    manifoldName={selectedManifold.name}
                    isOnline={isOnline}
                    onValveClick={handleValveClickFrom3D}
                  />
                </div>
              </Card>

              {/* 3D View Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                      <Box className="h-5 w-5 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Model Type</p>
                      <p className="font-semibold">MANIFOLD-27</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active Valves</p>
                      <p className="font-semibold">
                        {valveStatesFor3D.filter((v) => v.status === 'ON').length} / {valveStatesFor3D.length}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isOnline ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}>
                      {isOnline ? (
                        <Wifi className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Connection</p>
                      <p className="font-semibold">{isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Interactive Instructions */}
              <Card className="p-4 mt-4 bg-secondary/30 backdrop-blur-sm border-border/50 hover:border-brand-500/20 transition-colors">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-brand-500" />
                  Interactive Controls
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 group/kbd">
                    <kbd className="px-2.5 py-1.5 bg-background/80 rounded-md text-xs font-mono border border-border/50 group-hover/kbd:border-brand-500/30 transition-colors">Drag</kbd>
                    <span>Rotate view</span>
                  </div>
                  <div className="flex items-center gap-2 group/kbd">
                    <kbd className="px-2.5 py-1.5 bg-background/80 rounded-md text-xs font-mono border border-border/50 group-hover/kbd:border-brand-500/30 transition-colors">Scroll</kbd>
                    <span>Zoom in/out</span>
                  </div>
                  <div className="flex items-center gap-2 group/kbd">
                    <kbd className="px-2.5 py-1.5 bg-background/80 rounded-md text-xs font-mono border border-border/50 group-hover/kbd:border-brand-500/30 transition-colors">Right-drag</kbd>
                    <span>Pan view</span>
                  </div>
                  <div className="flex items-center gap-2 group/kbd">
                    <kbd className="px-2.5 py-1.5 bg-background/80 rounded-md text-xs font-mono border border-border/50 group-hover/kbd:border-brand-500/30 transition-colors">Click valve</kbd>
                    <span>Toggle state</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import AnalyticsChart from '@/components/dashboard/AnalyticsChart';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import SystemHealthMonitor from '@/components/dashboard/SystemHealthMonitor';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { RootState, AppDispatch } from '@/store/store';
import { fetchDevices, updateDeviceData, updateDeviceStatus } from '@/store/slices/deviceSlice';
import {
  fetchDashboardStats,
  fetchAnalytics,
  fetchAlerts,
  updateSystemHealth,
  addActivity,
  acknowledgeAlert,
} from '@/store/slices/dashboardSlice';
import { fetchTTNApplications } from '@/store/slices/ttnSlice';
import { createAuthenticatedSocket } from '@/lib/socket';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  FileText,
  ExternalLink,
  Activity,
  Map,
  Zap,
  BarChart3,
  Monitor,
  Droplets,
  ChevronRight,
  ChevronDown,
  HeartPulse,
  Eye,
  Sparkles,
  Radio,
  Cpu,
  Signal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Report sub-items ────────────────────────────────────────
const REPORT_SUBITEMS = [
  { label: 'Pump Reports', icon: Droplets },
  { label: 'Electrical Reports', icon: Zap },
  { label: 'OMS Reports', icon: BarChart3 },
  { label: 'RSSI Reports', icon: Wifi },
];

// ─── Project overview subsystem definitions ──────────────────
const PROJECT_SUBSYSTEMS = [
  {
    title: 'Pump House SCADA',
    description: 'Real-time valve monitoring & control',
    href: '/scada',
    icon: Monitor,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    subBadge: { label: 'SLD', icon: Zap, color: 'text-amber-400' },
  },
  {
    title: 'OMS Dashboard',
    description: 'Operations management & geographic mapping',
    href: '/oms',
    icon: BarChart3,
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
    subBadge: { label: 'Map', icon: Map, color: 'text-emerald-400' },
  },
] as const;

type DateRange = '7d' | '30d' | '90d';

// ─── Circular Progress Ring ──────────────────────────────────
function CircularProgress({ percent, color }: { percent: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
      <motion.circle
        cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ─── PDF Export Helper ───────────────────────────────────────
function generatePDFContent(labels: string[], connected: number[], disconnected: number[], dateRange: string): string {
  const rows = labels.map((label, i) =>
    `${label},${connected[i]},${disconnected[i]}`
  ).join('\n');

  // Simple text-based report (actual PDF would need a library like jspdf)
  return `IoT Space - Device Connection Report
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}
${'='.repeat(50)}

Date,Connected,Disconnected
${rows}

${'='.repeat(50)}
Total Records: ${labels.length}
`;
}

// ═════════════════════════════════════════════════════════════
// ═════ DASHBOARD PAGE ═══════════════════════════════════════
// ═════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [showProjectOverview, setShowProjectOverview] = useState(false);
  const projectOverviewRef = useRef<HTMLDivElement>(null);

  const { stats, analytics, systemHealth, alerts, recentActivity } = useSelector(
    (state: RootState) => state.dashboard
  );
  const { applications: ttnApplications, devices: ttnDevices, loading: ttnLoading } = useSelector(
    (state: RootState) => state.ttn
  );

  // ─── Data fetching ─────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      dispatch(fetchDevices()),
      dispatch(fetchDashboardStats()),
      dispatch(fetchAnalytics()),
      dispatch(fetchAlerts()),
      dispatch(fetchTTNApplications()),
    ]);
    setIsRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Socket.io connection ──────────────────────────────────
  useEffect(() => {
    const newSocket = createAuthenticatedSocket();

    newSocket.on('connect', () => {
      setIsConnected(true);
      dispatch(updateSystemHealth({ network: 'excellent' }));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      dispatch(updateSystemHealth({ network: 'poor' }));
    });

    newSocket.on('deviceData', (data: { deviceId: string; data: Record<string, unknown> }) => {
      dispatch(updateDeviceData({ deviceId: data.deviceId, data: data.data }));
      dispatch(addActivity({ action: 'Data received', device: data.deviceId, status: 'success' }));
    });

    newSocket.on('deviceStatus', (data: { deviceId: string; status: string }) => {
      dispatch(updateDeviceStatus({ deviceId: data.deviceId, status: data.status }));
      dispatch(addActivity({
        action: `Device ${data.status}`,
        device: data.deviceId,
        status: data.status === 'online' ? 'success' : 'warning',
      }));
      dispatch(fetchDashboardStats());
    });

    // Set stable system health on mount (no random simulation)
    dispatch(updateSystemHealth({
      uptime: Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 1000),
      lastUpdated: new Date().toISOString(),
    }));

    return () => {
      newSocket.disconnect();
    };
  }, [dispatch]);

  // ─── Auto-refresh every 30s ────────────────────────────────
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      dispatch(fetchDashboardStats());
      dispatch(fetchAlerts());
    }, 30000);
    return () => clearInterval(refreshInterval);
  }, [dispatch]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleAcknowledgeAlert = (alertId: string) => {
    dispatch(acknowledgeAlert(alertId));
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleToggleProjectOverview = () => {
    setShowProjectOverview((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          projectOverviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return next;
    });
  };

  // ─── TTN / LoRaWAN computed metrics ────────────────────────
  const ttnOnlineDevices = ttnDevices.filter((d) => d.isOnline).length;
  const ttnTotalUplinks = ttnDevices.reduce((sum, d) => sum + (d.metrics?.totalUplinks ?? 0), 0);

  // ─── Device stats ──────────────────────────────────────────
  const totalDevices = stats.devicesOnline + stats.devicesOffline;
  const connectedPercent = totalDevices > 0 ? Math.round((stats.devicesOnline / totalDevices) * 100) : 0;
  const disconnectedPercent = totalDevices > 0 ? 100 - connectedPercent : 0;

  // ─── Connection chart data ─────────────────────────────────
  const connectionChartData = useMemo(() => {
    const activity = analytics?.deviceActivity;
    if (!activity) {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          { name: 'Connected', data: [0, 0, 0, 0, 0, 0, 0], color: '#10b981' },
          { name: 'Disconnected', data: [0, 0, 0, 0, 0, 0, 0], color: '#ef4444' },
        ],
      };
    }

    const sliceCount = dateRange === '7d' ? 7 : dateRange === '30d' ? Math.min(activity.labels.length, 30) : activity.labels.length;
    const labels = activity.labels.slice(-sliceCount);
    const data = activity.data.slice(-sliceCount);

    const connected = data.map((val) => Math.round(val * (connectedPercent / 100)));
    const disconnected = data.map((val) => val - Math.round(val * (connectedPercent / 100)));

    return {
      labels,
      datasets: [
        { name: 'Connected', data: connected, color: '#10b981' },
        { name: 'Disconnected', data: disconnected, color: '#ef4444' },
      ],
    };
  }, [analytics, dateRange, connectedPercent]);

  // ─── CSV Export ────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Date', 'Connected', 'Disconnected'];
    const rows = connectionChartData.labels.map((label, i) => [
      label,
      connectionChartData.datasets[0].data[i],
      connectionChartData.datasets[1].data[i],
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iot-connection-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── PDF Export ────────────────────────────────────────────
  const handleExportPDF = () => {
    const content = generatePDFContent(
      connectionChartData.labels,
      connectionChartData.datasets[0].data,
      connectionChartData.datasets[1].data,
      dateRange
    );
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iot-connection-report-${dateRange}-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deviceActivityChart = analytics?.deviceActivity || {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0],
  };

  // ═════════════════════════════════════════════════════════
  // ═════ RENDER ═══════════════════════════════════════════
  // ═════════════════════════════════════════════════════════
  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl">

          {/* ══════════════════════════════════════════════════
              1. HEADER — Logos + Project Name + Status
              ══════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              {/* Department Logo */}
              <motion.div
                className="relative flex-shrink-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-background/50 backdrop-blur-sm">
                  <Image src="/logo-dept.svg" alt="Department Logo" width={56} height={56} className="w-full h-full object-cover" />
                </div>
              </motion.div>

              {/* Project Title */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600">
                  Space Auto Tech
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  IoT SCADA Monitoring & Control System
                </p>
              </div>

              {/* Company Logo */}
              <motion.div
                className="relative flex-shrink-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-background/50 backdrop-blur-sm">
                  <Image src="/logo-sat.svg" alt="Space Auto Tech Logo" width={56} height={56} className="w-full h-full object-cover" />
                </div>
              </motion.div>
            </div>

            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Connection Status Pill */}
              <motion.div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border transition-all duration-300 ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`} />
                {isConnected ? 'Live' : 'Offline'}
              </motion.div>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2 backdrop-blur-sm hover:bg-secondary/80 hover:border-brand-500/30 transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>
          </motion.div>

          {/* ══════════════════════════════════════════════════
              2. SYSTEM HEALTH — Clickable to open /devices
              Shows Total, Connected %, Disconnected %
              ══════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <HeartPulse className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-foreground">System Health</h2>
              <span className="text-xs text-muted-foreground ml-1">- Click cards for device details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Devices — Opens device list */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 backdrop-blur-xl shadow-lg shadow-blue-500/10 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                          <Activity className="h-6 w-6" />
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                      <motion.p
                        className="text-4xl font-bold text-foreground mt-1"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                      >
                        {totalDevices}
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 group-hover:text-brand-400 transition-colors">
                        View all devices <ExternalLink className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Connected Devices — % + count + status */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 backdrop-blur-xl shadow-lg shadow-emerald-500/10 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Wifi className="h-4 w-4 text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">Connected</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ONLINE
                          </span>
                        </div>
                        <motion.p
                          className="text-3xl font-bold text-emerald-400"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        >
                          {connectedPercent}%
                        </motion.p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {stats.devicesOnline} of {totalDevices} devices online
                        </p>
                      </div>
                      <div className="relative">
                        <CircularProgress percent={connectedPercent} color="#10b981" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {stats.devicesOnline}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Disconnected Devices — % + count + status */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-red-500/15 to-red-600/5 border border-red-500/25 backdrop-blur-xl shadow-lg shadow-red-500/10 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-red-500/20">
                            <WifiOff className="h-4 w-4 text-red-400" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">Disconnected</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                            OFFLINE
                          </span>
                        </div>
                        <motion.p
                          className="text-3xl font-bold text-red-400"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.6 }}
                        >
                          {disconnectedPercent}%
                        </motion.p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {stats.devicesOffline} of {totalDevices} devices offline
                        </p>
                      </div>
                      <div className="relative">
                        <CircularProgress percent={disconnectedPercent} color="#ef4444" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-400">
                          {stats.devicesOffline}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════
              3. CONNECTION GRAPH — Date filter + CSV/PDF export
              ══════════════════════════════════════════════════ */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="space-y-0">
              {/* Date Range Filter + Export Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Connection Status
                </h3>
                <div className="flex items-center gap-2">
                  {/* Date Range Buttons */}
                  {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        dateRange === range
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                    </button>
                  ))}

                  <div className="w-px h-5 bg-border/50 mx-1" />

                  {/* CSV Download */}
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all duration-200"
                    title="Download CSV Report"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>

                  {/* PDF Download */}
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all duration-200"
                    title="Download PDF Report"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF
                  </button>
                </div>
              </div>

              <AnalyticsChart
                title="Connected vs Disconnected Devices"
                subtitle={`Device connection status over the last ${dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}`}
                data={connectionChartData}
                type="multiBar"
                height={280}
                delay={0.2}
              />
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════
              4. TTN / LoRaWAN OVERVIEW — Lightweight summary
              ══════════════════════════════════════════════════ */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-semibold text-foreground">LoRaWAN Overview</h2>
                <span className="text-xs text-muted-foreground ml-1">— LoRa network summary</span>
              </div>
              <Link
                href="/devices"
                className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                View LoRaWAN Devices
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Applications */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-500/15 to-violet-600/5 border border-violet-500/25 backdrop-blur-xl hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-500/40 transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-1.5 rounded-lg bg-violet-500/20">
                          <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Applications</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {ttnLoading && ttnApplications.length === 0 ? (
                        <div className="h-8 w-12 bg-violet-500/10 rounded animate-pulse" />
                      ) : (
                        <motion.p
                          className="text-2xl font-bold text-violet-400"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.45 }}
                        >
                          {ttnApplications.length}
                        </motion.p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">TTN configured</p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Total LoRaWAN Devices */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-purple-500/25 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/10 hover:border-purple-500/40 transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/20">
                          <Cpu className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">LoRa Devices</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <motion.p
                        className="text-2xl font-bold text-purple-400"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                      >
                        {ttnDevices.length > 0 ? ttnDevices.length : '—'}
                      </motion.p>
                      <p className="text-[11px] text-muted-foreground mt-1">Synced from TTN</p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Online Devices */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/25 backdrop-blur-xl hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20">
                          <Signal className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Online Now</span>
                        {ttnOnlineDevices > 0 && (
                          <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                      <motion.p
                        className="text-2xl font-bold text-emerald-400"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.55 }}
                      >
                        {ttnDevices.length > 0 ? ttnOnlineDevices : '—'}
                      </motion.p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {ttnDevices.length > 0
                          ? `of ${ttnDevices.length} reporting`
                          : 'Load devices page'}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Total Uplinks */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/devices">
                  <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/25 backdrop-blur-xl hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer group">
                    <div className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-1.5 rounded-lg bg-cyan-500/20">
                          <Zap className="h-3.5 w-3.5 text-cyan-400" />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Total Uplinks</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <motion.p
                        className="text-2xl font-bold text-cyan-400"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                      >
                        {ttnTotalUplinks > 0
                          ? ttnTotalUplinks >= 1000
                            ? `${(ttnTotalUplinks / 1000).toFixed(1)}k`
                            : ttnTotalUplinks
                          : '—'}
                      </motion.p>
                      <p className="text-[11px] text-muted-foreground mt-1">All time messages</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════
              5. PROJECT OVERVIEW TOGGLE BANNER
              Appears only after clicking
              ══════════════════════════════════════════════════ */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <button
              onClick={handleToggleProjectOverview}
              className={`w-full group relative overflow-hidden rounded-2xl p-5 border transition-all duration-500 ${
                showProjectOverview
                  ? 'bg-gradient-to-r from-brand-500/15 via-purple-500/10 to-brand-600/15 border-brand-500/30'
                  : 'bg-gradient-to-r from-brand-500/10 via-purple-500/5 to-brand-600/10 border-border/50 hover:border-brand-500/30'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20">
                    <Eye className="h-5 w-5 text-brand-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-semibold text-foreground flex items-center gap-2">
                      Here&apos;s what&apos;s happening with your IoT systems
                      <Sparkles className="h-4 w-4 text-brand-400 opacity-70" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {showProjectOverview ? 'Click to collapse project overview' : 'Click to explore all subsystems and reports'}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: showProjectOverview ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
          </motion.div>

          {/* ══════════════════════════════════════════════════
              6. PROJECT OVERVIEW — Shown only when toggled
              SCADA, Map, SLD, OMS, Reports
              ══════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showProjectOverview && (
              <motion.div
                ref={projectOverviewRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden mb-8"
              >
                <div className="pt-2">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Project Overview
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* SCADA + OMS cards */}
                    {PROJECT_SUBSYSTEMS.map((subsystem, index) => (
                      <motion.div
                        key={subsystem.href}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + index * 0.06, duration: 0.4 }}
                      >
                        <Link href={subsystem.href}>
                          <div className={`
                            relative overflow-hidden rounded-xl p-4
                            bg-gradient-to-br ${subsystem.color}
                            border ${subsystem.borderColor}
                            backdrop-blur-xl
                            hover:scale-[1.03] hover:shadow-lg
                            transition-all duration-300 cursor-pointer
                            group h-full
                          `}>
                            <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
                            <div className="relative z-10">
                              <div className={`inline-flex p-2 rounded-lg ${subsystem.iconBg} mb-2`}>
                                <subsystem.icon className={`h-5 w-5 ${subsystem.iconColor}`} />
                              </div>
                              <h3 className="font-semibold text-foreground text-sm mb-0.5">{subsystem.title}</h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">{subsystem.description}</p>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            {'subBadge' in subsystem && subsystem.subBadge && (
                              <span className={`absolute bottom-3 right-3 flex items-center gap-1 text-[10px] font-semibold ${subsystem.subBadge.color} opacity-70`}>
                                <subsystem.subBadge.icon className="h-3 w-3" />
                                {subsystem.subBadge.label}
                              </span>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    ))}

                    {/* Reports card with sub-items */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <Link href="/reports">
                        <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 backdrop-blur-xl hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-pointer group h-full">
                          <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
                          <div className="relative z-10">
                            <div className="inline-flex p-2 rounded-lg bg-cyan-500/20 mb-2">
                              <FileText className="h-5 w-5 text-cyan-400" />
                            </div>
                            <h3 className="font-semibold text-foreground text-sm mb-1.5">Reports</h3>
                            <div className="space-y-1">
                              {REPORT_SUBITEMS.map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <item.icon className="h-3 w-3 flex-shrink-0" />
                                  <span>{item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════════════════════════════════════════════
              7. MAIN CONTENT — Charts + System Health + Alerts
              ══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Device Activity Chart */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <AnalyticsChart
                title="Device Activity"
                subtitle="Commands and data points over the last 7 days"
                data={deviceActivityChart}
                type="area"
                color="#3b82f6"
                delay={0.3}
              />
            </motion.div>

            {/* Right Column - System Health & Alerts */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <SystemHealthMonitor
                health={systemHealth}
                isConnected={isConnected}
              />
              <AlertsPanel
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onViewAll={() => router.push('/alerts')}
              />
            </motion.div>
          </div>

          {/* ══════════════════════════════════════════════════
              8. RECENT ACTIVITY
              ══════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <RecentActivity activities={recentActivity} />
          </motion.div>

        </div>
      </div>
    </MainLayout>
  );
}

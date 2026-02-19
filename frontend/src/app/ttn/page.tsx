'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { RootState, AppDispatch } from '@/store/store';
import {
  fetchTTNApplications,
  createTTNApplication,
  deleteTTNApplication,
  syncTTNDevices,
  fetchTTNDevices,
  fetchTTNUplinks,
  fetchTTNDownlinks,
  fetchTTNLogs,
  fetchTTNStats,
  fetchTTNGateways,
  fetchTTNGatewayStats,
  sendTTNDownlink,
  updateTTNApiKey,
  setSelectedApplication,
  addUplink,
  addLogEntry,
  updateDownlinkStatus,
  updateGatewayFromUplink,
  clearError,
  clearSuccess,
  TTNDevice,
  TTNLogEntry,
} from '@/store/slices/ttnSlice';
import { SOCKET_CONFIG, API_ENDPOINTS } from '@/lib/config';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Radio,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  Signal,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Server,
  BarChart3,
  MapPin,
  KeyRound,
  ShieldCheck,
  Download,
  FileText,
  Trash2,
  AlertTriangle,
  Filter,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';

type TabType = 'overview' | 'devices' | 'gateways' | 'uplinks' | 'downlinks' | 'logs';

// RSSI quality indicator helper
function getRssiColor(rssi: number): string {
  if (rssi > -100) return 'text-green-500';
  if (rssi > -115) return 'text-yellow-500';
  return 'text-red-500';
}

function getRssiBgColor(rssi: number): string {
  if (rssi > -100) return 'bg-green-500/10 border-green-500/30';
  if (rssi > -115) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function getRssiLabel(rssi: number): string {
  if (rssi > -100) return 'Good';
  if (rssi > -115) return 'Fair';
  return 'Poor';
}

export default function TTNPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAddApp, setShowAddApp] = useState(false);
  const [showDownlinkModal, setShowDownlinkModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedDeviceForDownlink, setSelectedDeviceForDownlink] = useState<TTNDevice | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [, setSocket] = useState<Socket | null>(null);
  const [statsPeriod, setStatsPeriod] = useState('24h');
  const [expandedUplinkId, setExpandedUplinkId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState({
    deviceId: 'all',
    eventType: 'all',
    gatewayId: '',
    timeRange: '24h' as '1h' | '6h' | '24h',
  });
  const [uplinkFilter, setUplinkFilter] = useState({ deviceId: 'all', gatewayId: '', startDate: '', endDate: '' });
  const [downlinkFilter, setDownlinkFilter] = useState({ deviceId: 'all', startDate: '', endDate: '' });
  const [copiedPayload, setCopiedPayload] = useState<string | null>(null);
  const [logCustomStartDate, setLogCustomStartDate] = useState('');
  const [logCustomEndDate, setLogCustomEndDate] = useState('');
  const [logTimeMode, setLogTimeMode] = useState<'preset' | 'custom'>('preset');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Form states
  const [newApp, setNewApp] = useState({
    applicationId: '',
    name: '',
    description: '',
    ttnRegion: 'eu1',
    apiKey: '',
  });
  const [downlinkData, setDownlinkData] = useState({
    fPort: 1,
    payload: '',
    confirmed: false,
    priority: 'NORMAL',
  });

  const {
    applications,
    selectedApplication,
    devices,
    gateways,
    uplinks,
    downlinks,
    logs,
    logsTotal,
    stats,
    loading,
    syncLoading,
    error,
    success,
  } = useSelector((state: RootState) => state.ttn);

  // Fetch applications on mount
  useEffect(() => {
    dispatch(fetchTTNApplications());
  }, [dispatch]);

  // Refresh data for selected app
  const refreshAppData = useCallback(() => {
    if (selectedApplication) {
      dispatch(fetchTTNDevices(selectedApplication.applicationId));
      dispatch(fetchTTNStats({ applicationId: selectedApplication.applicationId, period: statsPeriod }));
      dispatch(fetchTTNGateways(selectedApplication.applicationId));
      dispatch(fetchTTNGatewayStats(selectedApplication.applicationId));
    }
  }, [selectedApplication, dispatch, statsPeriod]);

  // Setup Socket.io for real-time updates
  useEffect(() => {
    if (selectedApplication) {
      const newSocket = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);

      newSocket.on('connect', () => {
        console.log('Connected to TTN Socket.io');
        newSocket.emit('joinTTNApplication', selectedApplication.applicationId);
      });

      newSocket.on('ttnUplink', (data) => {
        dispatch(addUplink(data.uplink));
        dispatch(addLogEntry({
          ...data.uplink,
          _type: 'uplink',
          _timestamp: data.uplink.receivedAt,
        } as TTNLogEntry));
      });

      newSocket.on('ttnGatewayUpdate', (data) => {
        dispatch(updateGatewayFromUplink({ gatewayIds: data.gateways }));
        // Re-fetch gateways to get updated metrics
        dispatch(fetchTTNGateways(selectedApplication.applicationId));
      });

      newSocket.on('ttnDownlinkSent', (data) => {
        dispatch(updateDownlinkStatus({
          correlationId: data.correlationIds?.[0],
          status: 'SENT',
          timestamp: data.timestamp,
        }));
        dispatch(addLogEntry({
          _id: data.correlationIds?.[0] || Date.now().toString(),
          _type: 'downlink',
          _timestamp: data.timestamp || new Date().toISOString(),
          deviceId: data.deviceId,
          applicationId: data.applicationId,
          status: 'SENT',
          correlationId: data.correlationIds?.[0],
        } as TTNLogEntry));
      });

      newSocket.on('ttnDownlinkAck', (data) => {
        dispatch(updateDownlinkStatus({
          correlationId: data.correlationIds?.[0],
          status: 'ACKNOWLEDGED',
          timestamp: data.timestamp,
        }));
      });

      newSocket.on('ttnDownlinkFailed', (data) => {
        dispatch(updateDownlinkStatus({
          correlationId: data.correlationIds?.[0],
          status: 'FAILED',
          timestamp: data.timestamp,
        }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.emit('leaveTTNApplication', selectedApplication.applicationId);
        newSocket.disconnect();
      };
    }
  }, [selectedApplication, dispatch]);

  // Fetch data when application is selected or period changes
  useEffect(() => {
    refreshAppData();
  }, [refreshAppData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!selectedApplication) return;
    const interval = setInterval(refreshAppData, 60000);
    return () => clearInterval(interval);
  }, [selectedApplication, refreshAppData]);

  // Fetch uplinks when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'uplinks' && selectedApplication) {
      dispatch(fetchTTNUplinks({
        applicationId: selectedApplication.applicationId,
        deviceId: uplinkFilter.deviceId !== 'all' ? uplinkFilter.deviceId : undefined,
        gatewayId: uplinkFilter.gatewayId || undefined,
        startDate: uplinkFilter.startDate || undefined,
        endDate: uplinkFilter.endDate || undefined,
      }));
    }
  }, [activeTab, selectedApplication, uplinkFilter, dispatch]);

  // Fetch downlinks when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'downlinks' && selectedApplication) {
      dispatch(fetchTTNDownlinks({
        applicationId: selectedApplication.applicationId,
        deviceId: downlinkFilter.deviceId !== 'all' ? downlinkFilter.deviceId : undefined,
        startDate: downlinkFilter.startDate || undefined,
        endDate: downlinkFilter.endDate || undefined,
      }));
    }
  }, [activeTab, selectedApplication, downlinkFilter, dispatch]);

  // Fetch logs when Live Logs tab is active or filters change
  useEffect(() => {
    if (activeTab === 'logs' && selectedApplication) {
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (logTimeMode === 'custom') {
        startDate = logCustomStartDate ? new Date(logCustomStartDate).toISOString() : undefined;
        endDate = logCustomEndDate ? new Date(logCustomEndDate).toISOString() : undefined;
      } else {
        const now = new Date();
        const rangeMs = logFilter.timeRange === '1h' ? 3600000 : logFilter.timeRange === '6h' ? 21600000 : 86400000;
        startDate = new Date(now.getTime() - rangeMs).toISOString();
      }
      dispatch(fetchTTNLogs({
        applicationId: selectedApplication.applicationId,
        startDate,
        endDate,
        deviceId: logFilter.deviceId !== 'all' ? logFilter.deviceId : undefined,
        gatewayId: logFilter.gatewayId || undefined,
        eventType: logFilter.eventType !== 'all' ? logFilter.eventType : undefined,
      }));
    }
  }, [activeTab, selectedApplication, logFilter, logTimeMode, logCustomStartDate, logCustomEndDate, dispatch]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        dispatch(clearError());
        dispatch(clearSuccess());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success, dispatch]);

  // Chart data derived from stats
  const uplinkChartData = useMemo(() => {
    if (!stats?.uplinkTimeSeries) return [];
    return stats.uplinkTimeSeries.map((item) => ({
      time: item._id.includes(' ') ? item._id.split(' ')[1] : item._id.split('T')[0],
      uplinks: item.count,
      avgRssi: Math.round(item.avgRssi * 10) / 10,
      avgSnr: Math.round(item.avgSnr * 10) / 10,
    }));
  }, [stats]);

  const downlinkChartData = useMemo(() => {
    if (!stats?.downlinkTimeSeries) return [];
    return stats.downlinkTimeSeries.map((item) => ({
      time: item._id.includes(' ') ? item._id.split(' ')[1] : item._id.split('T')[0],
      downlinks: item.count,
    }));
  }, [stats]);

  const SF_COLORS: Record<number, string> = { 7: '#10b981', 8: '#06b6d4', 9: '#3b82f6', 10: '#8b5cf6', 11: '#f59e0b', 12: '#ef4444' };

  const sfChartData = useMemo(() => {
    if (!stats?.sfDistribution) return [];
    return stats.sfDistribution.map((item) => ({
      sf: `SF${item._id}`,
      count: item.count,
      fill: SF_COLORS[item._id] || '#6b7280',
    }));
  }, [stats]);

  const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    SCHEDULED: '#3b82f6',
    SENT: '#10b981',
    ACKNOWLEDGED: '#06b6d4',
    FAILED: '#ef4444',
  };

  const statusChartData = useMemo(() => {
    if (!stats?.downlinkStatusBreakdown) return [];
    return stats.downlinkStatusBreakdown.map((item) => ({
      name: item._id,
      value: item.count,
      fill: STATUS_COLORS[item._id] || '#6b7280',
    }));
  }, [stats]);

  const gatewayChartData = useMemo(() => {
    if (!stats?.gatewayTraffic) return [];
    return stats.gatewayTraffic.map((item) => ({
      gateway: item._id.length > 20 ? item._id.slice(0, 18) + '…' : item._id,
      fullId: item._id,
      count: item.count,
      avgRssi: Math.round(item.avgRssi * 10) / 10,
      avgSnr: Math.round(item.avgSnr * 10) / 10,
    }));
  }, [stats]);

  const hourlyData = useMemo(() => {
    if (!stats?.hourlyHeatmap) return [];
    // Fill all 24 hours
    const map = new Map(stats.hourlyHeatmap.map((h) => [h._id, h.count]));
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: map.get(i) || 0,
    }));
  }, [stats]);

  const frequencyData = useMemo(() => {
    if (!stats?.frequencyDistribution) return [];
    return stats.frequencyDistribution.map((item) => ({
      freq: `${(item._id / 1000000).toFixed(1)}`,
      count: item.count,
    }));
  }, [stats]);

  const downlinkSuccessRate = useMemo(() => {
    if (!stats?.downlinkStatusBreakdown || stats.downlinkStatusBreakdown.length === 0) return null;
    const total = stats.downlinkStatusBreakdown.reduce((s, d) => s + d.count, 0);
    const success = stats.downlinkStatusBreakdown
      .filter((d) => d._id === 'SENT' || d._id === 'ACKNOWLEDGED')
      .reduce((s, d) => s + d.count, 0);
    return total > 0 ? Math.round((success / total) * 100) : 0;
  }, [stats]);

  const avgRssi = useMemo(() => {
    if (!stats?.uplinkTimeSeries || stats.uplinkTimeSeries.length === 0) return null;
    const sum = stats.uplinkTimeSeries.reduce((s, d) => s + d.avgRssi, 0);
    return Math.round((sum / stats.uplinkTimeSeries.length) * 10) / 10;
  }, [stats]);

  const avgSnr = useMemo(() => {
    if (!stats?.uplinkTimeSeries || stats.uplinkTimeSeries.length === 0) return null;
    const sum = stats.uplinkTimeSeries.reduce((s, d) => s + d.avgSnr, 0);
    return Math.round((sum / stats.uplinkTimeSeries.length) * 10) / 10;
  }, [stats]);

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(createTTNApplication(newApp));
    if (!result.type.endsWith('rejected')) {
      setShowAddApp(false);
      setNewApp({ applicationId: '', name: '', description: '', ttnRegion: 'eu1', apiKey: '' });
    }
  };

  const handleSyncDevices = async () => {
    if (selectedApplication) {
      await dispatch(syncTTNDevices({ applicationId: selectedApplication.applicationId }));
    }
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedApplication && newApiKey) {
      const result = await dispatch(updateTTNApiKey({ id: selectedApplication._id, apiKey: newApiKey }));
      if (!result.type.endsWith('rejected')) {
        setShowApiKeyModal(false);
        setNewApiKey('');
      }
    }
  };

  const handleSendDownlink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedApplication && selectedDeviceForDownlink) {
      let base64Payload = downlinkData.payload;
      if (downlinkData.payload.match(/^[0-9a-fA-F]+$/)) {
        const bytes = downlinkData.payload.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [];
        base64Payload = btoa(String.fromCharCode(...bytes));
      }

      await dispatch(sendTTNDownlink({
        applicationId: selectedApplication.applicationId,
        deviceId: selectedDeviceForDownlink.deviceId,
        fPort: downlinkData.fPort,
        payload: base64Payload,
        confirmed: downlinkData.confirmed,
        priority: downlinkData.priority,
      }));
      setShowDownlinkModal(false);
      setDownlinkData({ fPort: 1, payload: '', confirmed: false, priority: 'NORMAL' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const formatPayload = (payload: string) => {
    try {
      const decoded = atob(payload);
      return Array.from(decoded)
        .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase();
    } catch {
      return payload;
    }
  };

  const formatPayloadText = (payload: string) => {
    try {
      const decoded = atob(payload);
      return Array.from(decoded)
        .map((char) => {
          const code = char.charCodeAt(0);
          return code >= 32 && code <= 126 ? char : '.';
        })
        .join('');
    } catch {
      return payload;
    }
  };

  const handleCopyPayload = (payload: string) => {
    const hex = formatPayload(payload);
    const ascii = formatPayloadText(payload);
    navigator.clipboard.writeText(`Hex: ${hex}\nASCII: ${ascii}`);
    setCopiedPayload(payload);
    setTimeout(() => setCopiedPayload(null), 2000);
  };

  // Download validation and handler
  const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
  const validateDownloadRange = (startStr: string, endStr: string): string | null => {
    if (!startStr) return null; // will use default 24h
    const s = new Date(startStr).getTime();
    const e = endStr ? new Date(endStr).getTime() : Date.now();
    if (s > e) return 'Start date must be before end date';
    if (e - s > MAX_RANGE_MS) return 'Date range cannot exceed 31 days';
    const cutoff = Date.now() - MAX_RANGE_MS;
    if (s < cutoff) return 'Logs are only available for the last 31 days';
    return null;
  };

  const handleDownload = async (fmt: 'txt' | 'csv' | 'json', options?: {
    forceLastDay?: boolean;
    eventType?: string;
    deviceId?: string;
    gatewayId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!selectedApplication) return;
    setDownloadError('');

    const params = new URLSearchParams();

    if (options?.forceLastDay) {
      // Quick download: always last 24h
      params.set('startDate', new Date(Date.now() - 86400000).toISOString());
    } else if (options?.startDate || options?.endDate) {
      // Explicit dates from tab-specific filters (Uplinks/Downlinks tabs)
      if (options.startDate) params.set('startDate', options.startDate);
      if (options.endDate) params.set('endDate', options.endDate);
    } else if (logTimeMode === 'custom') {
      const err = validateDownloadRange(logCustomStartDate, logCustomEndDate);
      if (err) {
        setDownloadError(err);
        setTimeout(() => setDownloadError(''), 5000);
        return;
      }
      if (logCustomStartDate) params.set('startDate', new Date(logCustomStartDate).toISOString());
      if (logCustomEndDate) params.set('endDate', new Date(logCustomEndDate).toISOString());
    } else {
      const rangeMs = logFilter.timeRange === '1h' ? 3600000 : logFilter.timeRange === '6h' ? 21600000 : 86400000;
      params.set('startDate', new Date(Date.now() - rangeMs).toISOString());
    }

    // Use provided overrides or fall back to log filter values
    const evType = options?.eventType ?? logFilter.eventType;
    const devId = options?.deviceId ?? logFilter.deviceId;
    const gwId = options?.gatewayId ?? logFilter.gatewayId;

    params.set('format', fmt);
    if (devId && devId !== 'all') params.set('deviceId', devId);
    if (gwId) params.set('gatewayId', gwId);
    if (evType && evType !== 'all') params.set('eventType', evType);

    setDownloading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const resp = await fetch(
        `${API_ENDPOINTS.TTN_LOGS_EXPORT(selectedApplication.applicationId)}?${params.toString()}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setDownloadError(data?.error || 'Download failed');
        setTimeout(() => setDownloadError(''), 5000);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ttn-logs-${selectedApplication.applicationId}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Download failed');
      setTimeout(() => setDownloadError(''), 5000);
    } finally {
      setDownloading(false);
    }
  };

  const navigateToLogsForDevice = (deviceId: string) => {
    setLogFilter({ ...logFilter, deviceId });
    setActiveTab('logs');
  };

  const navigateToLogsForGateway = (gatewayId: string) => {
    setLogFilter({ ...logFilter, gatewayId });
    setActiveTab('logs');
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'devices', label: 'Devices', icon: <Radio className="h-4 w-4" /> },
    { key: 'gateways', label: 'Gateways', icon: <Server className="h-4 w-4" /> },
    { key: 'uplinks', label: 'Uplinks', icon: <ArrowUpCircle className="h-4 w-4" /> },
    { key: 'downlinks', label: 'Downlinks', icon: <ArrowDownCircle className="h-4 w-4" /> },
    { key: 'logs', label: 'Live Logs', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative p-2.5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                    <Radio className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  The Things Network
                </h1>
              </div>
              <p className="text-muted-foreground ml-[52px]">
                LoRaWAN device management and monitoring
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedApplication && selectedApplication.hasApiKey && (
                <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  API Key Saved
                </span>
              )}
              {selectedApplication && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeyModal(true)}
                  className="flex items-center gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  {selectedApplication.hasApiKey ? 'Update Key' : 'Set API Key'}
                </Button>
              )}
              <Button
                onClick={() => setShowAddApp(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-glow text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </div>
          </motion.div>

          {/* Messages */}
          <AnimatePresence>
            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                  error
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-green-500/10 text-green-500 border border-green-500/20'
                }`}
              >
                {error ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Application Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex flex-wrap gap-3">
              {applications.map((app) => (
                <motion.button
                  key={app._id}
                  onClick={() => dispatch(setSelectedApplication(app))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedApplication?._id === app._id
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'bg-secondary/50 hover:bg-secondary/80 border border-border/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Radio className="h-4 w-4" />
                  {app.name}
                  {app.hasApiKey ? (
                    <ShieldCheck className={`h-3.5 w-3.5 ${
                      selectedApplication?._id === app._id ? 'text-white/80' : 'text-green-500'
                    }`} />
                  ) : (
                    <AlertCircle className={`h-3.5 w-3.5 ${
                      selectedApplication?._id === app._id ? 'text-yellow-200' : 'text-yellow-500'
                    }`} />
                  )}
                  {selectedApplication?._id === app._id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="ml-1 hover:text-red-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </motion.button>
              ))}
              {applications.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No applications registered. Click &quot;Add Application&quot; to get started.
                </p>
              )}
            </div>
          </motion.div>

          {selectedApplication && (
            <>
              {/* Tabs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 mb-6 overflow-x-auto"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-secondary/50 hover:bg-secondary/80'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncDevices}
                  disabled={syncLoading || !selectedApplication.hasApiKey}
                  className="ml-auto"
                >
                  {syncLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Devices
                </Button>
              </motion.div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {/* ==================== OVERVIEW TAB ==================== */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* Row 0: Period Selector */}
                    <div className="flex justify-end gap-2">
                      {['1h', '24h', '7d', '30d'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setStatsPeriod(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statsPeriod === p
                              ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                              : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Row 1: Summary Stat Cards — 8 cards in 4-col grid */}
                    {stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Devices */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10"><Radio className="h-5 w-5 text-blue-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{stats.summary.totalDevices}</p>
                              <p className="text-xs text-muted-foreground">Total Devices</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-500">{stats.summary.onlineDevices} online</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-slate-500">{stats.summary.offlineDevices} offline</span>
                          </div>
                          {stats.summary.totalDevices > 0 && (
                            <div className="mt-2 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats.summary.onlineDevices / stats.summary.totalDevices) * 100}%` }} />
                            </div>
                          )}
                        </motion.div>

                        {/* Total Gateways */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-cyan-500/10"><Server className="h-5 w-5 text-cyan-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{stats.summary.totalGateways}</p>
                              <p className="text-xs text-muted-foreground">Total Gateways</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-500">{stats.summary.onlineGateways} online</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-slate-500">{(stats.summary.totalGateways ?? 0) - (stats.summary.onlineGateways ?? 0)} offline</span>
                          </div>
                          {(stats.summary.totalGateways ?? 0) > 0 && (
                            <div className="mt-2 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${((stats.summary.onlineGateways ?? 0) / (stats.summary.totalGateways ?? 1)) * 100}%` }} />
                            </div>
                          )}
                        </motion.div>

                        {/* Uplinks in Period */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10"><ArrowUpCircle className="h-5 w-5 text-green-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{stats.summary.recentUplinks}</p>
                              <p className="text-xs text-muted-foreground">Uplinks ({statsPeriod})</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Downlinks in Period */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10"><ArrowDownCircle className="h-5 w-5 text-blue-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{stats.summary.totalDownlinks}</p>
                              <p className="text-xs text-muted-foreground">Total Downlinks</p>
                            </div>
                          </div>
                          {stats.summary.pendingDownlinks > 0 && (
                            <p className="mt-2 text-xs text-yellow-500">{stats.summary.pendingDownlinks} pending</p>
                          )}
                        </motion.div>

                        {/* Avg RSSI */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10"><Signal className="h-5 w-5 text-purple-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{avgRssi !== null ? `${avgRssi}` : '—'}</p>
                              <p className="text-xs text-muted-foreground">Avg RSSI (dBm)</p>
                            </div>
                          </div>
                          {avgRssi !== null && (
                            <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRssiBgColor(avgRssi)} ${getRssiColor(avgRssi)}`}>
                              {getRssiLabel(avgRssi)}
                            </span>
                          )}
                        </motion.div>

                        {/* Avg SNR */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10"><Activity className="h-5 w-5 text-indigo-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{avgSnr !== null ? `${avgSnr}` : '—'}</p>
                              <p className="text-xs text-muted-foreground">Avg SNR (dB)</p>
                            </div>
                          </div>
                          {avgSnr !== null && (
                            <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium border ${avgSnr > 5 ? 'bg-green-500/10 border-green-500/30 text-green-500' : avgSnr > 0 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                              {avgSnr > 5 ? 'Good' : avgSnr > 0 ? 'Fair' : 'Poor'}
                            </span>
                          )}
                        </motion.div>

                        {/* Downlink Success Rate */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
                            <div>
                              <p className="text-2xl font-bold">{downlinkSuccessRate !== null ? `${downlinkSuccessRate}%` : '—'}</p>
                              <p className="text-xs text-muted-foreground">DL Success Rate</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Pending Downlinks */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                          className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${stats.summary.pendingDownlinks > 5 ? 'bg-orange-500/10' : 'bg-slate-500/10'}`}>
                              <AlertTriangle className={`h-5 w-5 ${stats.summary.pendingDownlinks > 5 ? 'text-orange-500' : 'text-slate-500'}`} />
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{stats.summary.pendingDownlinks}</p>
                              <p className="text-xs text-muted-foreground">Pending DLs</p>
                            </div>
                          </div>
                          {stats.summary.pendingDownlinks > 5 && (
                            <p className="mt-2 text-xs text-orange-500">Queue may be backed up</p>
                          )}
                        </motion.div>
                      </div>
                    )}

                    {/* Row 2: Message Volume — 2 charts side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Uplink Activity Chart */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <ArrowUpCircle className="h-5 w-5 text-green-500" />
                          Uplink Activity
                        </h3>
                        {uplinkChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={uplinkChartData}>
                              <defs>
                                <linearGradient id="uplinkGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#888' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Area type="monotone" dataKey="uplinks" stroke="#10b981" strokeWidth={2} fill="url(#uplinkGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No uplink data for this period</div>
                        )}
                      </div>

                      {/* Downlink Activity Chart */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <ArrowDownCircle className="h-5 w-5 text-blue-500" />
                          Downlink Activity
                        </h3>
                        {downlinkChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={downlinkChartData}>
                              <defs>
                                <linearGradient id="downlinkGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#888' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Area type="monotone" dataKey="downlinks" stroke="#3b82f6" strokeWidth={2} fill="url(#downlinkGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No downlink data for this period</div>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Signal & Radio Analytics — 2 charts side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Signal Quality over time */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Signal className="h-5 w-5 text-purple-500" />
                          Signal Quality
                        </h3>
                        {uplinkChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={uplinkChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#888' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Legend />
                              <Line type="monotone" dataKey="avgRssi" stroke="#a855f7" strokeWidth={2} dot={false} name="Avg RSSI (dBm)" />
                              <Line type="monotone" dataKey="avgSnr" stroke="#06b6d4" strokeWidth={2} dot={false} name="Avg SNR (dB)" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No signal data for this period</div>
                        )}
                      </div>

                      {/* Spreading Factor Distribution */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-indigo-500" />
                          Spreading Factor Distribution
                        </h3>
                        {sfChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={sfChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="sf" tick={{ fontSize: 11, fill: '#888' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Bar dataKey="count" name="Messages" radius={[4, 4, 0, 0]}>
                                {sfChartData.map((entry, index) => (
                                  <Cell key={`sf-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No SF data for this period</div>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Infrastructure & Status — 2 charts side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Gateway Traffic */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Server className="h-5 w-5 text-cyan-500" />
                          Gateway Traffic
                        </h3>
                        {gatewayChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={gatewayChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} />
                              <YAxis dataKey="gateway" type="category" tick={{ fontSize: 10, fill: '#888' }} width={120} />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px', color: '#fff' }}
                                labelFormatter={(label: string) => {
                                  const item = gatewayChartData.find((g) => g.gateway === label);
                                  return item ? `${item.fullId} | RSSI: ${item.avgRssi} dBm | SNR: ${item.avgSnr} dB` : label;
                                }}
                              />
                              <Bar dataKey="count" name="Uplinks" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No gateway traffic data</div>
                        )}
                      </div>

                      {/* Downlink Status Breakdown */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <ArrowDownCircle className="h-5 w-5 text-orange-500" />
                          Downlink Status Breakdown
                        </h3>
                        {statusChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={statusChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                              >
                                {statusChartData.map((entry, index) => (
                                  <Cell key={`status-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No downlink status data</div>
                        )}
                      </div>
                    </div>

                    {/* Row 5: Activity Patterns — 2 charts side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Hourly Activity Heatmap */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-amber-500" />
                          Hourly Activity Pattern
                        </h3>
                        {hourlyData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={hourlyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#888' }} interval={1} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Bar dataKey="count" name="Messages" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No hourly data for this period</div>
                        )}
                      </div>

                      {/* Frequency Band Usage */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Wifi className="h-5 w-5 text-teal-500" />
                          Frequency Band Usage (MHz)
                        </h3>
                        {frequencyData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={frequencyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="freq" tick={{ fontSize: 10, fill: '#888' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Bar dataKey="count" name="Uplinks" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No frequency data for this period</div>
                        )}
                      </div>
                    </div>

                    {/* Row 6: Detailed Tables — 2 panels side-by-side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Active Devices */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Radio className="h-5 w-5 text-green-500" />
                          Top Active Devices
                        </h3>
                        {stats?.topDevices && stats.topDevices.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground border-b border-border/50">
                                  <th className="text-left py-2 pr-2">#</th>
                                  <th className="text-left py-2 pr-2">Device ID</th>
                                  <th className="text-right py-2 pr-2">Uplinks</th>
                                  <th className="text-right py-2 pr-2">RSSI</th>
                                  <th className="text-right py-2 pr-2">SNR</th>
                                  <th className="text-right py-2">Last Seen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stats.topDevices.map((device, i) => (
                                  <tr key={device._id} className="border-b border-border/30 hover:bg-secondary/20 cursor-pointer" onClick={() => navigateToLogsForDevice(device._id)}>
                                    <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                                    <td className="py-2 pr-2 font-mono text-xs">{device._id}</td>
                                    <td className="py-2 pr-2 text-right font-semibold">{device.uplinkCount}</td>
                                    <td className={`py-2 pr-2 text-right ${getRssiColor(device.avgRssi)}`}>{device.avgRssi?.toFixed(1)}</td>
                                    <td className="py-2 pr-2 text-right">{device.avgSnr?.toFixed(1)}</td>
                                    <td className="py-2 text-right text-xs text-muted-foreground">{formatRelativeTime(device.lastSeen)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm text-center py-4">No device activity yet</p>
                        )}
                      </div>

                      {/* Gateway Performance */}
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Server className="h-5 w-5 text-cyan-500" />
                          Gateway Performance
                        </h3>
                        {gateways.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground border-b border-border/50">
                                  <th className="text-left py-2 pr-2">Gateway</th>
                                  <th className="text-center py-2 pr-2">Status</th>
                                  <th className="text-right py-2 pr-2">Uplinks</th>
                                  <th className="text-right py-2 pr-2">RSSI</th>
                                  <th className="text-right py-2 pr-2">SNR</th>
                                  <th className="text-right py-2">Last Seen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gateways.map((gw) => (
                                  <tr key={gw._id} className="border-b border-border/30 hover:bg-secondary/20 cursor-pointer" onClick={() => navigateToLogsForGateway(gw.gatewayId)}>
                                    <td className="py-2 pr-2 font-mono text-xs">{gw.name || gw.gatewayId}</td>
                                    <td className="py-2 pr-2 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${gw.isOnline ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${gw.isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
                                        {gw.isOnline ? 'Online' : 'Offline'}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-2 text-right font-semibold">{gw.metrics.totalUplinksSeen}</td>
                                    <td className={`py-2 pr-2 text-right ${getRssiColor(gw.metrics.avgRssi)}`}>{gw.metrics.avgRssi?.toFixed(1)}</td>
                                    <td className="py-2 pr-2 text-right">{gw.metrics.avgSnr?.toFixed(1)}</td>
                                    <td className="py-2 text-right text-xs text-muted-foreground">{formatRelativeTime(gw.lastSeen)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm text-center py-4">No gateways discovered yet</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================== DEVICES TAB ==================== */}
                {activeTab === 'devices' && (
                  <motion.div
                    key="devices"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {devices.map((device) => (
                      <motion.div
                        key={device._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-green-500/30 transition-all cursor-pointer"
                        onClick={() => navigateToLogsForDevice(device.deviceId)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold">{device.name}</h4>
                            <p className="text-xs font-mono text-muted-foreground">{device.deviceId}</p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                              device.isOnline
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}
                          >
                            {device.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {device.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">DevEUI</span>
                            <span className="font-mono text-xs">{device.devEui}</span>
                          </div>
                          {device.lastUplink && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last RSSI</span>
                                <span className={getRssiColor(device.lastUplink.rssi ?? 0)}>
                                  {device.lastUplink.rssi} dBm
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last SNR</span>
                                <span>{device.lastUplink.snr} dB</span>
                              </div>
                              {device.lastUplink.gatewayId && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Gateway</span>
                                  <span className="font-mono text-xs truncate max-w-[150px]">{device.lastUplink.gatewayId}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Uplinks</span>
                            <span>{device.metrics.totalUplinks}</span>
                          </div>
                          {device.lastSeen && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Seen</span>
                              <span className="text-xs">{formatRelativeTime(device.lastSeen)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeviceForDownlink(device);
                              setShowDownlinkModal(true);
                            }}
                            disabled={!selectedApplication?.hasApiKey}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Downlink
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">Click to view logs</p>
                      </motion.div>
                    ))}
                    {devices.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No devices found. Click &quot;Sync Devices&quot; to fetch from TTN.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ==================== GATEWAYS TAB ==================== */}
                {activeTab === 'gateways' && (
                  <motion.div
                    key="gateways"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {/* Gateway summary */}
                    {gateways.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <p className="text-2xl font-bold">{gateways.length}</p>
                          <p className="text-xs text-muted-foreground">Total Gateways</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <p className="text-2xl font-bold text-green-500">
                            {gateways.filter((gw) => gw.isOnline).length}
                          </p>
                          <p className="text-xs text-muted-foreground">Online</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <p className="text-2xl font-bold">
                            {gateways.length > 0
                              ? Math.round(
                                  gateways.reduce((s, g) => s + g.metrics.avgRssi, 0) / gateways.length * 10
                                ) / 10
                              : 0}{' '}
                            <span className="text-sm font-normal text-muted-foreground">dBm</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Avg RSSI</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                          <p className="text-2xl font-bold">
                            {gateways.length > 0
                              ? Math.round(
                                  gateways.reduce((s, g) => s + g.metrics.avgSnr, 0) / gateways.length * 10
                                ) / 10
                              : 0}{' '}
                            <span className="text-sm font-normal text-muted-foreground">dB</span>
                          </p>
                          <p className="text-xs text-muted-foreground">Avg SNR</p>
                        </div>
                      </div>
                    )}

                    {/* Gateway Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gateways.map((gw) => (
                        <motion.div
                          key={gw._id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-5 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-emerald-500/30 transition-all cursor-pointer"
                          onClick={() => navigateToLogsForGateway(gw.gatewayId)}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Server className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{gw.name || gw.gatewayId}</h4>
                                <p className="text-xs font-mono text-muted-foreground">{gw.gatewayId}</p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                gw.isOnline
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-slate-500/10 text-slate-500'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${gw.isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
                              {gw.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          {gw.gatewayEui && (
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">EUI</span>
                              <span className="font-mono text-xs">{gw.gatewayEui}</span>
                            </div>
                          )}

                          {gw.location && (
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Location
                              </span>
                              <span className="text-xs">
                                {gw.location.latitude.toFixed(4)}, {gw.location.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Last Seen</span>
                            <span className="text-xs">{formatRelativeTime(gw.lastSeen)}</span>
                          </div>

                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Total Uplinks</span>
                            <span className="font-semibold">{gw.metrics.totalUplinksSeen}</span>
                          </div>

                          {/* Signal metrics */}
                          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
                            <div className={`p-2 rounded-lg border ${getRssiBgColor(gw.metrics.avgRssi)}`}>
                              <p className="text-xs text-muted-foreground">Avg RSSI</p>
                              <p className={`text-sm font-semibold ${getRssiColor(gw.metrics.avgRssi)}`}>
                                {gw.metrics.avgRssi} dBm
                              </p>
                              <p className={`text-xs ${getRssiColor(gw.metrics.avgRssi)}`}>
                                {getRssiLabel(gw.metrics.avgRssi)}
                              </p>
                            </div>
                            <div className="p-2 rounded-lg border bg-cyan-500/10 border-cyan-500/30">
                              <p className="text-xs text-muted-foreground">Avg SNR</p>
                              <p className="text-sm font-semibold text-cyan-500">
                                {gw.metrics.avgSnr} dB
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3 text-center">Click to view logs</p>
                        </motion.div>
                      ))}
                      {gateways.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                          <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No gateways discovered yet.</p>
                          <p className="text-xs mt-1">Gateways appear automatically when uplinks are received.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ==================== UPLINKS TAB ==================== */}
                {activeTab === 'uplinks' && (
                  <motion.div
                    key="uplinks"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Filter Bar */}
                    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Filter className="h-4 w-4" />
                          Filters
                        </div>
                        <select
                          value={uplinkFilter.deviceId}
                          onChange={(e) => setUplinkFilter({ ...uplinkFilter, deviceId: e.target.value })}
                          className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                        >
                          <option value="all">All Devices</option>
                          {devices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.name || d.deviceId}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Gateway ID..."
                          value={uplinkFilter.gatewayId}
                          onChange={(e) => setUplinkFilter({ ...uplinkFilter, gatewayId: e.target.value })}
                          className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50 w-36"
                        />
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="datetime-local"
                            value={uplinkFilter.startDate}
                            onChange={(e) => setUplinkFilter({ ...uplinkFilter, startDate: e.target.value })}
                            className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <input
                            type="datetime-local"
                            value={uplinkFilter.endDate}
                            onChange={(e) => setUplinkFilter({ ...uplinkFilter, endDate: e.target.value })}
                            className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                          />
                        </div>
                        {(uplinkFilter.deviceId !== 'all' || uplinkFilter.gatewayId || uplinkFilter.startDate || uplinkFilter.endDate) && (
                          <button
                            onClick={() => setUplinkFilter({ deviceId: 'all', gatewayId: '', startDate: '', endDate: '' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            Clear
                          </button>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          {(['txt', 'csv', 'json'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => handleDownload(fmt, {
                                eventType: 'uplink',
                                deviceId: uplinkFilter.deviceId,
                                gatewayId: uplinkFilter.gatewayId,
                                startDate: uplinkFilter.startDate ? new Date(uplinkFilter.startDate).toISOString() : undefined,
                                endDate: uplinkFilter.endDate ? new Date(uplinkFilter.endDate).toISOString() : undefined,
                              })}
                              disabled={downloading}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                                fmt === 'txt'
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                                  : 'bg-secondary/50 hover:bg-secondary/80 border-border/50'
                              }`}
                            >
                              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="px-4 py-3 text-left">Time</th>
                            <th className="px-4 py-3 text-left">Device</th>
                            <th className="px-4 py-3 text-left">Port</th>
                            <th className="px-4 py-3 text-left">Payload</th>
                            <th className="px-4 py-3 text-left">RSSI</th>
                            <th className="px-4 py-3 text-left">SNR</th>
                            <th className="px-4 py-3 text-left">SF</th>
                            <th className="px-4 py-3 text-left">Freq</th>
                            <th className="px-4 py-3 text-left">GWs</th>
                            <th className="px-4 py-3 text-left">Primary GW</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {uplinks.map((uplink) => (
                            <React.Fragment key={uplink._id}>
                              <tr
                                className="hover:bg-secondary/30 cursor-pointer"
                                onClick={() =>
                                  setExpandedUplinkId(
                                    expandedUplinkId === uplink._id ? null : uplink._id
                                  )
                                }
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  {formatDate(uplink.receivedAt)}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{uplink.deviceId}</td>
                                <td className="px-4 py-3">{uplink.fPort}</td>
                                <td className="px-4 py-3 font-mono text-xs max-w-[160px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate" title={formatPayload(uplink.rawPayload)}>
                                      {formatPayloadText(uplink.rawPayload)}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCopyPayload(uplink.rawPayload); }}
                                      className="shrink-0 p-0.5 rounded hover:bg-secondary/50 transition-colors"
                                      title="Copy payload"
                                    >
                                      {copiedPayload === uplink.rawPayload ? (
                                        <Check className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                      )}
                                    </button>
                                  </div>
                                </td>
                                <td className={`px-4 py-3 ${getRssiColor(uplink.rssi)}`}>
                                  {uplink.rssi} dBm
                                </td>
                                <td className="px-4 py-3">{uplink.snr} dB</td>
                                <td className="px-4 py-3">SF{uplink.spreadingFactor}</td>
                                <td className="px-4 py-3 text-xs">
                                  {uplink.frequency ? `${(uplink.frequency / 1000000).toFixed(1)} MHz` : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-1">
                                    {uplink.gateways?.length || 1}
                                    {(uplink.gateways?.length || 0) > 1 && (
                                      expandedUplinkId === uplink._id ? (
                                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                      )
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs truncate max-w-[140px]">
                                  {uplink.gatewayId}
                                </td>
                              </tr>
                              {/* Expanded gateway details */}
                              {expandedUplinkId === uplink._id && uplink.gateways && uplink.gateways.length > 0 && (
                                <tr>
                                  <td colSpan={10} className="px-4 py-3 bg-secondary/20">
                                    <div className="text-xs space-y-2">
                                      <p className="font-semibold text-muted-foreground mb-2">
                                        Received by {uplink.gateways.length} gateway{uplink.gateways.length > 1 ? 's' : ''}:
                                      </p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {uplink.gateways.map((gw, idx) => (
                                          <div
                                            key={idx}
                                            className="p-2 rounded-lg bg-secondary/40 border border-border/30"
                                          >
                                            <p className="font-mono font-semibold">{gw.gatewayId}</p>
                                            {gw.gatewayEui && (
                                              <p className="text-muted-foreground">EUI: {gw.gatewayEui}</p>
                                            )}
                                            <p>
                                              RSSI: <span className={getRssiColor(gw.rssi)}>{gw.rssi} dBm</span>
                                              {' | '}SNR: {gw.snr} dB
                                            </p>
                                            {gw.location && (
                                              <p className="text-muted-foreground">
                                                {gw.location.latitude.toFixed(4)}, {gw.location.longitude.toFixed(4)}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                      {uplinks.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No uplinks received yet</p>
                        </div>
                      )}
                    </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================== DOWNLINKS TAB ==================== */}
                {activeTab === 'downlinks' && (
                  <motion.div
                    key="downlinks"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Filter Bar */}
                    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Filter className="h-4 w-4" />
                          Filters
                        </div>
                        <select
                          value={downlinkFilter.deviceId}
                          onChange={(e) => setDownlinkFilter({ ...downlinkFilter, deviceId: e.target.value })}
                          className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                        >
                          <option value="all">All Devices</option>
                          {devices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.name || d.deviceId}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="datetime-local"
                            value={downlinkFilter.startDate}
                            onChange={(e) => setDownlinkFilter({ ...downlinkFilter, startDate: e.target.value })}
                            className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <input
                            type="datetime-local"
                            value={downlinkFilter.endDate}
                            onChange={(e) => setDownlinkFilter({ ...downlinkFilter, endDate: e.target.value })}
                            className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                          />
                        </div>
                        {(downlinkFilter.deviceId !== 'all' || downlinkFilter.startDate || downlinkFilter.endDate) && (
                          <button
                            onClick={() => setDownlinkFilter({ deviceId: 'all', startDate: '', endDate: '' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            Clear
                          </button>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          {(['txt', 'csv', 'json'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => handleDownload(fmt, {
                                eventType: 'downlink',
                                deviceId: downlinkFilter.deviceId,
                                startDate: downlinkFilter.startDate ? new Date(downlinkFilter.startDate).toISOString() : undefined,
                                endDate: downlinkFilter.endDate ? new Date(downlinkFilter.endDate).toISOString() : undefined,
                              })}
                              disabled={downloading}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                                fmt === 'txt'
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                                  : 'bg-secondary/50 hover:bg-secondary/80 border-border/50'
                              }`}
                            >
                              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="px-4 py-3 text-left">Time</th>
                            <th className="px-4 py-3 text-left">Device</th>
                            <th className="px-4 py-3 text-left">Port</th>
                            <th className="px-4 py-3 text-left">Payload</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Confirmed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {downlinks.map((downlink) => (
                            <tr key={downlink._id} className="hover:bg-secondary/30">
                              <td className="px-4 py-3 whitespace-nowrap text-xs">
                                {formatDate(downlink.createdAt)}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">{downlink.deviceId}</td>
                              <td className="px-4 py-3">{downlink.fPort}</td>
                              <td className="px-4 py-3 font-mono text-xs max-w-[160px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate" title={formatPayload(downlink.payload)}>
                                    {formatPayloadText(downlink.payload)}
                                  </span>
                                  <button
                                    onClick={() => handleCopyPayload(downlink.payload)}
                                    className="shrink-0 p-0.5 rounded hover:bg-secondary/50 transition-colors"
                                    title="Copy payload"
                                  >
                                    {copiedPayload === downlink.payload ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    downlink.status === 'ACKNOWLEDGED'
                                      ? 'bg-green-500/10 text-green-500'
                                      : downlink.status === 'SENT'
                                      ? 'bg-blue-500/10 text-blue-500'
                                      : downlink.status === 'FAILED'
                                      ? 'bg-red-500/10 text-red-500'
                                      : 'bg-yellow-500/10 text-yellow-500'
                                  }`}
                                >
                                  {downlink.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {downlink.confirmed ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {downlinks.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No downlinks sent yet</p>
                        </div>
                      )}
                    </div>
                    </div>
                  </motion.div>
                )}

                {/* ==================== LIVE LOGS TAB ==================== */}
                {activeTab === 'logs' && (
                  <motion.div
                    key="logs"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Filter Bar */}
                    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                          <Filter className="h-4 w-4" />
                          Filters
                        </div>

                        {/* Time Range */}
                        <div className="flex gap-1">
                          {(['1h', '6h', '24h'] as const).map((range) => (
                            <button
                              key={range}
                              onClick={() => {
                                setLogTimeMode('preset');
                                setLogFilter({ ...logFilter, timeRange: range });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                logTimeMode === 'preset' && logFilter.timeRange === range
                                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                  : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                              }`}
                            >
                              {range}
                            </button>
                          ))}
                          <button
                            onClick={() => setLogTimeMode('custom')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              logTimeMode === 'custom'
                                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            Custom
                          </button>
                        </div>

                        {/* Custom date range */}
                        {logTimeMode === 'custom' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="datetime-local"
                              value={logCustomStartDate}
                              onChange={(e) => setLogCustomStartDate(e.target.value)}
                              className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input
                              type="datetime-local"
                              value={logCustomEndDate}
                              onChange={(e) => setLogCustomEndDate(e.target.value)}
                              className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                            />
                          </div>
                        )}

                        {/* Event Type */}
                        <select
                          value={logFilter.eventType}
                          onChange={(e) => setLogFilter({ ...logFilter, eventType: e.target.value })}
                          className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                        >
                          <option value="all">All Events</option>
                          <option value="uplink">Uplinks Only</option>
                          <option value="downlink">Downlinks Only</option>
                        </select>

                        {/* Device Filter */}
                        <select
                          value={logFilter.deviceId}
                          onChange={(e) => setLogFilter({ ...logFilter, deviceId: e.target.value })}
                          className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50"
                        >
                          <option value="all">All Devices</option>
                          {devices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.name || d.deviceId}
                            </option>
                          ))}
                        </select>

                        {/* Gateway filter */}
                        <input
                          type="text"
                          placeholder="Gateway ID..."
                          value={logFilter.gatewayId}
                          onChange={(e) => setLogFilter({ ...logFilter, gatewayId: e.target.value })}
                          className="px-3 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50 w-36"
                        />

                        {/* Download Buttons */}
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => handleDownload('txt', { forceLastDay: true })}
                            disabled={downloading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                            Last 24h
                          </button>
                          <div className="h-4 w-px bg-border/50" />
                          {(['txt', 'csv', 'json'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => handleDownload(fmt)}
                              disabled={downloading}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                                fmt === 'txt'
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                                  : 'bg-secondary/50 hover:bg-secondary/80 border-border/50'
                              }`}
                            >
                              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                      {downloadError && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {downloadError}
                        </div>
                      )}
                    </div>

                    {/* Log Count */}
                    <div className="text-xs text-muted-foreground">
                      Showing {logs.length} of {logsTotal} events
                    </div>

                    {/* Log Table */}
                    <div className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden">
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left w-10">Type</th>
                              <th className="px-4 py-3 text-left">Time</th>
                              <th className="px-4 py-3 text-left">Device</th>
                              <th className="px-4 py-3 text-left">Port</th>
                              <th className="px-4 py-3 text-left">Payload</th>
                              <th className="px-4 py-3 text-left">RSSI / Status</th>
                              <th className="px-4 py-3 text-left">Gateway</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {logs.map((entry) => (
                              <tr key={entry._id + entry._timestamp} className="hover:bg-secondary/30">
                                <td className="px-4 py-3">
                                  {entry._type === 'uplink' ? (
                                    <ArrowUpCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  {formatDate(entry._timestamp)}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">
                                  <button
                                    onClick={() => setLogFilter({ ...logFilter, deviceId: entry.deviceId })}
                                    className="hover:text-green-500 hover:underline transition-colors"
                                    title="Filter by this device"
                                  >
                                    {entry.deviceId}
                                  </button>
                                </td>
                                <td className="px-4 py-3">{entry.fPort ?? '-'}</td>
                                <td className="px-4 py-3 font-mono text-xs max-w-[160px]">
                                  {(() => {
                                    const payload = entry._type === 'uplink' ? entry.rawPayload || '' : entry.payload || '';
                                    if (!payload) return '-';
                                    return (
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate" title={formatPayload(payload)}>
                                          {formatPayloadText(payload)}
                                        </span>
                                        <button
                                          onClick={() => handleCopyPayload(payload)}
                                          className="shrink-0 p-0.5 rounded hover:bg-secondary/50 transition-colors"
                                          title="Copy payload"
                                        >
                                          {copiedPayload === payload ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Copy className="h-3 w-3 text-muted-foreground" />
                                          )}
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3">
                                  {entry._type === 'uplink' ? (
                                    <span className={getRssiColor(entry.rssi ?? 0)}>
                                      {entry.rssi} dBm
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs ${
                                        entry.status === 'ACKNOWLEDGED'
                                          ? 'bg-green-500/10 text-green-500'
                                          : entry.status === 'SENT'
                                          ? 'bg-blue-500/10 text-blue-500'
                                          : entry.status === 'FAILED'
                                          ? 'bg-red-500/10 text-red-500'
                                          : 'bg-yellow-500/10 text-yellow-500'
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs max-w-[140px]">
                                  {entry.gatewayId ? (
                                    <button
                                      onClick={() => setLogFilter({ ...logFilter, gatewayId: entry.gatewayId || '' })}
                                      className="hover:text-green-500 hover:underline transition-colors truncate block"
                                      title="Filter by this gateway"
                                    >
                                      {entry.gatewayId}
                                    </button>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {logs.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No log entries</p>
                            <p className="text-xs mt-1">Events will appear here as they arrive.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Add Application Modal */}
        <AnimatePresence>
          {showAddApp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddApp(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-card rounded-2xl border border-border/50 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-500" />
                  Register TTN Application
                </h2>
                <form onSubmit={handleCreateApp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Application ID</label>
                    <input
                      type="text"
                      value={newApp.applicationId}
                      onChange={(e) => setNewApp({ ...newApp, applicationId: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50"
                      placeholder="my-ttn-app"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                      type="text"
                      value={newApp.name}
                      onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50"
                      placeholder="My TTN Application"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Region</label>
                    <select
                      value={newApp.ttnRegion}
                      onChange={(e) => setNewApp({ ...newApp, ttnRegion: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50"
                    >
                      <option value="eu1">Europe (eu1)</option>
                      <option value="nam1">North America (nam1)</option>
                      <option value="au1">Australia (au1)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={newApp.apiKey}
                      onChange={(e) => setNewApp({ ...newApp, apiKey: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50"
                      placeholder="NNSXS.xxxxx..."
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your API key will be encrypted and stored securely on the server.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddApp(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update API Key Modal */}
        <AnimatePresence>
          {showApiKeyModal && selectedApplication && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowApiKeyModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-card rounded-2xl border border-border/50 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-500" />
                  {selectedApplication.hasApiKey ? 'Update' : 'Set'} API Key
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Application: <span className="font-mono">{selectedApplication.applicationId}</span>
                </p>
                <form onSubmit={handleUpdateApiKey} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">New API Key</label>
                    <input
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50"
                      placeholder="NNSXS.xxxxx..."
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The key will be verified with TTN before saving.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setShowApiKeyModal(false); setNewApiKey(''); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !newApiKey}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Key'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Send Downlink Modal */}
        <AnimatePresence>
          {showDownlinkModal && selectedDeviceForDownlink && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDownlinkModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-card rounded-2xl border border-border/50 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  Send Downlink
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Device: <span className="font-mono">{selectedDeviceForDownlink.deviceId}</span>
                </p>
                <form onSubmit={handleSendDownlink} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">FPort (1-223)</label>
                    <input
                      type="number"
                      min="1"
                      max="223"
                      value={downlinkData.fPort}
                      onChange={(e) => setDownlinkData({ ...downlinkData, fPort: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payload (Hex)</label>
                    <input
                      type="text"
                      value={downlinkData.payload}
                      onChange={(e) => setDownlinkData({ ...downlinkData, payload: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50 font-mono"
                      placeholder="01FF00"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Enter hex bytes without spaces</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={downlinkData.confirmed}
                        onChange={(e) => setDownlinkData({ ...downlinkData, confirmed: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Confirmed</span>
                    </label>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowDownlinkModal(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && selectedApplication && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-card rounded-2xl border border-border/50 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-red-500">Delete Application</h2>
                </div>

                <p className="text-sm mb-3">
                  You are about to permanently delete{' '}
                  <span className="font-semibold">{selectedApplication.name}</span>.
                </p>

                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 mb-4 text-sm text-muted-foreground space-y-1">
                  <p>This will delete:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>All registered devices</li>
                    <li>All uplink data</li>
                    <li>All downlink history</li>
                    <li>All gateway records</li>
                    <li>Active MQTT connection</li>
                  </ul>
                </div>

                <p className="text-sm mb-2">
                  Type <span className="font-mono font-semibold text-red-500">{selectedApplication.applicationId}</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-background/50 font-mono text-sm mb-4"
                  placeholder={selectedApplication.applicationId}
                  autoFocus
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={deleteConfirmText !== selectedApplication.applicationId}
                    onClick={() => {
                      dispatch(deleteTTNApplication(selectedApplication._id));
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}

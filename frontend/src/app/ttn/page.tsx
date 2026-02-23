'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Socket } from 'socket.io-client';
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
  fetchTTNLogs,
  fetchTTNStats,
  fetchTTNGateways,
  fetchTTNGatewayStats,
  sendTTNDownlink,
  updateTTNApiKey,
  updateTTNDevice,
  setSelectedApplication,
  addUplink,
  addLogEntry,
  updateDownlinkStatus,
  updateGatewayFromUplink,
  clearError,
  clearSuccess,
  TTNDevice,
  TTNUplink,
  TTNDownlink,
  TTNLogEntry,
} from '@/store/slices/ttnSlice';
import { API_ENDPOINTS } from '@/lib/config';
import { createAuthenticatedSocket } from '@/lib/socket';
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
  Edit2,
} from 'lucide-react';

type TabType = 'overview' | 'devices' | 'gateways' | 'logs';

// RSSI quality indicator helper
function getRssiColor(rssi: number): string {
  if (rssi > -100) return 'text-green-500';
  if (rssi > -115) return 'text-yellow-500';
  return 'text-red-500';
}




const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  SCHEDULED: '#3b82f6',
  SENT: '#10b981',
  ACKNOWLEDGED: '#06b6d4',
  FAILED: '#ef4444',
};

// Reusable chart wrapper with download controls
function ChartCard({
  title,
  icon,
  onDownload,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onDownload: (fmt: 'csv' | 'json') => void;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">{icon}{title}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDownload('csv')}
            className="px-2 py-1 rounded-lg text-xs bg-secondary/50 hover:bg-secondary/80 text-muted-foreground transition-all flex items-center gap-1"
            title="Export CSV"
          >
            <Download className="h-3 w-3" />CSV
          </button>
          <button
            onClick={() => onDownload('json')}
            className="px-2 py-1 rounded-lg text-xs bg-secondary/50 hover:bg-secondary/80 text-muted-foreground transition-all flex items-center gap-1"
            title="Export JSON"
          >
            <Download className="h-3 w-3" />JSON
          </button>
        </div>
      </div>
      {children}
    </div>
  );
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
    timeRange: '7d' as '1h' | '6h' | '24h' | '7d',
  });
  // Inline device logs (shown in-page without navigating to logs tab)
  const [inlineLogsDevice, setInlineLogsDevice] = useState<TTNDevice | null>(null);
  const [inlineLogsData, setInlineLogsData] = useState<TTNLogEntry[]>([]);
  const [inlineLogsLoading, setInlineLogsLoading] = useState(false);
  // Overview time-range state
  const [overviewTimeMode, setOverviewTimeMode] = useState<'preset' | 'custom'>('preset');
  const [overviewCustomStart, setOverviewCustomStart] = useState('');
  const [overviewCustomEnd, setOverviewCustomEnd] = useState('');
  // Graph visibility filter
  const [showGraphFilter, setShowGraphFilter] = useState(false);
  const [visibleGraphs, setVisibleGraphs] = useState({
    messageComparison: true,
    uplinkActivity: true,
    downlinkActivity: true,
    signalQuality: true,
    sfDistribution: true,
    gatewayTraffic: true,
    downlinkStatus: true,
    hourlyActivity: true,
    frequencyBand: true,
  });
  const [copiedPayload, setCopiedPayload] = useState<string | null>(null);
  // LoRaWAN device monitoring state
  const [lorawanMode, setLorawanMode] = useState<'monitoring' | 'control'>('monitoring');
  const [selectedMonitorDevice, setSelectedMonitorDevice] = useState<TTNDevice | null>(null);
  const [devicePanelUplinks, setDevicePanelUplinks] = useState<TTNUplink[]>([]);
  const [devicePanelDownlinks, setDevicePanelDownlinks] = useState<TTNDownlink[]>([]);
  const [devicePanelLoading, setDevicePanelLoading] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
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
    logs,
    logsTotal,
    stats,
    loading,
    syncLoading,
    logsLoading,
    logsError,
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
      if (overviewTimeMode === 'custom' && overviewCustomStart) {
        dispatch(fetchTTNStats({
          applicationId: selectedApplication.applicationId,
          startDate: new Date(overviewCustomStart).toISOString(),
          endDate: overviewCustomEnd ? new Date(overviewCustomEnd).toISOString() : undefined,
        }));
      } else {
        dispatch(fetchTTNStats({ applicationId: selectedApplication.applicationId, period: statsPeriod }));
      }
      dispatch(fetchTTNGateways(selectedApplication.applicationId));
      dispatch(fetchTTNGatewayStats(selectedApplication.applicationId));
    }
  }, [selectedApplication, dispatch, statsPeriod, overviewTimeMode, overviewCustomStart, overviewCustomEnd]);

  // Setup Socket.io for real-time updates
  useEffect(() => {
    if (selectedApplication) {
      const newSocket = createAuthenticatedSocket();

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

  // Load device panel data when a device is selected for monitoring/control
  const loadDevicePanelData = useCallback(async (deviceId: string, mode: 'monitoring' | 'control') => {
    if (!selectedApplication) return;
    setDevicePanelLoading(true);
    setDevicePanelUplinks([]);
    setDevicePanelDownlinks([]);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const uplinksRes = await fetch(
        `${API_ENDPOINTS.TTN_DEVICE_UPLINKS(selectedApplication.applicationId, deviceId)}?limit=20`,
        { headers }
      );
      if (uplinksRes.ok) {
        const data = await uplinksRes.json();
        setDevicePanelUplinks(data.uplinks || []);
      }
      if (mode === 'control') {
        const downlinksRes = await fetch(
          `${API_ENDPOINTS.TTN_DEVICE_DOWNLINKS(selectedApplication.applicationId, deviceId)}?limit=20`,
          { headers }
        );
        if (downlinksRes.ok) {
          const data = await downlinksRes.json();
          setDevicePanelDownlinks(data.downlinks || []);
        }
      }
    } finally {
      setDevicePanelLoading(false);
    }
  }, [selectedApplication]);

  useEffect(() => {
    if (selectedMonitorDevice && activeTab === 'devices') {
      loadDevicePanelData(selectedMonitorDevice.deviceId, lorawanMode);
    }
  }, [selectedMonitorDevice, lorawanMode, activeTab, loadDevicePanelData]);

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
        const rangeMs = logFilter.timeRange === '1h' ? 3600000 : logFilter.timeRange === '6h' ? 21600000 : logFilter.timeRange === '24h' ? 86400000 : 7 * 86400000;
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

  const sfChartData = useMemo(() => {
    if (!stats?.topDevices) return [];
    const DEVICE_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#a855f7'];
    return stats.topDevices.map((item, index) => {
      const device = devices.find((d) => d.deviceId === item._id);
      return {
        name: device?.name || item._id,
        count: item.uplinkCount,
        fill: DEVICE_COLORS[index % DEVICE_COLORS.length],
      };
    });
  }, [stats, devices]);

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

  // New: combined uplink+downlink comparison data
  const messageComparisonData = useMemo(() => {
    if (!stats) return [];
    const uplinkMap = new Map(stats.uplinkTimeSeries.map((u) => [u._id, u.count]));
    const downlinkMap = new Map(stats.downlinkTimeSeries.map((d) => [d._id, d.count]));
    const allKeys = [...new Set([...uplinkMap.keys(), ...downlinkMap.keys()])].sort();
    return allKeys.map((key) => ({
      time: key.includes(' ') ? key.split(' ')[1] : key.split('T')[0],
      uplinks: uplinkMap.get(key) || 0,
      downlinks: downlinkMap.get(key) || 0,
    }));
  }, [stats]);

  // Chart data download helper
  const downloadChartData = (data: unknown[], filename: string, fmt: 'csv' | 'json') => {
    if (!data.length) return;
    let content: string;
    let mimeType: string;
    let ext: string;
    if (fmt === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      const keys = Object.keys(data[0] as Record<string, unknown>);
      const rows = (data as Record<string, unknown>[]).map((row) =>
        keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')
      );
      content = [keys.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleSaveDeviceName = async (device: TTNDevice) => {
    if (!selectedApplication || !editNameValue.trim()) return;
    await dispatch(updateTTNDevice({
      applicationId: selectedApplication.applicationId,
      deviceId: device.deviceId,
      displayName: editNameValue.trim(),
    }));
    setEditingDeviceId(null);
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
      const rangeMs = logFilter.timeRange === '1h' ? 3600000 : logFilter.timeRange === '6h' ? 21600000 : logFilter.timeRange === '24h' ? 86400000 : 7 * 86400000;
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

  const handleViewDeviceLogs = useCallback(async (device: TTNDevice) => {
    if (!selectedApplication) return;
    // Toggle off if same device
    if (inlineLogsDevice?._id === device._id) {
      setInlineLogsDevice(null);
      setInlineLogsData([]);
      return;
    }
    setInlineLogsDevice(device);
    setInlineLogsLoading(true);
    setInlineLogsData([]);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams();
      params.set('deviceId', device.deviceId);
      params.set('limit', '50');
      params.set('startDate', new Date(Date.now() - 7 * 86400000).toISOString());
      const res = await fetch(
        `${API_ENDPOINTS.TTN_LOGS(selectedApplication.applicationId)}?${params.toString()}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setInlineLogsData(data.logs || []);
      }
    } catch {
      // silently fail
    } finally {
      setInlineLogsLoading(false);
    }
  }, [selectedApplication, inlineLogsDevice]);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'devices', label: 'Devices', icon: <Radio className="h-4 w-4" /> },
    { key: 'gateways', label: 'Gateways', icon: <Server className="h-4 w-4" /> },
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
                    {/* Controls: period + custom range + graph filter */}
                    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Preset buttons */}
                        <div className="flex gap-1">
                          {(['1h', '24h', '7d', '30d'] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => { setOverviewTimeMode('preset'); setStatsPeriod(p); }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                overviewTimeMode === 'preset' && statsPeriod === p
                                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                  : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                              }`}
                            >{p}</button>
                          ))}
                          <button
                            onClick={() => setOverviewTimeMode('custom')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                              overviewTimeMode === 'custom'
                                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                            }`}
                          >
                            <Calendar className="h-3 w-3" />Custom
                          </button>
                        </div>
                        {/* Custom date inputs */}
                        {overviewTimeMode === 'custom' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input type="datetime-local" value={overviewCustomStart} onChange={(e) => setOverviewCustomStart(e.target.value)}
                              className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50" />
                            <span className="text-xs text-muted-foreground">to</span>
                            <input type="datetime-local" value={overviewCustomEnd} onChange={(e) => setOverviewCustomEnd(e.target.value)}
                              className="px-2 py-1.5 rounded-lg text-xs bg-secondary/50 border border-border/50" />
                            <button
                              onClick={() => { if (overviewCustomStart && selectedApplication) refreshAppData(); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30 transition-all"
                            >Apply</button>
                          </div>
                        )}
                        {/* Graph filter toggle */}
                        <button
                          onClick={() => setShowGraphFilter((v) => !v)}
                          className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                            showGraphFilter
                              ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                              : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" />
                          Graphs ({Object.values(visibleGraphs).filter(Boolean).length}/{Object.values(visibleGraphs).length})
                        </button>
                      </div>
                      {/* Graph visibility checkboxes */}
                      {showGraphFilter && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                          {([
                            { key: 'messageComparison', label: 'Message Volume' },
                            { key: 'uplinkActivity',    label: 'Uplink Activity' },
                            { key: 'downlinkActivity',  label: 'Downlink Activity' },
                            { key: 'signalQuality',     label: 'Signal Quality' },
                            { key: 'sfDistribution',    label: 'Uplinks by Device' },
                            { key: 'gatewayTraffic',    label: 'Gateway Traffic' },
                            { key: 'downlinkStatus',    label: 'Downlink Status' },
                            { key: 'hourlyActivity',    label: 'Hourly Activity' },
                            { key: 'frequencyBand',     label: 'Frequency Band' },
                          ] as const).map(({ key, label }) => (
                            <button
                              key={key}
                              onClick={() => setVisibleGraphs((v) => ({ ...v, [key]: !v[key] }))}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                                visibleGraphs[key]
                                  ? 'bg-green-500/15 text-green-500 border-green-500/30'
                                  : 'bg-secondary/30 text-muted-foreground border-border/30 opacity-50'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Summary stat cards — only Total Devices + Total Gateways */}
                    {stats && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
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
                      </div>
                    )}

                    {/* NEW: Message Volume Comparison — uplinks + downlinks on same chart */}
                    {visibleGraphs.messageComparison && (
                      <ChartCard
                        title="Message Volume"
                        icon={<Activity className="h-5 w-5 text-green-500" />}
                        onDownload={(fmt) => downloadChartData(messageComparisonData, 'message-volume', fmt)}
                      >
                        {messageComparisonData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={messageComparisonData}>
                              <defs>
                                <linearGradient id="uplinkMsgGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="downlinkMsgGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#888' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#fff' }} />
                              <Legend />
                              <Area type="monotone" dataKey="uplinks" stroke="#10b981" strokeWidth={2} fill="url(#uplinkMsgGrad)" name="Uplinks" />
                              <Area type="monotone" dataKey="downlinks" stroke="#3b82f6" strokeWidth={2} fill="url(#downlinkMsgGrad)" name="Downlinks" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No message data for this period</div>
                        )}
                      </ChartCard>
                    )}

                    {/* Row: Uplink Activity + Downlink Activity */}
                    {(visibleGraphs.uplinkActivity || visibleGraphs.downlinkActivity) && (
                      <div className={`grid grid-cols-1 ${visibleGraphs.uplinkActivity && visibleGraphs.downlinkActivity ? 'lg:grid-cols-2' : ''} gap-6`}>
                        {visibleGraphs.uplinkActivity && (
                          <ChartCard title="Uplink Activity" icon={<ArrowUpCircle className="h-5 w-5 text-green-500" />}
                            onDownload={(fmt) => downloadChartData(uplinkChartData, 'uplink-activity', fmt)}>
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
                          </ChartCard>
                        )}
                        {visibleGraphs.downlinkActivity && (
                          <ChartCard title="Downlink Activity" icon={<ArrowDownCircle className="h-5 w-5 text-blue-500" />}
                            onDownload={(fmt) => downloadChartData(downlinkChartData, 'downlink-activity', fmt)}>
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
                          </ChartCard>
                        )}
                      </div>
                    )}

                    {/* Row: Signal Quality + SF Distribution */}
                    {(visibleGraphs.signalQuality || visibleGraphs.sfDistribution) && (
                      <div className={`grid grid-cols-1 ${visibleGraphs.signalQuality && visibleGraphs.sfDistribution ? 'lg:grid-cols-2' : ''} gap-6`}>
                        {visibleGraphs.signalQuality && (
                          <ChartCard title="Signal Quality" icon={<Signal className="h-5 w-5 text-purple-500" />}
                            onDownload={(fmt) => downloadChartData(uplinkChartData, 'signal-quality', fmt)}>
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
                          </ChartCard>
                        )}
                        {visibleGraphs.sfDistribution && (
                          <ChartCard title="Uplinks by Device" icon={<BarChart3 className="h-5 w-5 text-indigo-500" />}
                            onDownload={(fmt) => downloadChartData(sfChartData, 'uplinks-by-device', fmt)}>
                            {sfChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={sfChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#fff' }} />
                                  <Bar dataKey="count" name="Uplinks" radius={[4, 4, 0, 0]}>
                                    {sfChartData.map((entry, index) => (
                                      <Cell key={`dev-${index}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No device data for this period</div>
                            )}
                          </ChartCard>
                        )}
                      </div>
                    )}

                    {/* Row: Gateway Traffic + Downlink Status */}
                    {(visibleGraphs.gatewayTraffic || visibleGraphs.downlinkStatus) && (
                      <div className={`grid grid-cols-1 ${visibleGraphs.gatewayTraffic && visibleGraphs.downlinkStatus ? 'lg:grid-cols-2' : ''} gap-6`}>
                        {visibleGraphs.gatewayTraffic && (
                          <ChartCard title="Gateway Traffic" icon={<Server className="h-5 w-5 text-cyan-500" />}
                            onDownload={(fmt) => downloadChartData(gatewayChartData.map((g) => ({ gateway: g.fullId, uplinks: g.count, avgRssi: g.avgRssi, avgSnr: g.avgSnr })), 'gateway-traffic', fmt)}>
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
                          </ChartCard>
                        )}
                        {visibleGraphs.downlinkStatus && (
                          <ChartCard title="Downlink Status Breakdown" icon={<ArrowDownCircle className="h-5 w-5 text-orange-500" />}
                            onDownload={(fmt) => downloadChartData(statusChartData.map((s) => ({ status: s.name, count: s.value })), 'downlink-status', fmt)}>
                            {statusChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
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
                          </ChartCard>
                        )}
                      </div>
                    )}

                    {/* Row: Hourly Activity + Frequency Band */}
                    {(visibleGraphs.hourlyActivity || visibleGraphs.frequencyBand) && (
                      <div className={`grid grid-cols-1 ${visibleGraphs.hourlyActivity && visibleGraphs.frequencyBand ? 'lg:grid-cols-2' : ''} gap-6`}>
                        {visibleGraphs.hourlyActivity && (
                          <ChartCard title="Hourly Activity Pattern" icon={<Calendar className="h-5 w-5 text-amber-500" />}
                            onDownload={(fmt) => downloadChartData(hourlyData, 'hourly-activity', fmt)}>
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
                          </ChartCard>
                        )}
                        {visibleGraphs.frequencyBand && (
                          <ChartCard title="Frequency Band Usage (MHz)" icon={<Wifi className="h-5 w-5 text-teal-500" />}
                            onDownload={(fmt) => downloadChartData(frequencyData, 'frequency-band', fmt)}>
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
                          </ChartCard>
                        )}
                      </div>
                    )}

                    {/* Tables: Top Active Devices + Gateway Performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-semibold flex items-center gap-2">
                            <Radio className="h-5 w-5 text-green-500" />Top Active Devices
                          </h3>
                          <button
                            onClick={() => downloadChartData(
                              stats?.topDevices?.map((d) => ({ deviceId: d._id, uplinks: d.uplinkCount, avgRssi: d.avgRssi?.toFixed(1), avgSnr: d.avgSnr?.toFixed(1), lastSeen: d.lastSeen })) || [],
                              'top-devices', 'csv'
                            )}
                            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors" title="Export CSV"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
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

                      <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-semibold flex items-center gap-2">
                            <Server className="h-5 w-5 text-cyan-500" />Gateway Performance
                          </h3>
                          <button
                            onClick={() => downloadChartData(
                              gateways.map((gw) => ({ gatewayId: gw.gatewayId, name: gw.name, status: gw.isOnline ? 'Online' : 'Offline', totalUplinks: gw.metrics.totalUplinksSeen, avgRssi: gw.metrics.avgRssi?.toFixed(1), avgSnr: gw.metrics.avgSnr?.toFixed(1), lastSeen: gw.lastSeen })),
                              'gateway-performance', 'csv'
                            )}
                            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors" title="Export CSV"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                    className="space-y-4"
                  >
                    {/* LoRaWAN Sub-Tab Header */}
                    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Radio className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-sm">LoRaWAN</span>
                      </div>
                      <div className="h-5 w-px bg-border/50" />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLorawanMode('monitoring')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                            lorawanMode === 'monitoring'
                              ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                              : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                          }`}
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Monitoring
                        </button>
                        <button
                          onClick={() => setLorawanMode('control')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                            lorawanMode === 'control'
                              ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30'
                              : 'bg-secondary/50 hover:bg-secondary/80 text-muted-foreground'
                          }`}
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                          Control
                        </button>
                      </div>
                      {selectedMonitorDevice && (
                        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5" />
                          <span className="font-mono text-foreground">{selectedMonitorDevice.displayName || selectedMonitorDevice.name}</span>
                        </span>
                      )}
                    </div>

                    {/* Device Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {devices.map((device) => (
                        <motion.div
                          key={device._id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-5 rounded-xl bg-card/50 backdrop-blur-sm border transition-all cursor-pointer ${
                            selectedMonitorDevice?._id === device._id
                              ? 'border-green-500/50 bg-green-500/5'
                              : 'border-border/50 hover:border-green-500/30'
                          }`}
                          onClick={() => setSelectedMonitorDevice(prev => prev?._id === device._id ? null : device)}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              {editingDeviceId === device._id ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={e => setEditNameValue(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveDeviceName(device);
                                      if (e.key === 'Escape') setEditingDeviceId(null);
                                    }}
                                    className="px-2 py-0.5 rounded-lg text-sm bg-background/80 border border-green-500/40 w-full font-semibold"
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveDeviceName(device)} className="p-1 text-green-500 hover:text-green-400 shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setEditingDeviceId(null)} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-semibold text-sm truncate">{device.displayName || device.name}</h4>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setEditingDeviceId(device._id);
                                      setEditNameValue(device.displayName || device.name);
                                    }}
                                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    title="Edit name"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              <p className="text-xs font-mono text-muted-foreground truncate">{device.deviceId}</p>
                            </div>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs flex items-center gap-1 shrink-0 ${
                              device.isOnline ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              {device.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                              {device.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          {/* Card Fields */}
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Connected Time</span>
                              <span className="text-xs">
                                {device.isOnline && device.connectedSince
                                  ? formatDate(device.connectedSince)
                                  : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Update</span>
                              <span className="text-xs">
                                {device.lastUplink?.timestamp
                                  ? formatDate(device.lastUplink.timestamp)
                                  : device.lastSeen ? formatDate(device.lastSeen) : '—'}
                              </span>
                            </div>
                            {!device.isOnline && device.lastSeen && (
                              <div className="flex justify-between">
                                <span className="text-orange-400/80 text-muted-foreground">Disconnected</span>
                                <span className="text-xs text-orange-400/80">{formatDate(device.lastSeen)}</span>
                              </div>
                            )}
                            {device.lastUplink?.gatewayId && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gateway</span>
                                <span className="font-mono text-xs truncate max-w-[140px]">{device.lastUplink.gatewayId}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer: selection indicator + inline logs link */}
                          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                            <span className={`text-xs font-medium ${
                              selectedMonitorDevice?._id === device._id ? 'text-green-500' : 'text-muted-foreground'
                            }`}>
                              {selectedMonitorDevice?._id === device._id ? '● Monitoring' : 'Click to monitor'}
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleViewDeviceLogs(device);
                              }}
                              className={`text-xs transition-colors flex items-center gap-1 ${
                                inlineLogsDevice?._id === device._id
                                  ? 'text-green-500'
                                  : 'text-muted-foreground hover:text-green-500'
                              }`}
                            >
                              <Activity className="h-3 w-3" />
                              {inlineLogsDevice?._id === device._id ? 'Hide Logs' : 'View Logs'}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                      {devices.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                          <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No devices found. Click &quot;Sync Devices&quot; to fetch from TTN.</p>
                        </div>
                      )}
                    </div>

                    {/* Inline Device Logs Panel */}
                    {inlineLogsDevice && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden"
                      >
                        <div className="p-4 border-b border-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-semibold">
                              {inlineLogsDevice.displayName || inlineLogsDevice.name}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{inlineLogsDevice.deviceId}</span>
                            <span className="px-2 py-0.5 rounded-lg text-xs bg-green-500/10 text-green-500 border border-green-500/20">
                              Last 7 Days
                            </span>
                          </div>
                          <button onClick={() => { setInlineLogsDevice(null); setInlineLogsData([]); }} className="p-1 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          {inlineLogsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : inlineLogsData.length > 0 ? (
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-card/80 backdrop-blur-sm">
                                  <tr className="text-muted-foreground border-b border-border/50">
                                    <th className="text-left py-2 pr-3 w-8">Type</th>
                                    <th className="text-left py-2 pr-3">Time</th>
                                    <th className="text-left py-2 pr-3">Device</th>
                                    <th className="text-left py-2 pr-3">Port</th>
                                    <th className="text-left py-2 pr-3">Payload</th>
                                    <th className="text-left py-2 pr-3">RSSI / Status</th>
                                    <th className="text-left py-2">Gateway</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                  {inlineLogsData.map((entry) => (
                                    <tr key={entry._id + entry._timestamp} className="hover:bg-secondary/20">
                                      <td className="py-2 pr-3">
                                        {entry._type === 'uplink'
                                          ? <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" />
                                          : <ArrowDownCircle className="h-3.5 w-3.5 text-blue-500" />}
                                      </td>
                                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(entry._timestamp)}</td>
                                      <td className="py-2 pr-3 font-mono max-w-[100px] truncate" title={entry.deviceId}>
                                        {inlineLogsDevice.displayName || inlineLogsDevice.name || entry.deviceId}
                                      </td>
                                      <td className="py-2 pr-3">{entry.fPort ?? '-'}</td>
                                      <td className="py-2 pr-3 font-mono max-w-[100px]">
                                        {(() => {
                                          const payload = entry._type === 'uplink' ? entry.rawPayload || '' : entry.payload || '';
                                          if (!payload) return '-';
                                          return (
                                            <div className="flex items-center gap-1">
                                              <span className="truncate" title={formatPayload(payload)}>{formatPayloadText(payload)}</span>
                                              <button onClick={() => handleCopyPayload(payload)} className="shrink-0 p-0.5 rounded hover:bg-secondary/50">
                                                {copiedPayload === payload ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                              </button>
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="py-2 pr-3">
                                        {entry._type === 'uplink' ? (
                                          <span className={getRssiColor(entry.rssi ?? 0)}>
                                            {entry.rssi != null ? `${entry.rssi} dBm` : '—'}
                                          </span>
                                        ) : (
                                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            entry.status === 'ACKNOWLEDGED' ? 'bg-green-500/10 text-green-500' :
                                            entry.status === 'SENT' ? 'bg-blue-500/10 text-blue-500' :
                                            entry.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                                            'bg-yellow-500/10 text-yellow-500'
                                          }`}>{entry.status}</span>
                                        )}
                                      </td>
                                      <td className="py-2 font-mono max-w-[100px] truncate">{entry.gatewayId || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">No log entries for this device in the last 7 days</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Device Detail Panel */}
                    {selectedMonitorDevice && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden"
                      >
                        {/* Panel Header */}
                        <div className="p-4 border-b border-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold">{selectedMonitorDevice.displayName || selectedMonitorDevice.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{selectedMonitorDevice.deviceId}</span>
                            {lorawanMode === 'monitoring' ? (
                              <span className="px-2 py-0.5 rounded-lg text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20">Monitoring Mode</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-xs bg-purple-500/10 text-purple-500 border border-purple-500/20">Control Mode</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {lorawanMode === 'control' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDeviceForDownlink(selectedMonitorDevice);
                                  setShowDownlinkModal(true);
                                }}
                                disabled={!selectedApplication?.hasApiKey}
                              >
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Send Downlink
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadDevicePanelData(selectedMonitorDevice.deviceId, lorawanMode)}
                              disabled={devicePanelLoading}
                            >
                              {devicePanelLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            </Button>
                            <button onClick={() => setSelectedMonitorDevice(null)} className="p-1 text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-6">
                          {/* Uplink section — shown in both Monitoring and Control modes */}
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <ArrowUpCircle className="h-4 w-4 text-green-500" />
                              Recent Uplinks
                            </h4>
                            {devicePanelLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : devicePanelUplinks.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border/50">
                                      <th className="text-left py-2 pr-3">Time</th>
                                      <th className="text-left py-2 pr-3">Port</th>
                                      <th className="text-left py-2 pr-3">Payload</th>
                                      <th className="text-left py-2 pr-3">RSSI</th>
                                      <th className="text-left py-2 pr-3">GWs</th>
                                      <th className="text-left py-2">Gateway</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/30">
                                    {devicePanelUplinks.map((uplink) => (
                                      <React.Fragment key={uplink._id}>
                                        <tr
                                          className="hover:bg-secondary/20 cursor-pointer"
                                          onClick={() => setExpandedUplinkId(expandedUplinkId === uplink._id ? null : uplink._id)}
                                        >
                                          <td className="py-2 pr-3 whitespace-nowrap">{formatDate(uplink.receivedAt)}</td>
                                          <td className="py-2 pr-3">{uplink.fPort}</td>
                                          <td className="py-2 pr-3 font-mono max-w-[120px]">
                                            <div className="flex items-center gap-1">
                                              <span className="truncate" title={formatPayload(uplink.rawPayload)}>{formatPayloadText(uplink.rawPayload)}</span>
                                              <button onClick={e => { e.stopPropagation(); handleCopyPayload(uplink.rawPayload); }} className="shrink-0 p-0.5 rounded hover:bg-secondary/50">
                                                {copiedPayload === uplink.rawPayload ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                              </button>
                                            </div>
                                          </td>
                                          <td className={`py-2 pr-3 ${getRssiColor(uplink.rssi ?? 0)}`}>
                                            {uplink.rssi != null ? `${uplink.rssi}` : '—'}
                                          </td>
                                          <td className="py-2 pr-3">
                                            <span className="flex items-center gap-1">
                                              {uplink.gateways?.length || 1}
                                              {(uplink.gateways?.length || 0) > 1 && (
                                                expandedUplinkId === uplink._id
                                                  ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                                                  : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                              )}
                                            </span>
                                          </td>
                                          <td className="py-2 font-mono truncate max-w-[100px]">{uplink.gatewayId}</td>
                                        </tr>
                                        {expandedUplinkId === uplink._id && uplink.gateways && uplink.gateways.length > 0 && (
                                          <tr>
                                            <td colSpan={6} className="py-2 px-2 bg-secondary/20">
                                              <div className="flex flex-wrap gap-2">
                                                {uplink.gateways.map((gw, i) => (
                                                  <div key={i} className="text-xs p-2 rounded-lg bg-secondary/40 border border-border/30">
                                                    <p className="font-mono font-semibold">{gw.gatewayId}</p>
                                                    <p>RSSI: <span className={getRssiColor(gw.rssi)}>{gw.rssi} dBm</span> | SNR: {gw.snr} dB</p>
                                                  </div>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs text-center py-6">No uplinks received for this device yet</p>
                            )}
                          </div>

                          {/* Downlink section — shown in Control mode only */}
                          {lorawanMode === 'control' && (
                            <div className="pt-2 border-t border-border/50">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                                Recent Downlinks
                              </h4>
                              {devicePanelDownlinks.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground border-b border-border/50">
                                        <th className="text-left py-2 pr-3">Time</th>
                                        <th className="text-left py-2 pr-3">Port</th>
                                        <th className="text-left py-2 pr-3">Payload</th>
                                        <th className="text-left py-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                      {devicePanelDownlinks.map((dl) => (
                                        <tr key={dl._id} className="hover:bg-secondary/20">
                                          <td className="py-2 pr-3 whitespace-nowrap">{formatDate(dl.createdAt)}</td>
                                          <td className="py-2 pr-3">{dl.fPort}</td>
                                          <td className="py-2 pr-3 font-mono max-w-[120px]">
                                            <div className="flex items-center gap-1">
                                              <span className="truncate" title={formatPayload(dl.payload)}>{formatPayloadText(dl.payload)}</span>
                                              <button onClick={() => handleCopyPayload(dl.payload)} className="shrink-0 p-0.5 rounded hover:bg-secondary/50">
                                                {copiedPayload === dl.payload ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                              </button>
                                            </div>
                                          </td>
                                          <td className="py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                              dl.status === 'ACKNOWLEDGED' ? 'bg-green-500/10 text-green-500' :
                                              dl.status === 'SENT' ? 'bg-blue-500/10 text-blue-500' :
                                              dl.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                                              'bg-yellow-500/10 text-yellow-500'
                                            }`}>{dl.status}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-xs text-center py-4">
                                  No downlinks yet. Use the &quot;Send Downlink&quot; button above to send a command.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
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
                      <div className="grid grid-cols-2 gap-4">
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
                            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                              gw.isOnline ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${gw.isOnline ? 'bg-green-500' : 'bg-slate-500'}`} />
                              {gw.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-sm">
                            {(gw.connectedSince || gw.firstSeen) && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Connected Time</span>
                                <span className="text-xs">{formatRelativeTime(gw.connectedSince || gw.firstSeen)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Update</span>
                              <span className="text-xs">{formatRelativeTime(gw.lastSeen)}</span>
                            </div>
                            {!gw.isOnline && (
                              <div className="flex justify-between">
                                <span className="text-orange-400/80 text-muted-foreground">Disconnected</span>
                                <span className="text-xs text-orange-400/80">{formatDate(gw.lastSeen)}</span>
                              </div>
                            )}
                            {gw.location && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> Location
                                </span>
                                <span className="text-xs">
                                  {gw.location.latitude.toFixed(4)}, {gw.location.longitude.toFixed(4)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Uplinks</span>
                              <span className="font-semibold">{gw.metrics.totalUplinksSeen}</span>
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
                          {(['1h', '6h', '24h', '7d'] as const).map((range) => (
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

                    {/* Log Count / Loading / Error */}
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {logsLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Loading logs...</span>
                        </>
                      ) : logsError ? (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {logsError}
                        </span>
                      ) : (
                        <span>Showing {logs.length} of {logsTotal} events</span>
                      )}
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
                        {logsLoading && logs.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <Loader2 className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                            <p>Fetching log entries...</p>
                          </div>
                        )}
                        {!logsLoading && logs.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No log entries in this time range</p>
                            <p className="text-xs mt-1">Try extending the time range or check that uplinks are being received.</p>
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

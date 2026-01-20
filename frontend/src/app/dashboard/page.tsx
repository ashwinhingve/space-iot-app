'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import StatsCard from '@/components/dashboard/StatsCard';
import AnalyticsChart from '@/components/dashboard/AnalyticsChart';
import DeviceStatusGrid from '@/components/dashboard/DeviceStatusGrid';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import SystemHealthMonitor from '@/components/dashboard/SystemHealthMonitor';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ManifoldOverview from '@/components/dashboard/ManifoldOverview';
import { RootState, AppDispatch } from '@/store/store';
import { fetchDevices, updateDeviceData, updateDeviceStatus } from '@/store/slices/deviceSlice';
import { fetchManifolds } from '@/store/slices/manifoldSlice';
import {
  fetchDashboardStats,
  fetchAnalytics,
  fetchAlerts,
  updateSystemHealth,
  addActivity,
  acknowledgeAlert,
} from '@/store/slices/dashboardSlice';
import { SOCKET_CONFIG } from '@/lib/config';
import {
  Wifi,
  Box,
  AlertTriangle,
  Power,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const { devices } = useSelector((state: RootState) => state.devices);
  const { manifolds } = useSelector((state: RootState) => state.manifolds);
  const { stats, analytics, systemHealth, alerts, recentActivity } = useSelector(
    (state: RootState) => state.dashboard
  );

  // Debug: Log stats whenever they change
  useEffect(() => {
    console.log('Dashboard stats updated:', stats);
  }, [stats]);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      dispatch(fetchDevices()),
      dispatch(fetchManifolds({})),
      dispatch(fetchDashboardStats()),
      dispatch(fetchAnalytics()),
      dispatch(fetchAlerts()),
    ]);
    setIsRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const newSocket = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);

    newSocket.on('connect', () => {
      console.log('Dashboard connected to Socket.io');
      setIsConnected(true);
      dispatch(updateSystemHealth({ network: 'excellent' }));
    });

    newSocket.on('disconnect', () => {
      console.log('Dashboard disconnected from Socket.io');
      setIsConnected(false);
      dispatch(updateSystemHealth({ network: 'poor' }));
    });

    newSocket.on('deviceData', (data: { deviceId: string; data: Record<string, unknown> }) => {
      dispatch(updateDeviceData({ deviceId: data.deviceId, data: data.data }));
      dispatch(addActivity({
        action: 'Data received',
        device: data.deviceId,
        status: 'success',
      }));
    });

    newSocket.on('deviceStatus', (data: { deviceId: string; status: string }) => {
      dispatch(updateDeviceStatus({ deviceId: data.deviceId, status: data.status }));
      dispatch(addActivity({
        action: `Device ${data.status}`,
        device: data.deviceId,
        status: data.status === 'online' ? 'success' : 'warning',
      }));
      // Refresh stats when device status changes
      dispatch(fetchDashboardStats());
    });

    const healthInterval = setInterval(() => {
      dispatch(updateSystemHealth({
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 20) + 40,
        uptime: Math.floor((Date.now() - new Date().setHours(0, 0, 0, 0)) / 1000),
        lastUpdated: new Date().toISOString(),
      }));
    }, 5000);

    return () => {
      newSocket.disconnect();
      clearInterval(healthInterval);
    };
  }, [dispatch]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      dispatch(fetchDashboardStats());
      dispatch(fetchAlerts());
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [dispatch]);

  const handleAcknowledgeAlert = (alertId: string) => {
    dispatch(acknowledgeAlert(alertId));
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  const deviceActivityChart = analytics?.deviceActivity || {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0],
  };

  const valveOperationsChart = analytics?.valveOperations || {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    onCount: [0, 0, 0, 0, 0, 0, 0],
    offCount: [0, 0, 0, 0, 0, 0, 0],
  };

  const energyChart = analytics?.energyConsumption || {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0],
  };

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        {/* Animated Background */}
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
          >
            <div>
              <motion.div
                className="flex items-center gap-3 mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl border border-brand-500/20">
                    <LayoutDashboard className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'}
                </h1>
              </motion.div>
              <motion.p
                className="text-muted-foreground ml-[52px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Here&apos;s what&apos;s happening with your IoT systems
              </motion.p>
            </div>

            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Connection Status */}
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

              {/* Refresh Button */}
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

          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {[
              {
                title: 'Devices Online',
                value: stats.devicesOnline,
                subtitle: `${stats.devicesOffline} offline`,
                icon: Wifi,
                color: 'green' as const,
                trend: { value: 12, isPositive: true },
              },
              {
                title: 'Active Manifolds',
                value: stats.manifoldsActive,
                subtitle: `${stats.manifoldsFault} with faults`,
                icon: Box,
                color: 'blue' as const,
              },
              {
                title: 'Valves Running',
                value: stats.valvesOn,
                subtitle: `${stats.valvesOff} standby`,
                icon: Power,
                color: 'purple' as const,
              },
              {
                title: 'Active Alerts',
                value: stats.activeAlerts,
                subtitle: 'Requires attention',
                icon: AlertTriangle,
                color: (stats.activeAlerts > 0 ? 'red' : 'green') as 'red' | 'green',
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <StatsCard
                  title={stat.title}
                  value={stat.value}
                  subtitle={stat.subtitle}
                  icon={stat.icon}
                  color={stat.color}
                  trend={stat.trend}
                  delay={index * 0.1}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Charts */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <AnalyticsChart
                title="Device Activity"
                subtitle="Commands and data points over the last 7 days"
                data={deviceActivityChart}
                type="area"
                color="#3b82f6"
                delay={0.2}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnalyticsChart
                  title="Valve Operations"
                  subtitle="ON/OFF cycles per day"
                  data={{
                    labels: valveOperationsChart.labels,
                    datasets: [
                      { name: 'ON', data: valveOperationsChart.onCount, color: '#10b981' },
                      { name: 'OFF', data: valveOperationsChart.offCount, color: '#6366f1' },
                    ],
                  }}
                  type="multiBar"
                  height={220}
                  delay={0.3}
                />
                <AnalyticsChart
                  title="Energy Consumption"
                  subtitle="kWh usage trend"
                  data={energyChart}
                  type="line"
                  color="#f59e0b"
                  height={220}
                  delay={0.4}
                />
              </div>
            </motion.div>

            {/* Right Column - Status & Health */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
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

          {/* Bottom Section */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <DeviceStatusGrid
              devices={devices}
              onDeviceClick={(device) => router.push(`/devices/${device._id}`)}
            />
            <ManifoldOverview
              manifolds={manifolds}
            />
            <RecentActivity
              activities={recentActivity}
            />
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}

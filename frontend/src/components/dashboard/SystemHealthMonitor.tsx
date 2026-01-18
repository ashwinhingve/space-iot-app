'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Activity,
  Server,
  Database,
  Cloud,
} from 'lucide-react';

interface SystemHealth {
  cpu: number;
  memory: number;
  network: 'excellent' | 'good' | 'fair' | 'poor';
  uptime: number;
  lastUpdated: string;
}

interface SystemHealthMonitorProps {
  health: SystemHealth;
  isConnected?: boolean;
}

const CircularProgress = ({
  value,
  size = 80,
  strokeWidth = 8,
  color,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-foreground">{value}%</span>
      </div>
    </div>
  );
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getNetworkColor = (network: string) => {
  switch (network) {
    case 'excellent':
      return 'text-emerald-400';
    case 'good':
      return 'text-blue-400';
    case 'fair':
      return 'text-amber-400';
    case 'poor':
      return 'text-red-400';
    default:
      return 'text-muted-foreground';
  }
};

const getUsageColor = (value: number) => {
  if (value < 50) return 'text-emerald-400';
  if (value < 75) return 'text-amber-400';
  return 'text-red-400';
};

export function SystemHealthMonitor({
  health,
  isConnected = true,
}: SystemHealthMonitorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const services = [
    { name: 'API Server', status: isConnected, icon: Server },
    { name: 'Database', status: true, icon: Database },
    { name: 'MQTT Broker', status: isConnected, icon: Cloud },
    { name: 'WebSocket', status: isConnected, icon: Wifi },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isConnected ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            <Activity className={`h-5 w-5 ${
              isConnected ? 'text-emerald-400' : 'text-red-400'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">System Health</h3>
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'All systems operational' : 'Connection issues detected'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {currentTime.toLocaleTimeString()}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentTime.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col items-center">
          <CircularProgress
            value={health.cpu}
            color={getUsageColor(health.cpu)}
          />
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-foreground flex items-center gap-2 justify-center">
              <Cpu className="h-4 w-4" />
              CPU
            </p>
            <p className="text-xs text-muted-foreground">Usage</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <CircularProgress
            value={health.memory}
            color={getUsageColor(health.memory)}
          />
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-foreground flex items-center gap-2 justify-center">
              <HardDrive className="h-4 w-4" />
              Memory
            </p>
            <p className="text-xs text-muted-foreground">Usage</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-background/30 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className={`h-4 w-4 ${getNetworkColor(health.network)}`} />
            <span className="text-xs text-muted-foreground">Network</span>
          </div>
          <p className={`text-sm font-medium capitalize ${getNetworkColor(health.network)}`}>
            {health.network}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-background/30 border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted-foreground">Uptime</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {formatUptime(health.uptime)}
          </p>
        </div>
      </div>

      {/* Services Status */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Services
        </p>
        <div className="grid grid-cols-2 gap-2">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-background/20"
              >
                <div className={`w-2 h-2 rounded-full ${
                  service.status ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-foreground">{service.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default SystemHealthMonitor;

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  Thermometer,
  Gauge,
  Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Device {
  _id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  mqttTopic: string;
  lastData?: {
    timestamp: string;
    value: number;
  };
  settings?: {
    temperature?: number;
    humidity?: number;
    value?: number;
  };
}

interface DeviceStatusGridProps {
  devices: Device[];
  onDeviceClick?: (device: Device) => void;
  maxDisplay?: number;
}

const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'sensor':
      return Thermometer;
    case 'switch':
      return Power;
    case 'slider':
      return Gauge;
    case 'chart':
      return Activity;
    default:
      return Cpu;
  }
};

const getDeviceValue = (device: Device) => {
  if (device.settings?.temperature !== undefined) {
    return `${device.settings.temperature}°C`;
  }
  if (device.settings?.humidity !== undefined) {
    return `${device.settings.humidity}%`;
  }
  if (device.settings?.value !== undefined) {
    return device.settings.value.toString();
  }
  if (device.lastData?.value !== undefined) {
    return device.lastData.value.toString();
  }
  return '--';
};

const formatLastSeen = (timestamp?: string) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export function DeviceStatusGrid({
  devices,
  onDeviceClick,
  maxDisplay = 8,
}: DeviceStatusGridProps) {
  const displayDevices = devices.slice(0, maxDisplay);
  const remainingCount = Math.max(0, devices.length - maxDisplay);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Device Status</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {devices.filter(d => d.status === 'online').length} of {devices.length} online
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          View All
        </Button>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Cpu className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No devices connected</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Add devices to see their status here
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {displayDevices.map((device) => {
            const Icon = getDeviceIcon(device.type);
            const isOnline = device.status === 'online';

            return (
              <motion.div
                key={device._id}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onDeviceClick?.(device)}
                className={`
                  relative p-4 rounded-xl cursor-pointer
                  transition-all duration-300
                  ${isOnline
                    ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:border-emerald-500/40'
                    : 'bg-gradient-to-br from-slate-500/10 to-slate-600/5 border border-slate-500/20 hover:border-slate-500/40'
                  }
                `}
              >
                {/* Status indicator */}
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`} />

                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    isOnline ? 'bg-emerald-500/20' : 'bg-slate-500/20'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isOnline ? 'text-emerald-400' : 'text-slate-400'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {device.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium ${
                        isOnline ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatLastSeen(device.lastData?.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">
                      {getDeviceValue(device)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {device.type}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {remainingCount > 0 && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center p-4 rounded-xl border border-dashed border-border/50 text-muted-foreground"
            >
              <span className="text-sm">+{remainingCount} more devices</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default DeviceStatusGrid;

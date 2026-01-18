'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Bell,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: string) => void;
  onViewAll?: () => void;
  maxDisplay?: number;
}

const alertConfig = {
  critical: {
    icon: AlertCircle,
    bg: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  success: {
    icon: CheckCircle,
    bg: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export function AlertsPanel({
  alerts,
  onAcknowledge,
  onViewAll,
  maxDisplay = 5,
}: AlertsPanelProps) {
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const displayAlerts = unacknowledgedAlerts.slice(0, maxDisplay);
  const criticalCount = unacknowledgedAlerts.filter(a => a.type === 'critical').length;

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
            criticalCount > 0 ? 'bg-red-500/20' : 'bg-blue-500/20'
          }`}>
            <Bell className={`h-5 w-5 ${
              criticalCount > 0 ? 'text-red-400 animate-pulse' : 'text-blue-400'
            }`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Alerts</h3>
            <p className="text-sm text-muted-foreground">
              {unacknowledgedAlerts.length} unacknowledged
              {criticalCount > 0 && (
                <span className="text-red-400 ml-1">({criticalCount} critical)</span>
              )}
            </p>
          </div>
        </div>
        {alerts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-muted-foreground"
          >
            View All
          </Button>
        )}
      </div>

      {displayAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-muted-foreground">All clear!</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No active alerts at this time
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayAlerts.map((alert, index) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    relative p-4 rounded-xl
                    bg-gradient-to-r ${config.bg}
                    border ${config.border}
                    transition-all duration-300
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-background/50`}>
                      <Icon className={`h-4 w-4 ${config.iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.badge}`}>
                          {alert.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <p className="font-medium text-foreground text-sm">
                        {alert.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Source: {alert.source}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onAcknowledge?.(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {unacknowledgedAlerts.length > maxDisplay && (
            <p className="text-center text-sm text-muted-foreground pt-2">
              +{unacknowledgedAlerts.length - maxDisplay} more alerts
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default AlertsPanel;

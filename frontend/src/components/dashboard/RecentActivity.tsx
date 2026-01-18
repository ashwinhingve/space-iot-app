'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Power,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  User,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  device: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  user?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  maxDisplay?: number;
}

const getActivityIcon = (action: string) => {
  if (action.toLowerCase().includes('power') || action.toLowerCase().includes('toggle')) {
    return Power;
  }
  if (action.toLowerCase().includes('config') || action.toLowerCase().includes('setting')) {
    return Settings;
  }
  if (action.toLowerCase().includes('alert') || action.toLowerCase().includes('alarm')) {
    return AlertTriangle;
  }
  return Activity;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    case 'warning':
      return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' };
    case 'error':
      return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' };
    default:
      return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/20' };
  }
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
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function RecentActivity({
  activities,
  maxDisplay = 10,
}: RecentActivityProps) {
  const displayActivities = activities.slice(0, maxDisplay);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Clock className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">
              Last {displayActivities.length} actions
            </p>
          </div>
        </div>
      </div>

      {displayActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Device actions will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayActivities.map((activity, index) => {
            const ActionIcon = getActivityIcon(activity.action);
            const statusConfig = getStatusIcon(activity.status);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-background/30 border border-border/30 hover:bg-background/50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                  <ActionIcon className={`h-4 w-4 ${statusConfig.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.device}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default RecentActivity;

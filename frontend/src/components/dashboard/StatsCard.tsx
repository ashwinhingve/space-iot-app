'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
  delay?: number;
}

const colorClasses = {
  blue: {
    bg: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    icon: 'bg-blue-500/20 text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  green: {
    bg: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    icon: 'bg-emerald-500/20 text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  yellow: {
    bg: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    icon: 'bg-amber-500/20 text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  red: {
    bg: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    icon: 'bg-red-500/20 text-red-400',
    glow: 'shadow-red-500/20',
  },
  purple: {
    bg: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/30',
    icon: 'bg-purple-500/20 text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  cyan: {
    bg: 'from-cyan-500/20 to-cyan-600/10',
    border: 'border-cyan-500/30',
    icon: 'bg-cyan-500/20 text-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  delay = 0,
}: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        bg-gradient-to-br ${colors.bg}
        border ${colors.border}
        backdrop-blur-xl
        shadow-lg ${colors.glow}
        transition-all duration-300
      `}
    >
      {/* Background glow effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${colors.icon}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
                trend.isPositive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <motion.p
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default StatsCard;

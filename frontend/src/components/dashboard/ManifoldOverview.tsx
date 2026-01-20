'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Box,
  AlertTriangle,
  CheckCircle,
  Wrench,
  WifiOff,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Manifold {
  _id: string;
  manifoldId: string;
  name: string;
  status: 'Active' | 'Maintenance' | 'Offline' | 'Fault';
  specifications: {
    valveCount: number;
    maxPressure: number;
    maxFlowRate: number;
  };
  installationDetails: {
    location: string;
  };
  metadata: {
    totalCycles: number;
  };
}

interface ManifoldOverviewProps {
  manifolds: Manifold[];
  onManifoldClick?: (manifold: Manifold) => void;
  maxDisplay?: number;
}

const statusConfig = {
  Active: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  Maintenance: {
    icon: Wrench,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
  },
  Offline: {
    icon: WifiOff,
    color: 'text-slate-400',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/30',
  },
  Fault: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
  },
};

export function ManifoldOverview({
  manifolds,
  onManifoldClick,
  maxDisplay = 4,
}: ManifoldOverviewProps) {
  const router = useRouter();
  const displayManifolds = manifolds.slice(0, maxDisplay);

  const statusCounts = {
    Active: manifolds.filter(m => m.status === 'Active').length,
    Fault: manifolds.filter(m => m.status === 'Fault').length,
    Maintenance: manifolds.filter(m => m.status === 'Maintenance').length,
    Offline: manifolds.filter(m => m.status === 'Offline').length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl rounded-2xl border border-border/50 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Box className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Manifolds</h3>
            <p className="text-sm text-muted-foreground">
              {manifolds.length} total systems
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/manifolds')}
          className="text-muted-foreground"
        >
          View All
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          return (
            <div
              key={status}
              className={`p-2 rounded-lg ${config.bg} border ${config.border} text-center`}
            >
              <Icon className={`h-4 w-4 ${config.color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{status}</p>
            </div>
          );
        })}
      </div>

      {/* Manifold List */}
      {manifolds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Box className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No manifolds configured</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push('/manifolds/create')}
          >
            Add Manifold
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayManifolds.map((manifold, index) => {
            const config = statusConfig[manifold.status];
            const Icon = config.icon;

            return (
              <motion.div
                key={manifold._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => onManifoldClick?.(manifold) || router.push(`/manifolds/${manifold._id}`)}
                className={`
                  relative p-4 rounded-xl cursor-pointer
                  bg-gradient-to-r from-background/50 to-background/30
                  border ${config.border}
                  hover:border-opacity-60 transition-all duration-300
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{manifold.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {manifold.manifoldId} • {manifold.installationDetails?.location || 'No location'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        <span>{manifold.specifications?.maxPressure || 0} PSI</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {manifold.metadata?.totalCycles?.toLocaleString() || 0} cycles
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {manifolds.length > maxDisplay && (
            <p className="text-center text-sm text-muted-foreground pt-2">
              +{manifolds.length - maxDisplay} more manifolds
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default ManifoldOverview;

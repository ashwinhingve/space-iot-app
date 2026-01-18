'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { fetchManifolds, deleteManifold } from '@/store/slices/manifoldSlice';
import { RootState, AppDispatch } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from '@/components/AnimatedBackground';
import {
  Plus,
  Factory,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wrench,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';

type ManifoldType = {
  _id: string;
  manifoldId: string;
  name: string;
  status: 'Active' | 'Maintenance' | 'Offline' | 'Fault';
  installationDetails: {
    location: string;
    installationDate: string;
  };
  specifications: {
    valveCount: number;
    manufacturer: string;
  };
  metadata: {
    totalCycles: number;
  };
  esp32DeviceId: any;
};

const statusConfig = {
  Active: {
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    pulse: true,
  },
  Maintenance: {
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: <Wrench className="h-3.5 w-3.5" />,
    pulse: false,
  },
  Offline: {
    color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
    pulse: false,
  },
  Fault: {
    color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    pulse: true,
  },
};

export default function ManifoldsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { manifolds = [], loading } = useSelector((state: RootState) => state.manifolds);

  useEffect(() => {
    dispatch(fetchManifolds({ status: filterStatus || undefined }));
  }, [dispatch, filterStatus]);

  const handleDelete = async (manifoldId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this manifold? This will also delete all associated valves and components.'
      )
    ) {
      try {
        await dispatch(deleteManifold(manifoldId));
      } catch (error) {
        console.error('Failed to delete manifold:', error);
      }
    }
  };

  const handleViewDetails = (manifoldId: string) => {
    router.push(`/manifolds/${manifoldId}`);
  };

  const handleCreateManifold = () => {
    router.push('/manifolds/create');
  };

  return (
    <MainLayout showFooter={false}>
      <div className="relative min-h-screen">
        {/* Animated Background */}
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="container relative z-10 py-10">
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <motion.div
                className="flex items-center gap-3 mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl border border-brand-500/20">
                    <Factory className="h-7 w-7 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  Industrial Manifolds
                </h1>
              </motion.div>
              <motion.p
                className="text-muted-foreground ml-[52px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Manage your 4-valve irrigation manifold systems
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Button
                onClick={handleCreateManifold}
                className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 btn-hover-lift flex items-center gap-2 group"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                Create Manifold
                <Sparkles className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            className="flex gap-2 mb-8 overflow-x-auto pb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {['All', 'Active', 'Maintenance', 'Offline', 'Fault'].map((status, index) => (
              <motion.button
                key={status}
                onClick={() => setFilterStatus(status === 'All' ? '' : status)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap backdrop-blur-sm ${
                  (status === 'All' && !filterStatus) || filterStatus === status
                    ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white shadow-lg shadow-brand-500/25'
                    : 'bg-secondary/50 hover:bg-secondary/80 border border-border/50 hover:border-brand-500/30'
                }`}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
              >
                {status}
              </motion.button>
            ))}
          </motion.div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-brand-500 border-r-purple-500"></div>
              </div>
              <p className="text-muted-foreground text-sm animate-pulse">Loading manifolds...</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 }
                }
              }}
            >
              {manifolds.map((manifold: ManifoldType, index: number) => (
                <motion.div
                  key={manifold._id}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="manifold-card group cursor-pointer"
                  onClick={() => handleViewDetails(manifold._id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative p-6">
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />

                    {/* Header */}
                    <div className="relative flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="icon-container-animated w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 text-brand-600 dark:text-brand-400 flex-shrink-0">
                          <Factory className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-lg truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {manifold.name}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {manifold.manifoldId}
                          </p>
                        </div>
                      </div>
                      <motion.span
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border backdrop-blur-sm ${
                          statusConfig[manifold.status].color
                        } ${statusConfig[manifold.status].pulse ? 'animate-pulse' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                        whileHover={{ scale: 1.05 }}
                      >
                        {statusConfig[manifold.status].icon}
                        {manifold.status}
                      </motion.span>
                    </div>

                    {/* Info Grid */}
                    <div className="relative space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm group/item">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover/item:text-brand-500 transition-colors" />
                        <span className="text-muted-foreground truncate">
                          {manifold.installationDetails.location || 'No location'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm group/item">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover/item:text-brand-500 transition-colors" />
                        <span className="text-muted-foreground">
                          Installed:{' '}
                          {new Date(
                            manifold.installationDetails.installationDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="relative grid grid-cols-2 gap-3 mb-6">
                      <div className="stats-badge bg-secondary/50 p-3 rounded-xl border border-border/50 group-hover:border-brand-500/20 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1">Valves</p>
                        <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground group-hover:from-brand-600 group-hover:to-purple-600 transition-all">
                          {manifold.specifications.valveCount}
                        </p>
                      </div>
                      <div className="stats-badge bg-secondary/50 p-3 rounded-xl border border-border/50 group-hover:border-brand-500/20 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1">Cycles</p>
                        <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground group-hover:from-brand-600 group-hover:to-purple-600 transition-all">
                          {manifold.metadata.totalCycles.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Manufacturer */}
                    <div className="relative mb-6">
                      <p className="text-xs text-muted-foreground mb-1">Manufacturer</p>
                      <p className="text-sm font-medium">
                        {manifold.specifications.manufacturer || 'AUTOMAT'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="relative flex gap-2 pt-4 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 hover:bg-brand-500/10 hover:border-brand-500/30 hover:text-brand-600 dark:hover:text-brand-400 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(manifold._id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(manifold._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty State */}
          {!loading && manifolds.length === 0 && (
            <motion.div
              className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 mesh-gradient opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 animate-pulse" style={{ animationDuration: '4s' }} />

              <div className="relative z-10 py-20 px-6 text-center">
                <motion.div
                  className="relative w-20 h-20 mx-auto mb-8"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-2xl blur-xl opacity-40" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Factory className="h-10 w-10 text-brand-600 dark:text-brand-400" />
                  </div>
                </motion.div>

                <motion.h3
                  className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  No Manifolds Yet
                </motion.h3>

                <motion.p
                  className="text-muted-foreground mb-8 max-w-md mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Create your first 4-valve irrigation manifold system to start controlling
                  your valves remotely
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={handleCreateManifold}
                    className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 btn-hover-lift group"
                  >
                    <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                    Create Your First Manifold
                    <Sparkles className="h-3.5 w-3.5 ml-2 opacity-70" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { fetchManifolds, deleteManifold } from '@/store/slices/manifoldSlice';
import { RootState, AppDispatch } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div className="container py-10">
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Factory className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              Industrial Manifolds
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your 4-valve irrigation manifold systems
            </p>
          </div>
          <Button
            onClick={handleCreateManifold}
            className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 btn-hover-lift flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Manifold
          </Button>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          className="flex gap-2 mb-8 overflow-x-auto pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {['All', 'Active', 'Maintenance', 'Offline', 'Fault'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status === 'All' ? '' : status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                (status === 'All' && !filterStatus) || filterStatus === status
                  ? 'bg-gradient-to-r from-brand-500 to-purple-500 text-white shadow-md'
                  : 'bg-secondary/50 hover:bg-secondary border border-border/50'
              }`}
            >
              {status}
            </button>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {manifolds.map((manifold: ManifoldType, index: number) => (
              <motion.div
                key={manifold._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="card-premium group cursor-pointer"
                onClick={() => handleViewDetails(manifold._id)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                        <Factory className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg truncate">
                          {manifold.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {manifold.manifoldId}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border ${
                        statusConfig[manifold.status].color
                      } ${statusConfig[manifold.status].pulse ? 'status-pulse' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {statusConfig[manifold.status].icon}
                      {manifold.status}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground truncate">
                        {manifold.installationDetails.location || 'No location'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Installed:{' '}
                        {new Date(
                          manifold.installationDetails.installationDate
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-secondary/50 p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Valves</p>
                      <p className="text-xl font-bold">
                        {manifold.specifications.valveCount}
                      </p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Cycles</p>
                      <p className="text-xl font-bold">
                        {manifold.metadata.totalCycles.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Manufacturer */}
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-1">Manufacturer</p>
                    <p className="text-sm font-medium">
                      {manifold.specifications.manufacturer || 'AUTOMAT'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-primary/5 hover:border-primary/30 btn-hover-lift"
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
                      className="flex-1 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive btn-hover-lift"
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
          </div>
        )}

        {/* Empty State */}
        {!loading && manifolds.length === 0 && (
          <motion.div
            className="empty-state relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5"></div>
            <div className="relative z-10 py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 flex items-center justify-center">
                <Factory className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No Manifolds Yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Create your first 4-valve irrigation manifold system to start controlling
                your valves remotely
              </p>
              <Button
                onClick={handleCreateManifold}
                className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 btn-hover-lift"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Manifold
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}

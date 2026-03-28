'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutGrid, Plus, Radio, Wifi, Activity, Cpu,
  Loader2, Clock, LayoutDashboard,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { RootState, AppDispatch } from '@/store/store';
import { fetchDashboards, fetchTemplates } from '@/store/slices/consoleSlice';
import type { ConsoleDashboard, DeviceType } from '@/store/slices/consoleSlice';
import { CreateDashboardModal } from '@/components/console/CreateDashboardModal';
import { fetchManifolds } from '@/store/slices/manifoldSlice';

const DEVICE_TYPE_ICONS: Record<DeviceType, React.ElementType> = {
  ttn:      Radio,
  wifi:     Wifi,
  manifold: Activity,
  mqtt:     Cpu,
};

const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  ttn:      'text-purple-400 bg-purple-500/10 border-purple-500/20',
  wifi:     'text-blue-400   bg-blue-500/10   border-blue-500/20',
  manifold: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/20',
  mqtt:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function DashboardCard({ dashboard }: { dashboard: ConsoleDashboard }) {
  const router = useRouter();
  const Icon = DEVICE_TYPE_ICONS[dashboard.deviceRef.deviceType] ?? LayoutDashboard;
  const colorCls = DEVICE_TYPE_COLORS[dashboard.deviceRef.deviceType] ?? '';

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={() => router.push(`/console/${dashboard._id}`)}
      className="text-left rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 space-y-3 hover:border-border/70 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${dashboard.color ?? '#00e5ff'}18`, border: `1px solid ${dashboard.color ?? '#00e5ff'}30` }}>
            <LayoutGrid className="h-4.5 w-4.5" style={{ color: dashboard.color ?? '#00e5ff' }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{dashboard.name}</p>
            {dashboard.description && (
              <p className="text-xs text-muted-foreground truncate">{dashboard.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorCls}`}>
          <Icon className="h-3 w-3" />
          {dashboard.deviceRef.deviceType.toUpperCase()}
        </span>
        {dashboard.deviceRef.deviceName && (
          <span className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]">{dashboard.deviceRef.deviceName}</span>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
        <span>{dashboard.widgets.length} widget{dashboard.widgets.length !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(dashboard.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </motion.button>
  );
}

export default function ConsolePage() {
  const dispatch = useDispatch<AppDispatch>();
  const dashboards = useSelector((s: RootState) => s.console.dashboards);
  const loading    = useSelector((s: RootState) => s.console.loading);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    dispatch(fetchDashboards());
    dispatch(fetchTemplates());
    dispatch(fetchManifolds({}));
  }, [dispatch]);

  return (
    <MainLayout>
      <RoleGuard permission="console">
        <div className="container max-w-7xl px-4 py-6 sm:py-8 space-y-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" style={{ color: '#00e5ff' }} />
                <h1 className="text-2xl font-bold">Console</h1>
              </div>
              <p className="text-sm text-muted-foreground">Blynk-style dashboards — real-time device monitoring &amp; control</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
              <Plus className="h-4 w-4" /> New Dashboard
            </Button>
          </motion.div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboards…
            </div>
          ) : dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                <LayoutGrid className="h-7 w-7 text-brand-400" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">No dashboards yet</p>
                <p className="text-sm text-muted-foreground">Create your first dashboard to start monitoring devices in real-time</p>
              </div>
              <Button onClick={() => setShowCreate(true)} className="bg-brand-500 hover:bg-brand-600 text-white gap-2 mt-2">
                <Plus className="h-4 w-4" /> Create Dashboard
              </Button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dashboards.map(d => <DashboardCard key={d._id} dashboard={d} />)}
            </motion.div>
          )}
        </div>

        {showCreate && <CreateDashboardModal onClose={() => setShowCreate(false)} />}
      </RoleGuard>
    </MainLayout>
  );
}

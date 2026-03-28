'use client';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { GridLayout } from 'react-grid-layout';
import type { LayoutItem } from 'react-grid-layout';
import {
  ArrowLeft, Edit2, Check, Plus, Settings2, Wifi, Radio,
  Activity, Cpu, Loader2, Trash2, LayoutGrid,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { RootState, AppDispatch } from '@/store/store';
import {
  fetchDashboard, saveDashboardLayout, deleteDashboard,
  setEditMode, clearWidgetValues, updateWidgetLayout, clearActiveDashboard,
} from '@/store/slices/consoleSlice';
import type { ConsoleWidget } from '@/store/slices/consoleSlice';
import { WidgetRenderer } from '@/components/console/WidgetRenderer';
import { WidgetConfigPanel } from '@/components/console/WidgetConfigPanel';
import { AddWidgetPanel } from '@/components/console/AddWidgetPanel';
import { useConsoleSocket } from '@/hooks/useConsoleSocket';

const DEVICE_TYPE_ICONS: Record<string, React.ElementType> = {
  ttn: Radio, wifi: Wifi, manifold: Activity, mqtt: Cpu,
};

const DEVICE_TYPE_COLORS: Record<string, string> = {
  ttn: 'text-purple-400',
  wifi: 'text-blue-400',
  manifold: 'text-cyan-400',
  mqtt: 'text-emerald-400',
};

// Grid constants
const COLS = 12;
const ROW_HEIGHT = 60;
const MARGIN: [number, number] = [8, 8];

function widgetsToLayout(widgets: ConsoleWidget[]): LayoutItem[] {
  return widgets.map(w => ({
    i: w.widgetId,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: w.layout.minW ?? 2,
    minH: w.layout.minH ?? 2,
    ...(w.layout.maxW ? { maxW: w.layout.maxW } : {}),
    ...(w.layout.maxH ? { maxH: w.layout.maxH } : {}),
    static: !!(w.layout.static),
  }));
}

function applyLayoutToWidgets(widgets: ConsoleWidget[], layouts: readonly LayoutItem[]): ConsoleWidget[] {
  return widgets.map(w => {
    const l = layouts.find(item => item.i === w.widgetId);
    if (!l) return w;
    return { ...w, layout: { ...w.layout, x: l.x, y: l.y, w: l.w, h: l.h } };
  });
}

export default function ConsoleDashboardPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const dashboard = useSelector((s: RootState) => s.console.activeDashboard);
  const loading   = useSelector((s: RootState) => s.console.loading);
  const fetchError = useSelector((s: RootState) => s.console.error);
  const saving    = useSelector((s: RootState) => s.console.saving);
  const isEditMode = useSelector((s: RootState) => s.console.isEditMode);
  const editingWidgetId = useSelector((s: RootState) => s.console.editingWidgetId);

  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [gridContainer, setGridContainer] = useState<HTMLDivElement | null>(null);

  // Socket connection
  useConsoleSocket(dashboard);

  // Load dashboard
  useEffect(() => {
    dispatch(fetchDashboard(id));
    return () => {
      dispatch(clearActiveDashboard());
      dispatch(clearWidgetValues());
      dispatch(setEditMode(false));
    };
  }, [id, dispatch]);

  // Measure container width for grid
  useEffect(() => {
    if (!gridContainer) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(gridContainer);
    setContainerWidth(gridContainer.clientWidth);
    return () => ro.disconnect();
  }, [gridContainer]);

  const handleLayoutChange = (layout: readonly LayoutItem[]) => {
    if (!dashboard || !isEditMode) return;
    const updated = applyLayoutToWidgets(dashboard.widgets, layout);
    dispatch(updateWidgetLayout(updated));
  };

  const handleDone = async () => {
    if (!dashboard) return;
    await dispatch(saveDashboardLayout({ id, widgets: dashboard.widgets }));
    dispatch(setEditMode(false));
  };

  const handleDelete = async () => {
    await dispatch(deleteDashboard(id));
    router.push('/console');
  };

  if (loading && !dashboard) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh] gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…
        </div>
      </MainLayout>
    );
  }

  if (!dashboard) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">{fetchError ?? 'Dashboard not found.'}</p>
          <Button variant="outline" onClick={() => router.push('/console')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Console
          </Button>
          {fetchError && !loading && (
            <Button size="sm" onClick={() => dispatch(fetchDashboard(id))}>
              Retry
            </Button>
          )}
        </div>
      </MainLayout>
    );
  }

  const DeviceIcon = DEVICE_TYPE_ICONS[dashboard.deviceRef.deviceType] ?? LayoutGrid;
  const deviceColor = DEVICE_TYPE_COLORS[dashboard.deviceRef.deviceType] ?? 'text-muted-foreground';
  const layout = widgetsToLayout(dashboard.widgets);

  return (
    <MainLayout>
      <RoleGuard permission="console">
        <div className="flex flex-col min-h-screen">

          {/* ── Toolbar ── */}
          <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/30">
            <div className="container max-w-full px-4 h-14 flex items-center gap-3">

              {/* Back */}
              <button
                onClick={() => router.push('/console')}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              {/* Dashboard identity */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${dashboard.color ?? '#00e5ff'}18`, border: `1px solid ${dashboard.color ?? '#00e5ff'}30` }}
                >
                  <LayoutGrid className="h-3.5 w-3.5" style={{ color: dashboard.color ?? '#00e5ff' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate leading-none">{dashboard.name}</p>
                  {dashboard.description && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">{dashboard.description}</p>
                  )}
                </div>
              </div>

              {/* Device badge */}
              <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border border-border/30 bg-secondary/20 shrink-0 ${deviceColor}`}>
                <DeviceIcon className="h-3 w-3" />
                {dashboard.deviceRef.deviceType.toUpperCase()}
                {dashboard.deviceRef.deviceName && (
                  <span className="text-muted-foreground/60 font-normal ml-0.5">{dashboard.deviceRef.deviceName}</span>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1 hidden sm:block" />

              {/* Edit mode actions */}
              {isEditMode ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddWidget(true)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Widget
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDone}
                    disabled={saving}
                    className="gap-1.5 h-8 text-xs bg-brand-500 hover:bg-brand-600 text-white"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Done
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dispatch(setEditMode(true))}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete dashboard"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Grid ── */}
          <div className="flex-1 p-3 overflow-x-hidden" ref={setGridContainer}>
            {dashboard.widgets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-32 gap-4 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Settings2 className="h-7 w-7 text-brand-400" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">No widgets yet</p>
                  <p className="text-sm text-muted-foreground">
                    {isEditMode ? 'Click "Add Widget" in the toolbar to get started.' : 'Click "Edit" to add widgets to this dashboard.'}
                  </p>
                </div>
                {!isEditMode && (
                  <Button size="sm" variant="outline" onClick={() => dispatch(setEditMode(true))} className="gap-1.5">
                    <Edit2 className="h-3.5 w-3.5" /> Edit Dashboard
                  </Button>
                )}
              </motion.div>
            ) : (
              <GridLayout
                layout={layout}
                width={containerWidth}
                gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: MARGIN }}
                dragConfig={{ enabled: isEditMode, handle: '.drag-handle' }}
                resizeConfig={{ enabled: isEditMode, handles: ['se'] }}
                onLayoutChange={handleLayoutChange}
                className="!overflow-visible"
              >
                {dashboard.widgets.map(widget => (
                  <div key={widget.widgetId}>
                    <WidgetRenderer
                      widget={widget}
                      dashboardId={id}
                      isEditMode={isEditMode}
                    />
                  </div>
                ))}
              </GridLayout>
            )}
          </div>
        </div>

        {/* ── Widget Config Panel ── */}
        <AnimatePresence>
          {editingWidgetId && <WidgetConfigPanel dashboardId={id} />}
        </AnimatePresence>

        {/* ── Add Widget Panel ── */}
        {showAddWidget && (
          <AddWidgetPanel dashboardId={id} onClose={() => setShowAddWidget(false)} />
        )}

        {/* ── Delete Confirm ── */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className="relative bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-1">
                <p className="font-semibold text-base">Delete Dashboard?</p>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete <span className="text-foreground font-medium">{dashboard.name}</span> and all its widgets. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </RoleGuard>
    </MainLayout>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Wifi, Bluetooth, Signal, Plus, Network, RefreshCw,
  ExternalLink, LayoutDashboard, ChevronRight,
} from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { AppDispatch, RootState } from '@/store/store';
import {
  fetchNetworkDevices,
  fetchNetworkDeviceStats,
  deleteNetworkDevice,
  NetworkProtocol,
  NetworkDevice,
} from '@/store/slices/networkDeviceSlice';
import {
  fetchTTNApplications,
  fetchTTNDevices,
  syncTTNDevices,
  setSelectedApplication,
  TTNApplication,
  TTNDevice,
} from '@/store/slices/ttnSlice';
import { fetchManifolds } from '@/store/slices/manifoldSlice';
import { DeviceSection } from '@/components/network-devices/DeviceSection';
import { AddDeviceModal } from '@/components/network-devices/AddDeviceModal';
import { LoRaWANCard, isEffectivelyOnline } from '@/components/network-devices/LoRaWANCard';
import { LoRaWANDevicePanel } from '@/components/network-devices/LoRaWANDevicePanel';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: {
  id: NetworkProtocol;
  label: string;
  icon: React.ReactNode;
  accentText: string;
  accentBg: string;
  accentRing: string;
}[] = [
  { id: 'lorawan', label: 'LoRaWAN', icon: <Radio className="w-4 h-4" />, accentText: 'text-violet-500', accentBg: 'from-violet-500/20 to-fuchsia-500/10', accentRing: 'ring-violet-500/30' },
  { id: 'wifi', label: 'Wi-Fi', icon: <Wifi className="w-4 h-4" />, accentText: 'text-sky-500', accentBg: 'from-sky-500/20 to-cyan-500/10', accentRing: 'ring-sky-500/30' },
  { id: 'bluetooth', label: 'Bluetooth', icon: <Bluetooth className="w-4 h-4" />, accentText: 'text-blue-500', accentBg: 'from-blue-500/20 to-indigo-500/10', accentRing: 'ring-blue-500/30' },
  { id: 'gsm', label: 'GSM', icon: <Signal className="w-4 h-4" />, accentText: 'text-emerald-500', accentBg: 'from-emerald-500/20 to-teal-500/10', accentRing: 'ring-emerald-500/30' },
];

const STAT_META: { key: 'lorawan' | 'wifi' | 'bluetooth' | 'gsm' | 'online'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'lorawan', label: 'LoRaWAN', icon: <Radio className="w-4 h-4" />, color: 'text-purple-500' },
  { key: 'wifi', label: 'Wi-Fi', icon: <Wifi className="w-4 h-4" />, color: 'text-sky-500' },
  { key: 'bluetooth', label: 'Bluetooth', icon: <Bluetooth className="w-4 h-4" />, color: 'text-blue-500' },
  { key: 'gsm', label: 'GSM', icon: <Signal className="w-4 h-4" />, color: 'text-emerald-500' },
  { key: 'online', label: 'Online', icon: <Network className="w-4 h-4" />, color: 'text-emerald-400' },
];

// ─── LoRaWAN Quick Nav Bar ────────────────────────────────────────────────────

function LoRaWANQuickNav({ manifolds }: { manifolds: Array<{ _id: string; name: string; manifoldId: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
        Navigate to:
      </span>
      <Link
        href="/manifolds"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-all"
      >
        <LayoutDashboard className="w-3 h-3" />
        All Manifolds
        <ChevronRight className="w-3 h-3" />
      </Link>
      {manifolds.slice(0, 3).map((m) => (
        <Link
          key={m._id}
          href={`/manifolds/${m._id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/60 hover:text-foreground transition-all"
        >
          {m.name}
          <ChevronRight className="w-3 h-3" />
        </Link>
      ))}
      <Link
        href="/ttn"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all ml-auto"
      >
        <Radio className="w-3 h-3" />
        TTN Management
        <ExternalLink className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── LoRaWAN Section ──────────────────────────────────────────────────────────

function LoRaWANSection({
  applications,
  selectedApplication,
  devices,
  loading,
  syncLoading,
  manifolds,
  onSelectApp,
  onSync,
  onDeviceClick,
}: {
  applications: TTNApplication[];
  selectedApplication: TTNApplication | null;
  devices: TTNDevice[];
  loading: boolean;
  syncLoading: boolean;
  manifolds: Array<{ _id: string; name: string; manifoldId: string }>;
  onSelectApp: (app: TTNApplication) => void;
  onSync: () => void;
  onDeviceClick: (device: TTNDevice) => void;
}) {
  if (applications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="text-5xl mb-4">📡</div>
        <h3 className="text-base font-semibold mb-1">No TTN Applications</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Connect a TTN application first to see your LoRaWAN devices here.
        </p>
        <Link
          href="/ttn"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Radio className="w-4 h-4" />
          Go to TTN Management
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick navigation bar */}
      <LoRaWANQuickNav manifolds={manifolds} />

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1">
          <select
            value={selectedApplication?._id ?? ''}
            onChange={(e) => {
              const app = applications.find((a) => a._id === e.target.value);
              if (app) onSelectApp(app);
            }}
            className="w-full max-w-xs px-3 py-2 text-sm bg-card/80 border border-border/50 rounded-xl focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 outline-none transition-colors appearance-none cursor-pointer dark:[color-scheme:dark]"
          >
            {!selectedApplication && <option value="">Select application…</option>}
            {applications.map((app) => (
              <option key={app._id} value={app._id}>
                {app.name} ({app.applicationId})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {selectedApplication && (
            <button
              onClick={onSync}
              disabled={syncLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
              Sync Devices
            </button>
          )}
        </div>
      </div>

      {/* Online count badge — shown when we have devices */}
      {devices.length > 0 && (() => {
        const onlineCount = devices.filter(d => isEffectivelyOnline(d.lastSeen)).length;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {devices.length} device{devices.length !== 1 ? 's' : ''}
            </span>
            <span className="h-1 w-1 rounded-full bg-border/60" />
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
              onlineCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-muted/20 border-border/40 text-muted-foreground'
            }`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
              {onlineCount} online
            </span>
          </div>
        );
      })()}

      {/* Devices grid */}
      {!selectedApplication ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-sm text-muted-foreground">Select an application above to view its devices.</p>
        </motion.div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-card/50 rounded-2xl border border-border/30 animate-pulse" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-sm font-semibold mb-1">No devices found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            No devices in this application. Sync to pull from TTN.
          </p>
          <button
            onClick={onSync}
            disabled={syncLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        >
          <AnimatePresence>
            {devices.map((device) => (
              <motion.div
                key={device._id}
                variants={{ hidden: { opacity: 0, y: 24, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <LoRaWANCard
                  device={device}
                  applicationId={selectedApplication._id}
                  onClick={() => onDeviceClick(device)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { devices, stats, loading } = useSelector((s: RootState) => s.networkDevices);
  const { applications, selectedApplication, devices: ttnDevices, loading: ttnLoading, syncLoading } = useSelector((s: RootState) => s.ttn);
  const manifoldsState = useSelector((s: RootState) => s.manifolds);
  const manifolds = manifoldsState.manifolds ?? [];

  const [activeTab, setActiveTab] = useState<NetworkProtocol>('lorawan');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProtocol, setModalProtocol] = useState<NetworkProtocol | null>(null);
  const [editDevice, setEditDevice] = useState<NetworkDevice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NetworkDevice | null>(null);
  // LoRaWAN device detail panel
  const [selectedDevice, setSelectedDevice] = useState<TTNDevice | null>(null);

  const loadData = useCallback(() => {
    dispatch(fetchNetworkDeviceStats());
    dispatch(fetchNetworkDevices());
    dispatch(fetchTTNApplications());
    dispatch(fetchManifolds({}));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch TTN devices when LoRaWAN tab is active and app is selected
  useEffect(() => {
    if (activeTab === 'lorawan' && selectedApplication) {
      dispatch(fetchTTNDevices(selectedApplication.applicationId));
    }
  }, [activeTab, selectedApplication, dispatch]);

  // Auto-select first application when available
  useEffect(() => {
    if (applications.length > 0 && !selectedApplication) {
      dispatch(setSelectedApplication(applications[0]));
    }
  }, [applications, selectedApplication, dispatch]);

  const handleAdd = (protocol?: NetworkProtocol) => {
    setEditDevice(null);
    setModalProtocol(protocol ?? null);
    setModalOpen(true);
  };

  const handleEdit = (device: NetworkDevice) => {
    setEditDevice(device);
    setModalProtocol(device.protocol);
    setModalOpen(true);
  };

  const handleDelete = (device: NetworkDevice) => {
    setDeleteConfirm(device);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await dispatch(deleteNetworkDevice(deleteConfirm._id));
    setDeleteConfirm(null);
    dispatch(fetchNetworkDeviceStats());
  };

  // Open inline detail panel instead of navigating away
  const handleDeviceClick = (device: TTNDevice) => {
    setSelectedDevice(device);
  };

  // Navigate to TTN page with device pre-selected (from panel footer button)
  const handleOpenInTTN = () => {
    if (selectedDevice && selectedApplication) {
      router.push(`/ttn?appId=${selectedApplication._id}&deviceId=${selectedDevice._id}`);
    }
  };

  // Displayed stats: override lorawan count with TTN device count
  const displayStats = stats ? { ...stats, lorawan: ttnDevices.length } : null;

  const tabDevices = devices.filter((d) => d.protocol === activeTab);

  // Build manifold links for panel + quick nav
  const manifoldLinks = manifolds.map((m) => ({
    _id: m._id,
    name: m.name,
    manifoldId: m.manifoldId,
  }));

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-6">

          {/* ── Header ────────────────────────────────────────────────── */}
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-cyan-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-cyan-500/10 rounded-xl border border-brand-500/20">
                    <Network className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  Network Devices
                </h1>
              </div>
              <p className="text-muted-foreground ml-[52px]">
                Manage LoRaWAN, Wi-Fi, Bluetooth, and GSM devices
              </p>
            </div>

            <button
              onClick={() => handleAdd()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-brand-500 via-cyan-500 to-brand-600 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/25 transition-all duration-200 whitespace-nowrap group"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              Add Device
            </button>
          </motion.div>

          {/* ── Stats bar ─────────────────────────────────────────────── */}
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-5 gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {STAT_META.map((s) => (
              <div
                key={s.key}
                className="bg-card/70 backdrop-blur-sm rounded-xl border border-border/50 px-4 py-3 flex flex-col items-center gap-1 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/10"
              >
                <div className={s.color}>{s.icon}</div>
                <div className={`text-2xl font-bold tabular-nums ${s.color}`}>
                  {displayStats ? displayStats[s.key] : '—'}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* ── Tab navigation ────────────────────────────────────────── */}
          <motion.div
            className="flex w-full max-w-full gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-card/40 p-1.5 backdrop-blur-md hide-scrollbar sm:w-fit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? `text-foreground shadow-lg ring-1 ${tab.accentRing}`
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.accentBg} shadow-sm`}
                    layoutId="activeTab"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className={`relative z-10 ${activeTab === tab.id ? tab.accentText : ''}`}>
                  {tab.icon}
                </span>
                <span className="relative z-10">{tab.label}</span>
                {displayStats && (
                  <span className={`relative z-10 text-xs px-1.5 py-0.5 rounded-md font-mono ${
                    activeTab === tab.id ? 'bg-background/70 text-foreground/80' : 'text-muted-foreground'
                  }`}>
                    {displayStats[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* ── Tab content ───────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {activeTab === 'lorawan' ? (
                <LoRaWANSection
                  applications={applications}
                  selectedApplication={selectedApplication}
                  devices={ttnDevices}
                  loading={ttnLoading}
                  syncLoading={syncLoading}
                  manifolds={manifoldLinks}
                  onSelectApp={(app) => dispatch(setSelectedApplication(app))}
                  onSync={() => selectedApplication && dispatch(syncTTNDevices({ applicationId: selectedApplication.applicationId }))}
                  onDeviceClick={handleDeviceClick}
                />
              ) : (
                <DeviceSection
                  protocol={activeTab}
                  devices={tabDevices}
                  loading={loading}
                  onAdd={() => handleAdd(activeTab)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── LoRaWAN Device Detail Panel ───────────────────────────────────── */}
      <LoRaWANDevicePanel
        device={selectedDevice}
        applicationId={selectedApplication?._id ?? ''}
        manifolds={manifoldLinks}
        onClose={() => setSelectedDevice(null)}
        onOpenInTTN={handleOpenInTTN}
      />

      {/* ── Add / Edit Device Modal ───────────────────────────────────────── */}
      <AddDeviceModal
        open={modalOpen}
        initialProtocol={modalProtocol}
        device={editDevice}
        onClose={() => { setModalOpen(false); setEditDevice(null); }}
        onSuccess={(device) => {
          setActiveTab(device.protocol);
          dispatch(fetchNetworkDeviceStats());
          dispatch(fetchNetworkDevices());
        }}
      />

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className="bg-card rounded-2xl border border-border/50 shadow-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-2">Delete Device</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="font-semibold text-foreground">{deleteConfirm.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-border/50 hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

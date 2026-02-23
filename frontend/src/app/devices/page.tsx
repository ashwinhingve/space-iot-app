'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Wifi, Bluetooth, Signal, Plus, Network } from 'lucide-react';
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
import { DeviceSection } from '@/components/network-devices/DeviceSection';
import { AddDeviceModal } from '@/components/network-devices/AddDeviceModal';

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { devices, stats, loading } = useSelector((s: RootState) => s.networkDevices);

  const [activeTab, setActiveTab] = useState<NetworkProtocol>('lorawan');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProtocol, setModalProtocol] = useState<NetworkProtocol | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NetworkDevice | null>(null);

  const loadData = useCallback(() => {
    dispatch(fetchNetworkDeviceStats());
    dispatch(fetchNetworkDevices());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = (protocol?: NetworkProtocol) => {
    setModalProtocol(protocol ?? null);
    setModalOpen(true);
  };

  const handleEdit = (device: NetworkDevice) => {
    // Open modal pre-filled — for simplicity treat as re-add; full edit left for future
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

  const tabDevices = devices.filter((d) => d.protocol === activeTab);

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-6">

          {/* ── Header ────────────────────────────────────────────────────── */}
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

          {/* ── Stats bar ─────────────────────────────────────────────────── */}
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
                <div className="text-2xl font-bold tabular-nums">
                  {stats ? stats[s.key] : '—'}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* ── Tab navigation ────────────────────────────────────────────── */}
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
                {stats && (
                  <span className={`relative z-10 text-xs px-1.5 py-0.5 rounded-md font-mono ${
                    activeTab === tab.id ? 'bg-background/70 text-foreground/80' : 'text-muted-foreground'
                  }`}>
                    {stats[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* ── Tab content ───────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <DeviceSection
                protocol={activeTab}
                devices={tabDevices}
                loading={loading}
                onAdd={() => handleAdd(activeTab)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Add Device Modal ──────────────────────────────────────────────── */}
      <AddDeviceModal
        open={modalOpen}
        initialProtocol={modalProtocol}
        onClose={() => setModalOpen(false)}
        onSuccess={(device) => {
          // Switch to the tab matching the newly added device so it's immediately visible
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

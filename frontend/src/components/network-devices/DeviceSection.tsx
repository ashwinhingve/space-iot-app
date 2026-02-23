'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import { NetworkDevice, NetworkProtocol, NetworkDeviceStatus } from '@/store/slices/networkDeviceSlice';
import { LoRaWANCard } from './LoRaWANCard';
import { WiFiCard } from './WiFiCard';
import { BluetoothCard } from './BluetoothCard';
import { GSMCard } from './GSMCard';

const STATUS_OPTIONS: { label: string; value: NetworkDeviceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Error', value: 'error' },
  { label: 'Provisioning', value: 'provisioning' },
];

const PROTOCOL_META: Record<NetworkProtocol, { emptyIcon: string; emptyMsg: string }> = {
  lorawan: { emptyIcon: '📡', emptyMsg: 'No LoRaWAN devices yet. Add one to get started.' },
  wifi: { emptyIcon: '📶', emptyMsg: 'No Wi-Fi devices yet. Add one to get started.' },
  bluetooth: { emptyIcon: '🔵', emptyMsg: 'No Bluetooth devices yet. Add one to get started.' },
  gsm: { emptyIcon: '📱', emptyMsg: 'No GSM devices yet. Add one to get started.' },
};

interface Props {
  protocol: NetworkProtocol;
  devices: NetworkDevice[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (device: NetworkDevice) => void;
  onDelete: (device: NetworkDevice) => void;
}

function renderCard(device: NetworkDevice, onEdit: (d: NetworkDevice) => void, onDelete: (d: NetworkDevice) => void) {
  switch (device.protocol) {
    case 'lorawan': return <LoRaWANCard key={device._id} device={device} onEdit={onEdit} onDelete={onDelete} />;
    case 'wifi': return <WiFiCard key={device._id} device={device} onEdit={onEdit} onDelete={onDelete} />;
    case 'bluetooth': return <BluetoothCard key={device._id} device={device} onEdit={onEdit} onDelete={onDelete} />;
    case 'gsm': return <GSMCard key={device._id} device={device} onEdit={onEdit} onDelete={onDelete} />;
  }
}

export function DeviceSection({ protocol, devices, loading, onAdd, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<NetworkDeviceStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [devices, search, statusFilter]);

  const meta = PROTOCOL_META[protocol];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search devices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card/80 border border-border/50 rounded-xl focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NetworkDeviceStatus | 'all')}
            className="pl-9 pr-8 py-2 text-sm bg-card/80 border border-border/50 rounded-xl focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors appearance-none cursor-pointer text-foreground dark:[color-scheme:dark]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Add button */}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-brand-500 via-cyan-500 to-brand-600 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/20 transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Device
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card/50 rounded-2xl border border-border/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        >
          <AnimatePresence>
            {filtered.map((device) => (
              <motion.div
                key={device._id}
                variants={{ hidden: { opacity: 0, y: 24, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderCard(device, onEdit, onDelete)}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="text-5xl mb-4">{meta.emptyIcon}</div>
          <h3 className="text-base font-semibold mb-1">No devices found</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : meta.emptyMsg}
          </p>
          {!search && statusFilter === 'all' && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Device
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

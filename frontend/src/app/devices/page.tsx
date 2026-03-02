'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Wifi, Bluetooth, Signal, Plus, Network, RefreshCw,
  X, Loader2, AlertCircle,
  Pencil, Trash2, Check, Satellite, Server, MapPin,
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
  fetchTTNGateways,
  syncTTNDevices,
  setSelectedApplication,
  createTTNDevice,
  updateTTNGateway,
  deleteTTNGateway,
  clearError,
  clearSuccess,
  TTNApplication,
  TTNDevice,
  TTNGateway,
} from '@/store/slices/ttnSlice';
import { fetchManifolds } from '@/store/slices/manifoldSlice';
import { DeviceSection } from '@/components/network-devices/DeviceSection';
import { AddDeviceModal } from '@/components/network-devices/AddDeviceModal';
import { LoRaWANCard } from '@/components/network-devices/LoRaWANCard';
import { useSocketTTN } from '@/hooks/useSocketTTN';

// ─── Stats / Tab config ────────────────────────────────────────────────────────

const STAT_META: {
  key: 'lorawan' | 'wifi' | 'bluetooth' | 'gsm';
  label: string;
  icon: React.ReactNode;
  color: string;
  protocol: NetworkProtocol;
  accentBg: string;
  accentRing: string;
}[] = [
  { key: 'lorawan', label: 'LoRaWAN', icon: <Radio className="w-4 h-4" />, color: 'text-violet-500', protocol: 'lorawan', accentBg: 'from-violet-500/20 to-fuchsia-500/10', accentRing: 'ring-violet-500/30' },
  { key: 'wifi', label: 'Wi-Fi', icon: <Wifi className="w-4 h-4" />, color: 'text-sky-500', protocol: 'wifi', accentBg: 'from-sky-500/20 to-cyan-500/10', accentRing: 'ring-sky-500/30' },
  { key: 'bluetooth', label: 'Bluetooth', icon: <Bluetooth className="w-4 h-4" />, color: 'text-blue-500', protocol: 'bluetooth', accentBg: 'from-blue-500/20 to-indigo-500/10', accentRing: 'ring-blue-500/30' },
  { key: 'gsm', label: 'GSM', icon: <Signal className="w-4 h-4" />, color: 'text-emerald-500', protocol: 'gsm', accentBg: 'from-emerald-500/20 to-teal-500/10', accentRing: 'ring-emerald-500/30' },
];

// ─── Create Device Modal ───────────────────────────────────────────────────────

const LORAWAN_VERSIONS = [
  { value: 'MAC_V1_0_2', label: '1.0.2' },
  { value: 'MAC_V1_0_3', label: '1.0.3 (recommended)' },
  { value: 'MAC_V1_0_4', label: '1.0.4' },
  { value: 'MAC_V1_1', label: '1.1' },
];

const PHY_VERSIONS: Record<string, { value: string; label: string }[]> = {
  MAC_V1_0_2: [
    { value: 'PHY_V1_0_2_REV_A', label: '1.0.2-a' },
    { value: 'PHY_V1_0_2_REV_B', label: '1.0.2-b' },
  ],
  MAC_V1_0_3: [
    { value: 'PHY_V1_0_3_REV_A', label: '1.0.3-a (recommended)' },
  ],
  MAC_V1_0_4: [
    { value: 'PHY_V1_0_3_REV_A', label: '1.0.3-a' },
  ],
  MAC_V1_1: [
    { value: 'PHY_V1_1_REV_A', label: '1.1-a' },
    { value: 'PHY_V1_1_REV_B', label: '1.1-b' },
  ],
};

function CreateDeviceModal({
  open,
  applicationId,
  ttnRegion,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  applicationId: string;
  ttnRegion: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: {
    applicationId: string;
    deviceId: string;
    name: string;
    description?: string;
    devEui: string;
    joinEui: string;
    appKey?: string;
    lorawanVersion: string;
    phyVersion: string;
  }) => void;
}) {
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [devEui, setDevEui] = useState('');
  const [joinEui, setJoinEui] = useState('');
  const [appKey, setAppKey] = useState('');
  const [lorawanVersion, setLorawanVersion] = useState('MAC_V1_0_3');
  const [phyVersion, setPhyVersion] = useState('PHY_V1_0_3_REV_A');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDeviceId('');
      setName('');
      setDescription('');
      setDevEui('');
      setJoinEui('');
      setAppKey('');
      setLorawanVersion('MAC_V1_0_3');
      setPhyVersion('PHY_V1_0_3_REV_A');
    }
  }, [open]);

  // Update phyVersion when lorawanVersion changes
  useEffect(() => {
    const versions = PHY_VERSIONS[lorawanVersion];
    if (versions?.length) setPhyVersion(versions[0].value);
  }, [lorawanVersion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      applicationId,
      deviceId: deviceId.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      description: description.trim() || undefined,
      devEui: devEui.trim().replace(/:/g, ''),
      joinEui: joinEui.trim().replace(/:/g, ''),
      appKey: appKey.trim().replace(/:/g, '') || undefined,
      lorawanVersion,
      phyVersion,
    });
  };

  const inputClass = 'w-full px-3 py-2 text-sm bg-background/60 border border-border/50 rounded-xl focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 outline-none transition-colors font-mono placeholder:font-sans placeholder:text-muted-foreground/50';
  const labelClass = 'block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-card border border-border/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
          >
            {/* Header accent */}
            <div className="h-px bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-400" />

            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Radio className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Register LoRaWAN Device</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Creates device on TTN ({ttnRegion}) and registers locally
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Device ID *</label>
                  <input
                    className={inputClass}
                    placeholder="my-sensor-01"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    required
                    pattern="[a-z0-9]([a-z0-9-]{0,36}[a-z0-9])?"
                    title="Lowercase alphanumeric and hyphens"
                  />
                </div>
                <div>
                  <label className={labelClass}>Display Name *</label>
                  <input
                    className={`${inputClass} font-sans`}
                    placeholder="My Sensor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input
                  className={`${inputClass} font-sans`}
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Dev EUI * <span className="normal-case font-normal text-muted-foreground/60">(16 hex)</span></label>
                  <input
                    className={inputClass}
                    placeholder="AABBCCDDEEFF0011"
                    value={devEui}
                    onChange={(e) => setDevEui(e.target.value)}
                    required
                    maxLength={23}
                  />
                </div>
                <div>
                  <label className={labelClass}>Join EUI * <span className="normal-case font-normal text-muted-foreground/60">(16 hex)</span></label>
                  <input
                    className={inputClass}
                    placeholder="0000000000000000"
                    value={joinEui}
                    onChange={(e) => setJoinEui(e.target.value)}
                    required
                    maxLength={23}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>App Key <span className="normal-case font-normal text-muted-foreground/60">(32 hex, optional — for OTAA key provisioning)</span></label>
                <input
                  className={inputClass}
                  placeholder="Leave empty to configure keys in TTN console"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  maxLength={47}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>LoRaWAN Version</label>
                  <select
                    className={`${inputClass} font-sans appearance-none cursor-pointer dark:[color-scheme:dark]`}
                    value={lorawanVersion}
                    onChange={(e) => setLorawanVersion(e.target.value)}
                  >
                    {LORAWAN_VERSIONS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>PHY Version</label>
                  <select
                    className={`${inputClass} font-sans appearance-none cursor-pointer dark:[color-scheme:dark]`}
                    value={phyVersion}
                    onChange={(e) => setPhyVersion(e.target.value)}
                  >
                    {(PHY_VERSIONS[lorawanVersion] || []).map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                Device will be registered on the TTN Identity, Network, and Application servers.
                If App Key is provided, it will also be provisioned on the Join Server.
                Frequency plan is automatically selected based on your TTN region ({ttnRegion}).
              </p>
            </form>

            <div className="px-6 pb-5 flex gap-2.5 border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border/50 hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
                disabled={loading || !deviceId || !name || !devEui || !joinEui}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/25 rounded-xl hover:bg-violet-500/20 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                Register Device
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Gateway helpers ──────────────────────────────────────────────────────────

const GW_ONLINE_MS = 15 * 60 * 1000;
function gwIsOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < GW_ONLINE_MS;
}
function gwFmtDate(ds?: string | null): string {
  if (!ds) return '—';
  return new Date(ds).toLocaleString();
}

// ─── Gateway Card ─────────────────────────────────────────────────────────────

function GatewayCard({
  gateway,
  onRename,
  onDelete,
}: {
  gateway: TTNGateway;
  onRename: (gw: TTNGateway, name: string) => Promise<void>;
  onDelete: (gw: TTNGateway) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(gateway.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await onRename(gateway, editName.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const online = gwIsOnline(gateway.lastSeen);

  return (
    <motion.div
      className="p-5 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-emerald-500/30 transition-all"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
            <Server className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  className="px-2 py-0.5 rounded-lg text-sm bg-background/80 border border-emerald-500/40 w-full font-semibold outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="p-1 text-emerald-500 hover:text-emerald-400 shrink-0 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(gateway.name); }}
                  className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-sm truncate">{gateway.name || gateway.gatewayId}</h4>
                <button
                  onClick={() => { setEditing(true); setEditName(gateway.name); }}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Rename gateway"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
            <p className="text-xs font-mono text-muted-foreground truncate">{gateway.gatewayId}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
            online ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-slate-500'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
          <button
            onClick={() => onDelete(gateway)}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
            title="Remove from local tracking"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Fields ────────────────────────────────────────── */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Connected Time</span>
          <span className="text-xs">
            {online && (gateway.connectedSince || gateway.firstSeen)
              ? gwFmtDate(gateway.connectedSince || gateway.firstSeen)
              : '-'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Update</span>
          <span className="text-xs">{gwFmtDate(gateway.lastSeen)}</span>
        </div>

        {!online && gateway.lastSeen && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-orange-400/80">Disconnected</span>
            <span className="text-xs text-orange-400/80">{gwFmtDate(gateway.lastSeen)}</span>
          </div>
        )}

        {gateway.location && (
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Location
            </span>
            <span className="text-xs">
              {gateway.location.latitude.toFixed(4)}, {gateway.location.longitude.toFixed(4)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Uplinks</span>
          <span className="font-semibold">{gateway.metrics.totalUplinksSeen}</span>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Gateway
        </span>
        <span className="text-[10px] text-muted-foreground/40">
          Remove from local tracking via ✕
        </span>
      </div>
    </motion.div>
  );
}

// ─── Gateway Section ──────────────────────────────────────────────────────────

function GatewaySection({
  gateways,
  loading,
  onRename,
  onDelete,
}: {
  gateways: TTNGateway[];
  loading: boolean;
  onRename: (gw: TTNGateway, name: string) => Promise<void>;
  onDelete: (gw: TTNGateway) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 bg-muted/30 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (gateways.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground text-center">
        <Server className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">No gateways discovered yet.</p>
        <p className="text-xs mt-1 opacity-60">Gateways appear automatically when uplinks are received.</p>
      </div>
    );
  }

  const onlineCount = gateways.filter((g) => gwIsOnline(g.lastSeen)).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {gateways.length} gateway{gateways.length !== 1 ? 's' : ''}
        </span>
        <span className="h-1 w-1 rounded-full bg-border/60" />
        <span className={`text-xs font-medium ${onlineCount > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
          {onlineCount} online
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gateways.map((gw) => (
          <GatewayCard key={gw._id} gateway={gw} onRename={onRename} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ─── LoRaWAN Section ──────────────────────────────────────────────────────────

function LoRaWANSection({
  applications,
  selectedApplication,
  devices,
  gateways,
  loading,
  syncLoading,
  onSelectApp,
  onSync,
  onDeviceClick,
  onCreateDevice,
  onRenameGateway,
  onDeleteGateway,
}: {
  applications: TTNApplication[];
  selectedApplication: TTNApplication | null;
  devices: TTNDevice[];
  gateways: TTNGateway[];
  loading: boolean;
  syncLoading: boolean;
  onSelectApp: (app: TTNApplication) => void;
  onSync: () => void;
  onDeviceClick: (device: TTNDevice) => void;
  onCreateDevice: () => void;
  onRenameGateway: (gw: TTNGateway, name: string) => Promise<void>;
  onDeleteGateway: (gw: TTNGateway) => void;
}) {
  const [loraSubTab, setLoraSubTab] = useState<'devices' | 'gateways'>('devices');

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

  const onlineCount = devices.filter((d) => d.isOnline).length;

  return (
    <div className="space-y-4">
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
            <>
              <button
                onClick={onSync}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                Sync
              </button>
              <button
                onClick={onCreateDevice}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Device
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-tab switcher */}
      {selectedApplication && (
        <div className="flex gap-1 p-1 rounded-xl border border-border/40 bg-muted/20 w-fit">
          {(['devices', 'gateways'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setLoraSubTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                loraSubTab === tab
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/25'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'devices' ? <Radio className="w-3 h-3" /> : <Satellite className="w-3 h-3" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1 text-[10px] font-mono opacity-70">
                {tab === 'devices' ? devices.length : gateways.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Online count badge (devices tab only) */}
      {loraSubTab === 'devices' && devices.length > 0 && (
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
          <span className="text-[10px] text-muted-foreground/50 ml-1">
            · real-time via MQTT
          </span>
        </div>
      )}

      {/* Gateway management sub-tab */}
      {loraSubTab === 'gateways' && selectedApplication && (
        <GatewaySection
          gateways={gateways}
          loading={loading}
          onRename={onRenameGateway}
          onDelete={onDeleteGateway}
        />
      )}

      {/* Devices grid (devices sub-tab only) */}
      {loraSubTab === 'devices' && (
        !selectedApplication ? (
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
              Sync to pull existing devices from TTN, or register a new one.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onSync}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${syncLoading ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
              <button
                onClick={onCreateDevice}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Device
              </button>
            </div>
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
                    gateways={gateways}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { devices, stats, loading } = useSelector((s: RootState) => s.networkDevices);
  const {
    applications, selectedApplication, devices: ttnDevices, gateways: ttnGateways,
    loading: ttnLoading, syncLoading, error: ttnError, success: ttnSuccess,
  } = useSelector((s: RootState) => s.ttn);
  const manifoldsState = useSelector((s: RootState) => s.manifolds);
  const manifolds = manifoldsState.manifolds ?? [];

  const [activeTab, setActiveTab] = useState<NetworkProtocol>('lorawan');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProtocol, setModalProtocol] = useState<NetworkProtocol | null>(null);
  const [editDevice, setEditDevice] = useState<NetworkDevice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NetworkDevice | null>(null);
  // Create LoRaWAN device modal
  const [createDeviceOpen, setCreateDeviceOpen] = useState(false);

  // ── Real-time Socket.io TTN connection ────────────────────────────────────
  useSocketTTN(selectedApplication?.applicationId);

  const loadData = useCallback(() => {
    dispatch(fetchNetworkDeviceStats());
    dispatch(fetchNetworkDevices());
    dispatch(fetchTTNApplications());
    dispatch(fetchManifolds({}));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch TTN devices + gateways when LoRaWAN tab is active and app is selected
  useEffect(() => {
    if (activeTab === 'lorawan' && selectedApplication) {
      dispatch(fetchTTNDevices(selectedApplication.applicationId));
      dispatch(fetchTTNGateways(selectedApplication.applicationId));
    }
  }, [activeTab, selectedApplication, dispatch]);

  // Auto-select first application when available
  useEffect(() => {
    if (applications.length > 0 && !selectedApplication) {
      dispatch(setSelectedApplication(applications[0]));
    }
  }, [applications, selectedApplication, dispatch]);

  // Auto-dismiss success/error messages
  useEffect(() => {
    if (ttnSuccess) {
      const t = setTimeout(() => dispatch(clearSuccess()), 4000);
      return () => clearTimeout(t);
    }
  }, [ttnSuccess, dispatch]);

  useEffect(() => {
    if (ttnError && createDeviceOpen) {
      // Keep error shown while modal is open
    } else if (ttnError) {
      const t = setTimeout(() => dispatch(clearError()), 6000);
      return () => clearTimeout(t);
    }
  }, [ttnError, createDeviceOpen, dispatch]);

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

  // Navigate to the manifold detail page when a LoRaWAN card is clicked
  const handleDeviceClick = (device: TTNDevice) => {
    const firstManifold = manifolds[0];
    if (!firstManifold) return;
    const params = new URLSearchParams();
    if (selectedApplication) params.set('ttnAppId', selectedApplication._id);
    params.set('ttnDeviceId', device._id);
    router.push(`/manifolds/${firstManifold._id}?${params.toString()}`);
  };

  // Create LoRaWAN device
  const handleCreateDevice = async (data: {
    applicationId: string;
    deviceId: string;
    name: string;
    description?: string;
    devEui: string;
    joinEui: string;
    appKey?: string;
    lorawanVersion: string;
    phyVersion: string;
  }) => {
    const result = await dispatch(createTTNDevice(data));
    if (createTTNDevice.fulfilled.match(result)) {
      setCreateDeviceOpen(false);
    }
  };

  // Rename gateway (local label only)
  const handleRenameGateway = async (gw: TTNGateway, name: string) => {
    if (!selectedApplication) return;
    await dispatch(updateTTNGateway({
      applicationId: selectedApplication.applicationId,
      gatewayId: gw.gatewayId,
      name,
    }));
  };

  // Delete gateway from local tracking (confirm inline)
  const [deleteGatewayConfirm, setDeleteGatewayConfirm] = useState<TTNGateway | null>(null);

  const confirmDeleteGateway = async () => {
    if (!deleteGatewayConfirm || !selectedApplication) return;
    await dispatch(deleteTTNGateway({
      applicationId: selectedApplication.applicationId,
      gatewayId: deleteGatewayConfirm.gatewayId,
    }));
    setDeleteGatewayConfirm(null);
  };

  // Displayed stats: override lorawan count with TTN device count
  const displayStats = stats ? { ...stats, lorawan: ttnDevices.length } : null;

  const tabDevices = devices.filter((d) => d.protocol === activeTab);

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-6">

          {/* ── Global toast notifications ─────────────────────────────── */}
          <AnimatePresence>
            {ttnSuccess && (
              <motion.div
                className="fixed top-4 right-4 z-50 max-w-sm px-4 py-3 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl text-sm font-medium shadow-xl"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
              >
                {ttnSuccess}
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* ── Stats bar / Tab navigation (unified) ──────────────────── */}
          <motion.div
            className="grid grid-cols-3 sm:grid-cols-5 gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {STAT_META.map((s) => {
              const isActive = s.protocol !== undefined && s.protocol === activeTab;
              const isClickable = s.protocol !== undefined;
              return (
                <button
                  key={s.key}
                  onClick={isClickable ? () => setActiveTab(s.protocol!) : undefined}
                  className={`relative overflow-hidden bg-card/70 backdrop-blur-sm rounded-xl border px-4 py-3 flex flex-col items-center gap-1 transition-all duration-300 text-left ${
                    isClickable
                      ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'
                      : 'cursor-default'
                  } ${
                    isActive
                      ? `border-transparent shadow-lg ring-1 ${s.accentRing}`
                      : 'border-border/50 hover:border-brand-500/30 hover:shadow-brand-500/10'
                  }`}
                >
                  {isActive && s.accentBg && (
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${s.accentBg}`}
                      layoutId="activeStatTab"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <div className={`relative z-10 ${s.color}`}>{s.icon}</div>
                  <div className={`relative z-10 text-2xl font-bold tabular-nums ${s.color}`}>
                    {displayStats ? displayStats[s.key] : '—'}
                  </div>
                  <div className="relative z-10 text-xs text-muted-foreground">{s.label}</div>
                  {isClickable && isActive && (
                    <div className="relative z-10 mt-0.5 w-4 h-0.5 rounded-full bg-current opacity-60" />
                  )}
                </button>
              );
            })}
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
                  gateways={ttnGateways}
                  loading={ttnLoading}
                  syncLoading={syncLoading}
                  onSelectApp={(app) => dispatch(setSelectedApplication(app))}
                  onSync={() => selectedApplication && dispatch(syncTTNDevices({ applicationId: selectedApplication.applicationId }))}
                  onDeviceClick={handleDeviceClick}
                  onCreateDevice={() => setCreateDeviceOpen(true)}
                  onRenameGateway={handleRenameGateway}
                  onDeleteGateway={(gw) => setDeleteGatewayConfirm(gw)}
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

      {/* ── Create LoRaWAN Device Modal ───────────────────────────────────── */}
      <CreateDeviceModal
        open={createDeviceOpen}
        applicationId={selectedApplication?.applicationId ?? ''}
        ttnRegion={selectedApplication?.ttnRegion ?? 'eu1'}
        loading={ttnLoading}
        error={createDeviceOpen ? (ttnError ?? null) : null}
        onClose={() => { setCreateDeviceOpen(false); dispatch(clearError()); }}
        onSubmit={handleCreateDevice}
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
      {/* ── Gateway Delete Confirmation ───────────────────────────────────── */}
      <AnimatePresence>
        {deleteGatewayConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteGatewayConfirm(null)}
          >
            <motion.div
              className="bg-card rounded-2xl border border-border/50 shadow-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-2">Remove Gateway</h3>
              <p className="text-sm text-muted-foreground mb-1">
                Remove <span className="font-semibold text-foreground">{deleteGatewayConfirm.name}</span> from local tracking?
              </p>
              <p className="text-xs text-muted-foreground/70 mb-6">
                The gateway will still exist on TTN. It will reappear automatically when it next forwards an uplink.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteGatewayConfirm(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-border/50 hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteGateway}
                  className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/25 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

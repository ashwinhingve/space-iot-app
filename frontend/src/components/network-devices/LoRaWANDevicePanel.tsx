'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Radio,
  ArrowUpCircle,
  ArrowDownCircle,
  Signal,
  Clock,
  ExternalLink,
  LayoutDashboard,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Hash,
  Zap,
  LogIn,
  LogOut,
  Trash2,
  AlertTriangle,
  Pencil,
  Check,
} from 'lucide-react';
import { TTNDevice, TTNUplink } from '@/store/slices/ttnSlice';
import { API_ENDPOINTS } from '@/lib/config';
import { formatRelative, MiniTag, KvRow } from './DeviceShared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManifoldLink {
  _id: string;
  name: string;
  manifoldId: string;
}

interface Props {
  device: TTNDevice | null;
  applicationId: string;
  manifolds: ManifoldLink[];
  onClose: () => void;
  onOpenInTTN: () => void;
  onDelete?: (device: TTNDevice) => void;
  onRename?: (device: TTNDevice, name: string, description: string) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 ${color}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest opacity-70">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
    </div>
  );
}

function UplinkRow({ uplink, index }: { uplink: TTNUplink; index: number }) {
  const [open, setOpen] = useState(false);
  const ts = new Date(uplink.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div
      className={`rounded-xl border border-border/40 overflow-hidden transition-all ${open ? 'bg-muted/20' : 'hover:bg-muted/10'}`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
      >
        <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">#{index + 1}</span>
        <ArrowUpCircle className="w-3 h-3 text-violet-400 shrink-0" />
        <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">{ts}</span>
        <div className="flex items-center gap-2 shrink-0">
          {uplink.rssi !== undefined && (
            <span className="text-[10px] font-mono text-violet-300">{uplink.rssi} dBm</span>
          )}
          {uplink.spreadingFactor !== undefined && (
            <span className="text-[10px] font-mono text-fuchsia-300">SF{uplink.spreadingFactor}</span>
          )}
        </div>
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1">
          {uplink.rawPayload && (
            <KvRow label="Payload" value={<code className="text-[10px] font-mono text-violet-300 break-all">{uplink.rawPayload}</code>} />
          )}
          {uplink.snr !== undefined && <KvRow label="SNR" value={`${uplink.snr.toFixed(1)} dB`} mono />}
          {uplink.frequency !== undefined && <KvRow label="Frequency" value={`${(uplink.frequency / 1e6).toFixed(3)} MHz`} mono />}
          {uplink.gatewayId && <KvRow label="Gateway" value={uplink.gatewayId} mono />}
          {uplink.fPort !== undefined && <KvRow label="fPort" value={uplink.fPort} mono />}
          {uplink.fCnt !== undefined && <KvRow label="fCnt" value={uplink.fCnt} mono />}
          {uplink.decodedPayload && Object.keys(uplink.decodedPayload).length > 0 && (
            <div className="mt-1 rounded-lg bg-background/60 px-2 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Decoded</div>
              {Object.entries(uplink.decodedPayload).map(([k, v]) => (
                <KvRow key={k} label={k} value={String(v)} mono />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  deviceName,
  onConfirm,
  onCancel,
  loading,
}: {
  deviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        className="relative bg-card border border-border/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold mb-1">Delete Device</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete <span className="font-semibold text-foreground">{deviceName}</span> from
              TTN and remove all local uplinks and downlink history.
            </p>
          </div>
          <div className="flex gap-2.5 w-full">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border/60 hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Inline Edit Form ─────────────────────────────────────────────────────────

function InlineEditForm({
  initialName,
  initialDescription,
  onSave,
  onCancel,
  loading,
}: {
  initialName: string;
  initialDescription: string;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const inputClass =
    'w-full px-3 py-2 text-sm bg-background/60 border border-border/50 rounded-xl focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 outline-none transition-colors placeholder:text-muted-foreground/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="px-5 py-3 border-b border-border/40 bg-violet-500/5 space-y-2.5"
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 mb-1">
        Edit Device Info
      </div>
      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Display Name *</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Device name"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Description</label>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>
      <p className="text-[10px] text-muted-foreground/60">
        Changes will sync to TTN Identity Server and update local records.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-border/50 hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(name.trim(), description.trim())}
          disabled={loading || !name.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/25 rounded-xl hover:bg-violet-500/20 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save to TTN
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function LoRaWANDevicePanel({ device, applicationId, manifolds, onClose, onOpenInTTN, onDelete, onRename }: Props) {
  const [uplinks, setUplinks] = useState<TTNUplink[]>([]);
  const [uplinkLoading, setUplinkLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);

  // Fetch recent uplinks when device changes
  useEffect(() => {
    if (!device || !applicationId) return;
    setUplinks([]);
    setUplinkLoading(true);
    setShowEditForm(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_ENDPOINTS.TTN_DEVICE_UPLINKS(applicationId, device.deviceId)}?limit=10`, { headers })
      .then((r) => r.ok ? r.json() : { uplinks: [] })
      .then((d) => setUplinks(d.uplinks || []))
      .catch(() => setUplinks([]))
      .finally(() => setUplinkLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?._id, applicationId]);

  const isOpen = !!device;
  const displayName = device ? (device.displayName || device.name) : '';
  const devEuiShort = device?.devEui ? device.devEui.toUpperCase() : '';

  const handleDeleteConfirm = async () => {
    if (!device || !onDelete) return;
    setDeleteLoading(true);
    try {
      await onDelete(device);
      setShowDeleteConfirm(false);
      onClose();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveRename = async (name: string, description: string) => {
    if (!device || !onRename) return;
    setRenameLoading(true);
    try {
      await onRename(device, name, description);
      setShowEditForm(false);
    } finally {
      setRenameLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && device && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card/95 backdrop-blur-xl border-l border-border/50 shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Violet top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-400" />

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="shrink-0 bg-card/95 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 shrink-0">
                    <Radio className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold truncate">{displayName}</h2>
                    <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                      {devEuiShort || device.deviceId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    device.isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
                  }`}>
                    {device.isOnline
                      ? <><Wifi className="w-3 h-3" /> Online</>
                      : <><WifiOff className="w-3 h-3" /> Offline</>
                    }
                  </span>
                  {onRename && (
                    <button
                      onClick={() => setShowEditForm((v) => !v)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        showEditForm
                          ? 'text-violet-400 bg-violet-500/10'
                          : 'text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10'
                      }`}
                      title="Edit device name"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete device"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Inline Edit Form ────────────────────────────────── */}
            <AnimatePresence>
              {showEditForm && (
                <InlineEditForm
                  initialName={displayName}
                  initialDescription={device.description || ''}
                  onSave={handleSaveRename}
                  onCancel={() => setShowEditForm(false)}
                  loading={renameLoading}
                />
              )}
            </AnimatePresence>

            {/* ── Body ───────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <StatChip
                  label="Total Uplinks"
                  value={device.metrics.totalUplinks}
                  icon={<ArrowUpCircle className="w-3 h-3" />}
                  color="bg-violet-500/10 border-violet-500/20 text-violet-400"
                />
                <StatChip
                  label="Total Downlinks"
                  value={device.metrics.totalDownlinks}
                  icon={<ArrowDownCircle className="w-3 h-3" />}
                  color="bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400"
                />
                <StatChip
                  label="Avg RSSI"
                  value={device.metrics.avgRssi !== undefined ? `${device.metrics.avgRssi.toFixed(0)} dBm` : '—'}
                  icon={<Signal className="w-3 h-3" />}
                  color="bg-purple-500/10 border-purple-500/20 text-purple-400"
                />
                <StatChip
                  label="Avg SNR"
                  value={device.metrics.avgSnr !== undefined ? `${device.metrics.avgSnr.toFixed(1)} dB` : '—'}
                  icon={<Zap className="w-3 h-3" />}
                  color="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                />
              </div>

              {/* Device Info */}
              <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Device Info</div>
                {device.devEui && <KvRow label="DevEUI" value={device.devEui.toUpperCase()} mono />}
                {device.joinEui && <KvRow label="JoinEUI" value={device.joinEui.toUpperCase()} mono />}
                {device.devAddr && <KvRow label="DevAddr" value={device.devAddr} mono />}
                <KvRow label="Application" value={device.applicationId} />
                {device.description && <KvRow label="Description" value={device.description} />}
                <KvRow
                  label="Last Uplink"
                  value={device.lastSeen ? formatRelative(device.lastSeen) : 'Never'}
                />
                {device.isOnline && device.connectedSince ? (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <LogIn className="w-3 h-3 text-emerald-400" />
                      Connected Since
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400">
                      {formatRelative(device.connectedSince)}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({new Date(device.connectedSince).toLocaleString()})
                      </span>
                    </span>
                  </div>
                ) : device.connectedSince ? (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <LogIn className="w-3 h-3 text-muted-foreground/50" />
                      Last Connected
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatRelative(device.connectedSince)}
                    </span>
                  </div>
                ) : null}
                {!device.isOnline && device.disconnectedAt && (
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <LogOut className="w-3 h-3 text-slate-400" />
                      Went Offline
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatRelative(device.disconnectedAt)}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({new Date(device.disconnectedAt).toLocaleString()})
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Last Uplink Details */}
              {device.lastUplink && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 mb-2.5">
                    Last Uplink
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(device.lastUplink.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {device.lastUplink.rssi !== undefined && (
                      <MiniTag color="bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {device.lastUplink.rssi} dBm
                      </MiniTag>
                    )}
                    {device.lastUplink.snr !== undefined && (
                      <MiniTag color="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                        SNR {device.lastUplink.snr.toFixed(1)}
                      </MiniTag>
                    )}
                    {device.lastUplink.spreadingFactor !== undefined && (
                      <MiniTag color="bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        SF{device.lastUplink.spreadingFactor}
                      </MiniTag>
                    )}
                    {device.lastUplink.frequency !== undefined && (
                      <MiniTag color="bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        {(device.lastUplink.frequency / 1e6).toFixed(1)} MHz
                      </MiniTag>
                    )}
                    {device.lastUplink.fPort !== undefined && (
                      <MiniTag color="bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        fPort {device.lastUplink.fPort}
                      </MiniTag>
                    )}
                  </div>
                  {device.lastUplink.payload && (
                    <div className="rounded-lg bg-background/60 px-2.5 py-1.5">
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Payload (hex)</div>
                      <code className="text-[10px] font-mono text-violet-300 break-all">{device.lastUplink.payload}</code>
                    </div>
                  )}
                  {device.lastUplink.decodedPayload && Object.keys(device.lastUplink.decodedPayload).length > 0 && (
                    <div className="rounded-lg bg-background/60 px-2.5 py-1.5 mt-1.5">
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Decoded</div>
                      {Object.entries(device.lastUplink.decodedPayload).map(([k, v]) => (
                        <KvRow key={k} label={k} value={String(v)} mono />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation — Manifolds */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <LayoutDashboard className="w-3 h-3" />
                  Manifold Navigation
                </div>
                <div className="space-y-2">
                  <a
                    href="/devices"
                    className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-brand-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-brand-500/10">
                        <LayoutDashboard className="w-3.5 h-3.5 text-brand-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">All Devices</div>
                        <div className="text-[10px] text-muted-foreground">View all network devices</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                  </a>

                  {manifolds.length > 0 && (
                    <div className="space-y-1.5">
                      {manifolds.slice(0, 5).map((m) => (
                        <a
                          key={m._id}
                          href={`/manifolds/${m._id}`}
                          className="flex items-center justify-between w-full px-3.5 py-2 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/30 hover:border-brand-500/20 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{m.name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{m.manifoldId}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </a>
                      ))}
                      {manifolds.length > 5 && (
                        <a href="/devices" className="block text-center text-xs text-muted-foreground hover:text-brand-400 py-1 transition-colors">
                          +{manifolds.length - 5} more →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Uplinks */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3 h-3" />
                  Recent Uplinks
                  <span className="ml-auto text-[10px] normal-case font-normal">Last 10</span>
                </div>
                {uplinkLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Loading uplinks…</span>
                  </div>
                ) : uplinks.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <ArrowUpCircle className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No recent uplinks</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {uplinks.map((uplink, i) => (
                      <UplinkRow key={uplink._id} uplink={uplink} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer ─────────────────────────────────────────── */}
            <div className="shrink-0 bg-card/95 backdrop-blur-xl border-t border-border/50 px-5 py-4">
              <div className="flex gap-2.5">
                <button
                  onClick={onOpenInTTN}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl hover:bg-violet-500/20 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in TTN Dashboard
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl border border-border/50 hover:bg-muted transition-colors text-muted-foreground"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>

          {/* Delete Confirm Dialog */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <DeleteConfirmDialog
                deviceName={displayName}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
                loading={deleteLoading}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

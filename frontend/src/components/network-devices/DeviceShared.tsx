'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Trash2, MoreVertical, Clock } from 'lucide-react';
import { NetworkDeviceStatus } from '@/store/slices/networkDeviceSlice';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<NetworkDeviceStatus, { label: string; dot: string; badge: string }> = {
  online: {
    label: 'Online',
    dot: 'bg-emerald-400 animate-pulse shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 ring-1 ring-emerald-500/20',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-slate-500',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/25',
  },
  error: {
    label: 'Error',
    dot: 'bg-red-400 animate-pulse shadow-[0_0_6px_2px_rgba(248,113,113,0.5)]',
    badge: 'bg-red-500/10 text-red-400 border-red-500/25 ring-1 ring-red-500/20',
  },
  provisioning: {
    label: 'Setup…',
    dot: 'bg-amber-400 animate-pulse',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25 ring-1 ring-amber-500/20',
  },
};

export function StatusBadge({ status }: { status: NetworkDeviceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Signal Bar ───────────────────────────────────────────────────────────────

function barColor(v: number) {
  if (v >= 70) return 'from-emerald-500 to-emerald-400';
  if (v >= 40) return 'from-amber-500 to-amber-400';
  return 'from-red-500 to-red-400';
}

export function SignalBar({ value, label = 'Signal' }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono font-semibold">{clamped}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor(clamped)}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Battery Bar ──────────────────────────────────────────────────────────────

export function BatteryBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="7" width="18" height="11" rx="2" />
            <path d="M22 11v3" strokeLinecap="round" />
          </svg>
          Battery
        </span>
        <span className="font-mono font-semibold">{clamped}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor(clamped)}`}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Sensor Pill ──────────────────────────────────────────────────────────────

export function SensorPill({ icon, value, unit, color = 'bg-sky-500/10 text-sky-400 border-sky-500/20' }: {
  icon: React.ReactNode;
  value: number | string | undefined;
  unit?: string;
  color?: string;
}) {
  const display = value !== undefined ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit ?? ''}` : '—';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${color}`}>
      {icon}
      <span>{display}</span>
    </span>
  );
}

// ─── RSSI Bar ─────────────────────────────────────────────────────────────────
// Converts dBm (-30 excellent → -90 bad) to 0-100%
export function RSSIBar({ rssi, label = 'Signal' }: { rssi: number | undefined; label?: string }) {
  if (rssi === undefined) return null;
  // clamp: -30 = 100%, -90 = 0%
  const pct = Math.max(0, Math.min(100, Math.round(((rssi + 90) / 60) * 100)));
  return <SignalBar value={pct} label={label} />;
}

// ─── Format Relative Time ─────────────────────────────────────────────────────

export function formatRelative(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── KvRow ────────────────────────────────────────────────────────────────────

export function KvRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs gap-2 py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`truncate text-right font-medium ${mono ? 'font-mono text-[11px] text-foreground/80' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ─── MiniTag ──────────────────────────────────────────────────────────────────

export function MiniTag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${color}`}>
      {children}
    </span>
  );
}

// ─── Premium Card Shell ───────────────────────────────────────────────────────

interface CardShellProps {
  accentClass: string;         // gradient class for top glow strip e.g. "from-sky-500 to-sky-600"
  glowClass: string;           // glow shadow class e.g. "shadow-sky-500/20"
  iconBgClass: string;         // icon container bg
  icon: React.ReactNode;
  protocolLabel: string;       // e.g. "Wi-Fi"
  name: string;
  subtitle: string;
  status: NetworkDeviceStatus;
  lastSeen?: string;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function CardShell({
  accentClass,
  glowClass,
  iconBgClass,
  icon,
  protocolLabel,
  name,
  subtitle,
  status,
  lastSeen,
  onEdit,
  onDelete,
  children,
}: CardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      className={`group relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-border hover:shadow-xl ${glowClass}`}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      {/* Top accent glow strip */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accentClass} opacity-80`} />
      <div className={`absolute top-0 left-0 right-0 h-8 bg-gradient-to-b ${accentClass} opacity-[0.06]`} />

      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        {/* Left: icon + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative p-2.5 rounded-xl border border-border/50 shrink-0 ${iconBgClass}`}>
            {icon}
            {/* Online pulse ring */}
            {status === 'online' && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-emerald-400/40"
                animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-bold text-sm leading-tight truncate">{name}</h3>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>

        {/* Right: status + menu */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    className="absolute right-0 top-8 z-20 min-w-[120px] overflow-hidden rounded-xl border border-border/60 bg-card/95 py-1 shadow-xl shadow-black/20 backdrop-blur-xl dark:bg-slate-900/95 dark:border-slate-700/70"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70 dark:hover:bg-slate-800/80"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                      Edit
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border/50" />

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {children}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-muted/30 to-transparent border-t border-border/40`}>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatRelative(lastSeen)}</span>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60`}>
          {protocolLabel}
        </span>
      </div>
    </motion.div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Radio, ArrowUpCircle, ArrowDownCircle, Clock,
  ExternalLink, Wifi, Hash,
} from 'lucide-react';
import { TTNDevice } from '@/store/slices/ttnSlice';
import { MiniTag, formatRelative } from './DeviceShared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

export function isEffectivelyOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

interface RSSIQuality {
  bars: number;        // 1-5
  barColor: string;    // tailwind bg class
  textColor: string;   // tailwind text class
  chipColor: string;   // full chip class
  label: string;
  pct: number;         // 0-100 for bar fill
}

function rssiQuality(rssi?: number): RSSIQuality {
  if (rssi === undefined) {
    return { bars: 0, barColor: 'bg-muted/30', textColor: 'text-muted-foreground', chipColor: 'bg-muted/20 border-border/40 text-muted-foreground', label: 'N/A', pct: 0 };
  }
  const pct = Math.max(4, Math.min(100, Math.round(((rssi + 120) / 90) * 100)));
  if (rssi >= -65) return { bars: 5, barColor: 'bg-emerald-400',  textColor: 'text-emerald-400', chipColor: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', label: 'Excellent', pct };
  if (rssi >= -75) return { bars: 4, barColor: 'bg-emerald-400',  textColor: 'text-emerald-400', chipColor: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400', label: 'Good',      pct };
  if (rssi >= -82) return { bars: 3, barColor: 'bg-amber-400',    textColor: 'text-amber-400',   chipColor: 'bg-amber-500/10  border-amber-500/25  text-amber-400',   label: 'Fair',      pct };
  if (rssi >= -90) return { bars: 2, barColor: 'bg-orange-400',   textColor: 'text-orange-400',  chipColor: 'bg-orange-500/10 border-orange-500/25 text-orange-400',  label: 'Weak',      pct };
  return              { bars: 1, barColor: 'bg-red-400',      textColor: 'text-red-400',     chipColor: 'bg-red-500/10    border-red-500/25    text-red-400',     label: 'Poor',      pct };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 5-bar phone-style animated signal indicator */
function SignalBars({ rssi, size = 'md' }: { rssi?: number; size?: 'sm' | 'md' }) {
  const { bars, barColor } = rssiQuality(rssi);
  const h = size === 'sm' ? 12 : 16;
  const w = size === 'sm' ? 2.5 : 3;
  const gap = size === 'sm' ? 2 : 2.5;

  return (
    <div
      className="flex items-end shrink-0"
      style={{ height: h, gap }}
      aria-label={`Signal: ${bars}/5 bars`}
    >
      {[1, 2, 3, 4, 5].map((b) => (
        <motion.div
          key={b}
          className={`rounded-[1px] ${b <= bars ? barColor : 'bg-muted/25'}`}
          style={{ width: w, height: `${20 + b * 16}%` }}
          initial={{ scaleY: 0, originY: '100%' }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.08 + b * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/** Compact metric chip: icon / big number / tiny label */
function MetricChip({
  icon, value, label, colorClass, delay = 0,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  colorClass: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border ${colorClass}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="opacity-70 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</div>
      <div className="text-sm font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[8px] uppercase tracking-wider opacity-50 font-semibold whitespace-nowrap">{label}</div>
    </motion.div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

interface Props {
  device: TTNDevice;
  applicationId: string;
  onClick: () => void;
}

export function LoRaWANCard({ device, onClick }: Props) {
  const online      = isEffectivelyOnline(device.lastSeen);
  const displayName = device.displayName || device.name;
  const devEuiShort = device.devEui ? device.devEui.slice(-8).toUpperCase() : device.deviceId;
  const uplink      = device.lastUplink;
  const q           = rssiQuality(device.metrics.avgRssi);

  // Compact large numbers (1234 → 1.2k)
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border cursor-pointer transition-colors duration-300 ${
        online
          ? 'bg-card/85 backdrop-blur-sm border-border/50 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10'
          : 'bg-card/40 backdrop-blur-sm border-border/25 hover:border-violet-500/20'
      }`}
      style={online ? undefined : { filter: 'saturate(0.45)' }}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: online ? 1 : 0.72, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ─ top gradient strip ─ */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r ${
        online
          ? 'from-violet-400/80 via-purple-500 to-fuchsia-400/80'
          : 'from-slate-500/40 via-slate-400/30 to-slate-500/40'
      }`} />

      {/* ─ top fade wash ─ */}
      <div className={`absolute top-0 inset-x-0 h-14 bg-gradient-to-b ${
        online ? 'from-violet-500/8 to-transparent' : 'from-slate-500/5 to-transparent'
      }`} />

      {/* ─ online corner glow ─ */}
      {online && (
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* ─ online pulse ring around icon ─ */}
      {online && (
        <motion.div
          className="absolute top-[13px] left-[13px] w-10 h-10 rounded-xl border border-emerald-400/35"
          animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* ══════════════════ HEADER ══════════════════ */}
      <div className="flex items-start justify-between p-4 pb-3">
        {/* icon + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative p-2 rounded-xl border shrink-0 ${
            online
              ? 'bg-violet-500/12 border-violet-500/25'
              : 'bg-muted/20 border-border/30'
          }`}>
            <Radio className={`w-4 h-4 ${online ? 'text-violet-400' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">{displayName}</h3>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 font-mono tracking-wide truncate">
              {devEuiShort}
            </p>
          </div>
        </div>

        {/* status badge + external link */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            online
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 ring-1 ring-emerald-500/20'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              online
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_2px_rgba(52,211,153,0.55)]'
                : 'bg-slate-500'
            }`} />
            {online ? 'Online' : 'Offline'}
          </span>
          <div className="p-1 rounded-lg text-muted-foreground/40 group-hover:text-violet-400 transition-colors duration-200">
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* ─ divider ─ */}
      <div className="mx-4 h-px bg-border/35" />

      {/* ══════════════════ BODY ══════════════════ */}
      <div className="px-4 py-3 space-y-3">

        {/* 3-metric chip row */}
        <div className="grid grid-cols-3 gap-2">
          <MetricChip
            icon={<ArrowUpCircle />}
            value={fmt(device.metrics.totalUplinks)}
            label="Uplinks"
            colorClass="bg-violet-500/10 border-violet-500/20 text-violet-400"
            delay={0.05}
          />
          <MetricChip
            icon={<ArrowDownCircle />}
            value={fmt(device.metrics.totalDownlinks)}
            label="Dnlinks"
            colorClass="bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400"
            delay={0.10}
          />
          <MetricChip
            icon={<Wifi />}
            value={device.metrics.avgRssi !== undefined ? `${device.metrics.avgRssi.toFixed(0)}` : '—'}
            label="Avg dBm"
            colorClass={`border ${q.chipColor}`}
            delay={0.15}
          />
        </div>

        {/* Signal quality row */}
        {device.metrics.avgRssi !== undefined && (
          <motion.div
            className="space-y-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SignalBars rssi={device.metrics.avgRssi} />
                <span className={`text-[11px] font-semibold ${q.textColor}`}>{q.label}</span>
              </div>
              {device.metrics.avgSnr !== undefined && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  SNR&nbsp;{device.metrics.avgSnr.toFixed(1)}&nbsp;dB
                </span>
              )}
            </div>
            {/* animated bar */}
            <div className="h-[3px] rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  q.bars >= 4 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : q.bars === 3 ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : q.bars === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                  : 'bg-gradient-to-r from-red-500 to-red-400'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${q.pct}%` }}
                transition={{ delay: 0.25, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>
        )}

        {/* Last uplink section */}
        {uplink && (
          <motion.div
            className="rounded-xl bg-gradient-to-br from-violet-500/6 via-purple-500/4 to-fuchsia-500/6 border border-violet-500/15 px-3 py-2.5 space-y-2"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Last Uplink
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatRelative(uplink.timestamp)}
              </span>
            </div>

            {/* RF tags */}
            <div className="flex flex-wrap gap-1.5">
              {uplink.rssi !== undefined && (
                <MiniTag color="bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {uplink.rssi}&nbsp;dBm
                </MiniTag>
              )}
              {uplink.snr !== undefined && (
                <MiniTag color="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                  SNR&nbsp;{uplink.snr.toFixed(1)}
                </MiniTag>
              )}
              {uplink.spreadingFactor !== undefined && (
                <MiniTag color="bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  SF{uplink.spreadingFactor}
                </MiniTag>
              )}
              {uplink.frequency !== undefined && (
                <MiniTag color="bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  {(uplink.frequency / 1e6).toFixed(2)}&nbsp;MHz
                </MiniTag>
              )}
            </div>

            {/* Decoded payload preview */}
            {uplink.decodedPayload && Object.keys(uplink.decodedPayload).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {Object.entries(uplink.decodedPayload).slice(0, 4).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-muted/25 text-muted-foreground border border-border/30 font-mono"
                  >
                    <span className="opacity-60">{k}:</span>
                    <span className="text-foreground/80 font-semibold">{String(v)}</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* DevEUI strip */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/15 border border-border/25">
          <Hash className="w-3 h-3 text-muted-foreground/50 shrink-0" />
          <span className="text-[10px] text-muted-foreground/50 shrink-0 font-medium">DevEUI</span>
          <span className="text-[10px] font-mono text-foreground/60 truncate tracking-wide">
            {device.devEui?.toUpperCase() ?? '—'}
          </span>
        </div>
      </div>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-muted/20 to-transparent border-t border-border/25">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatRelative(device.lastSeen)}</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          online ? 'text-violet-400/60' : 'text-muted-foreground/40'
        }`}>
          LoRaWAN
        </span>
      </div>
    </motion.div>
  );
}

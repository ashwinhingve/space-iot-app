'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { TTNDevice, TTNGateway } from '@/store/slices/ttnSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * A device is considered online if it sent data within the last 15 minutes.
 * Matches the identical check on the /ttn page.
 */
export function isEffectivelyOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString();
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface Props {
  device: TTNDevice;
  /** Kept for caller compatibility — not used inside the card. */
  applicationId: string;
  onClick: () => void;
  /** Kept for caller compatibility — not used inside the card. */
  gateways?: TTNGateway[];
}

export function LoRaWANCard({ device, onClick }: Props) {
  const online = isEffectivelyOnline(device.lastSeen);
  const displayName = device.displayName || device.name;

  return (
    <motion.div
      className={`p-5 rounded-xl bg-card/50 backdrop-blur-sm border transition-all cursor-pointer ${
        online
          ? 'border-border/50 hover:border-green-500/30'
          : 'border-border/40 hover:border-border/60'
      }`}
      style={online ? undefined : { opacity: 0.75 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{displayName}</h4>
          <p className="text-xs font-mono text-muted-foreground truncate">{device.deviceId}</p>
        </div>
        <span className={`ml-2 px-2 py-1 rounded-full text-xs flex items-center gap-1 shrink-0 ${
          online ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
        }`}>
          {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* ── Fields ─────────────────────────────────────── */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Connected Time</span>
          <span className="text-xs">
            {online && device.connectedSince ? formatDate(device.connectedSince) : '-'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Last Update</span>
          <span className="text-xs">
            {device.lastUplink?.timestamp
              ? formatDate(device.lastUplink.timestamp)
              : device.lastSeen ? formatDate(device.lastSeen) : '—'}
          </span>
        </div>

        {!online && device.lastSeen && (
          <div className="flex justify-between">
            <span className="text-muted-foreground text-orange-400/80">Disconnected</span>
            <span className="text-xs text-orange-400/80">{formatDate(device.lastSeen)}</span>
          </div>
        )}

        {device.lastUplink?.gatewayId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gateway</span>
            <span className="font-mono text-xs truncate max-w-[140px]">
              {device.lastUplink.gatewayId}
            </span>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          LoRaWAN
        </span>
        <span className={`text-xs flex items-center gap-0.5 transition-colors ${
          online ? 'text-green-500/70' : 'text-muted-foreground/40'
        }`}>
          View Details
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

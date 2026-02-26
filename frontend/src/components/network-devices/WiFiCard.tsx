'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Thermometer, Droplets, Cpu, Zap, ZapOff, Copy, Check, Activity } from 'lucide-react';
import { NetworkDevice } from '@/store/slices/networkDeviceSlice';
import { StatusBadge, KvRow, MiniTag, RSSIBar, formatRelative } from './DeviceShared';
import { Edit3, Trash2, MoreVertical, Clock } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { createAuthenticatedSocket } from '@/lib/socket';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ESPLiveData {
  temperature?: number;
  humidity?: number;
  ledState?: number;
  pinsActive?: boolean;
  rssi?: number;
}

interface Props {
  device: NetworkDevice;
  onEdit: (device: NetworkDevice) => void;
  onDelete: (device: NetworkDevice) => void;
}

// ─── ESP32 Hardware Illustration ─────────────────────────────────────────────

const ESP32Illustration = ({ isOnline }: { isOnline: boolean }) => (
  <motion.div
    className="relative flex items-center justify-center"
    animate={{ scale: isOnline ? 1 : 0.95, opacity: isOnline ? 1 : 0.6 }}
    transition={{ duration: 0.4 }}
  >
    <svg viewBox="0 0 160 100" className="w-full h-full max-w-[160px]" aria-hidden>
      <defs>
        <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f7a4d" />
          <stop offset="100%" stopColor="#0a5e3a" />
        </linearGradient>
        <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2d2d3a" />
          <stop offset="100%" stopColor="#1a1a28" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* PCB Board */}
      <rect x="12" y="12" width="136" height="76" rx="5" fill="url(#pcbGrad)" />
      <rect x="13" y="13" width="134" height="74" rx="4" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* Pin headers top */}
      {Array.from({ length: 19 }).map((_, i) => (
        <rect key={`t${i}`} x={16 + i * 6.8} y="7" width="3.5" height="7" rx="0.5" fill="#c0a060" />
      ))}
      {/* Pin headers bottom */}
      {Array.from({ length: 19 }).map((_, i) => (
        <rect key={`b${i}`} x={16 + i * 6.8} y="86" width="3.5" height="7" rx="0.5" fill="#c0a060" />
      ))}

      {/* USB Micro Port */}
      <rect x="4" y="33" width="14" height="24" rx="3" fill="#aaa" />
      <rect x="7" y="37" width="8" height="16" rx="1.5" fill="#555" />

      {/* Main ESP32 chip */}
      <rect x="48" y="24" width="46" height="40" rx="4" fill="url(#chipGrad)" />
      <rect x="50" y="26" width="42" height="36" rx="3" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {/* Chip label */}
      <text x="71" y="42" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="4" fontFamily="monospace">ESP32</text>
      <text x="71" y="48" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="3" fontFamily="monospace">WROOM-32</text>
      {/* Chip pins left */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`cl${i}`} x="44" y={26 + i * 5.5} width="4" height="2" rx="0.5" fill="#c0a060" />
      ))}
      {/* Chip pins right */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`cr${i}`} x="94" y={26 + i * 5.5} width="4" height="2" rx="0.5" fill="#c0a060" />
      ))}

      {/* Antenna module */}
      <rect x="102" y="20" width="32" height="22" rx="3" fill="#1e1e2e" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Antenna lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={107 + i * 5} y1="24" x2={107 + i * 5} y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      ))}

      {/* Status LEDs */}
      <circle cx="104" cy="68" r="3.5" fill={isOnline ? '#22c55e' : '#64748b'} filter={isOnline ? 'url(#glow)' : ''} />
      <circle cx="116" cy="68" r="3.5" fill="#3b82f6" filter="url(#glow)" />
      <circle cx="128" cy="68" r="3.5" fill="#a855f7" opacity="0.6" />

      {/* Capacitors */}
      <rect x="22" y="55" width="10" height="16" rx="2" fill="#2a3a2a" stroke="#4a6a4a" strokeWidth="0.5" />
      <rect x="36" y="58" width="7" height="10" rx="1.5" fill="#1a2a3a" stroke="#2a4a6a" strokeWidth="0.5" />
    </svg>

    {/* Online glow */}
    {isOnline && (
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.12) 0%, transparent 70%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )}
  </motion.div>
);

// ─── Sensor Badge ─────────────────────────────────────────────────────────────

function SensorBadge({ icon, value, unit, label, baseColor }: {
  icon: React.ReactNode;
  value: number | undefined;
  unit: string;
  label: string;
  baseColor: string; // tailwind bg/border/text classes trio
}) {
  return (
    <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border ${baseColor} min-w-[60px]`}>
      <div className="text-[16px] leading-none">{icon}</div>
      <div className="text-sm font-bold tabular-nums leading-tight">
        {value !== undefined ? `${value.toFixed(1)}${unit}` : '—'}
      </div>
      <div className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">{label}</div>
    </div>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WiFiCard({ device, onEdit, onDelete }: Props) {
  const cfg = device.wifi ?? {};
  const mqttId = device.mqttDeviceId ?? '';
  const mqttTopic = mqttId ? `devices/${mqttId}/data` : '';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Live MQTT data via Socket.IO
  const [live, setLive] = useState<ESPLiveData>({});
  const socketRef = useRef<Socket | null>(null);

  const isOnline = device.status === 'online';

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Socket.IO live data subscription
  useEffect(() => {
    if (!mqttId) return;
    const socket = createAuthenticatedSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinNetworkDevice', device._id);
    });

    socket.on('networkDeviceData', (payload: { deviceId: string; data: ESPLiveData }) => {
      setLive((prev) => ({ ...prev, ...payload.data }));
    });

    return () => { socket.disconnect(); };
  }, [device._id, mqttId]);

  return (
    <motion.div
      className="group relative bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-sky-500/25 hover:shadow-xl hover:shadow-sky-500/5"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Sky accent strip */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-400 opacity-90" />
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-sky-500/10 to-transparent" />

      {/* Online pulse ring behind icon */}
      {isOnline && (
        <motion.div
          className="absolute top-3.5 left-3.5 w-8 h-8 rounded-xl border-2 border-emerald-400/50"
          animate={{ scale: [1, 1.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between p-4 pb-3">
        {/* Icon + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 shrink-0">
            <Wifi className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm leading-tight truncate">{device.name}</h3>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {cfg.ssid ?? mqttId ?? 'No identifier'}
            </p>
          </div>
        </div>

        {/* Status + menu */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={device.status} />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    className="absolute right-0 top-8 z-20 min-w-[120px] overflow-hidden rounded-xl border border-border/60 bg-card/95 py-1 shadow-xl shadow-black/20 backdrop-blur-xl dark:bg-slate-900/95 dark:border-slate-700/70"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(device); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70 dark:hover:bg-slate-800/80"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                      Edit
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(device); }}
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

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-border/40" />

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4">

        {/* ESP32 Illustration + sensor badges side by side */}
        <div className="flex items-center gap-3">
          {/* Hardware illustration */}
          <div className="w-[120px] shrink-0">
            <ESP32Illustration isOnline={isOnline} />
          </div>

          {/* Sensor badges column */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex gap-2 flex-wrap">
              <SensorBadge
                icon={<Thermometer className="w-3.5 h-3.5 text-orange-400 inline" />}
                value={live.temperature}
                unit="°C"
                label="Temp"
                baseColor="bg-orange-500/10 border-orange-500/20 text-orange-400"
              />
              <SensorBadge
                icon={<Droplets className="w-3.5 h-3.5 text-sky-400 inline" />}
                value={live.humidity}
                unit="%"
                label="Humid"
                baseColor="bg-sky-500/10 border-sky-500/20 text-sky-400"
              />
            </div>

            {/* LED + Pins status row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* LED State */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                live.ledState === 1
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
              }`}>
                {live.ledState === 1
                  ? <Zap className="w-3 h-3" />
                  : <ZapOff className="w-3 h-3" />
                }
                LED {live.ledState === 1 ? 'ON' : 'OFF'}
              </span>

              {/* GPIO Pins */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                live.pinsActive
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
              }`}>
                <Activity className="w-3 h-3" />
                {live.pinsActive ? '6 GPIO Active' : 'GPIO Idle'}
              </span>
            </div>

            {/* RSSI bar */}
            {(live.rssi !== undefined || device.signalStrength !== undefined) && (
              <div className="pt-0.5">
                {live.rssi !== undefined
                  ? <RSSIBar rssi={live.rssi} label="RSSI" />
                  : <RSSIBar rssi={device.signalStrength !== undefined ? -(100 - device.signalStrength) - 30 : undefined} label="Signal" />
                }
              </div>
            )}
          </div>
        </div>

        {/* Network info */}
        <div className="space-y-1.5 bg-muted/30 rounded-xl px-3 py-2.5">
          {mqttTopic && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0">MQTT Topic</span>
              <div className="flex items-center gap-1 min-w-0">
                <code className="text-[10px] font-mono text-sky-400/90 truncate">{mqttTopic}</code>
                <CopyButton text={mqttTopic} />
              </div>
            </div>
          )}
          {cfg.macAddress && <KvRow label="MAC" value={cfg.macAddress} mono />}
          {cfg.ipAddress && <KvRow label="IP" value={cfg.ipAddress} mono />}
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <MiniTag color="bg-sky-500/10 text-sky-400 border border-sky-500/20">Wi-Fi</MiniTag>
          <MiniTag color="bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {cfg.chipset ?? 'ESP32'}
          </MiniTag>
          {cfg.firmwareVersion && (
            <MiniTag color="bg-slate-500/10 text-slate-400 border border-slate-500/20">
              v{cfg.firmwareVersion}
            </MiniTag>
          )}
          {device.tags.map((t) => (
            <MiniTag key={t} color="bg-muted/60 text-muted-foreground border border-border/40">{t}</MiniTag>
          ))}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-muted/30 to-transparent border-t border-border/40">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatRelative(device.lastSeen)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-sky-400/60" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Wi-Fi</span>
        </div>
      </div>
    </motion.div>
  );
}

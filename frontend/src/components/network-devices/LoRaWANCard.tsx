'use client';

import React from 'react';
import { Radio } from 'lucide-react';
import { NetworkDevice } from '@/store/slices/networkDeviceSlice';
import { CardShell, KvRow, MiniTag, SignalBar } from './DeviceShared';

interface Props {
  device: NetworkDevice;
  onEdit: (device: NetworkDevice) => void;
  onDelete: (device: NetworkDevice) => void;
}

export function LoRaWANCard({ device, onEdit, onDelete }: Props) {
  const cfg = device.lorawan ?? {};
  const subtitle = cfg.devEui ? cfg.devEui : (cfg.appId ?? '—');

  return (
    <CardShell
      accentClass="from-purple-400 via-purple-500 to-violet-500"
      glowClass="hover:shadow-purple-500/10"
      iconBgClass="bg-purple-500/10"
      icon={<Radio className="w-4 h-4 text-purple-400" />}
      protocolLabel="LoRaWAN"
      name={device.name}
      subtitle={subtitle}
      status={device.status}
      lastSeen={device.lastSeen}
      onEdit={() => onEdit(device)}
      onDelete={() => onDelete(device)}
    >
      {cfg.devEui && <KvRow label="DevEUI" value={cfg.devEui} mono />}
      {cfg.appId && <KvRow label="App ID" value={cfg.appId} />}
      <div className="flex items-center gap-1.5 flex-wrap">
        {cfg.activationMode && (
          <MiniTag color={cfg.activationMode === 'OTAA' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'}>
            {cfg.activationMode}
          </MiniTag>
        )}
        {cfg.deviceClass && (
          <MiniTag color="bg-slate-500/15 text-slate-600 dark:text-slate-400">
            Class {cfg.deviceClass}
          </MiniTag>
        )}
      </div>
      {device.description && (
        <p className="text-xs text-muted-foreground line-clamp-1">{device.description}</p>
      )}
      {device.signalStrength !== undefined && (
        <SignalBar value={device.signalStrength} />
      )}
    </CardShell>
  );
}

'use client';

import React from 'react';
import { Signal } from 'lucide-react';
import { NetworkDevice } from '@/store/slices/networkDeviceSlice';
import { CardShell, KvRow, MiniTag, SignalBar } from './DeviceShared';

interface Props {
  device: NetworkDevice;
  onEdit: (device: NetworkDevice) => void;
  onDelete: (device: NetworkDevice) => void;
}

const NETWORK_COLORS: Record<string, string> = {
  '2G':  'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  '3G':  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  '4G':  'bg-emerald-600/10 text-emerald-300 border border-emerald-600/20',
  'LTE': 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
};

export function GSMCard({ device, onEdit, onDelete }: Props) {
  const cfg = device.gsm ?? {};
  const subtitle = cfg.imei
    ? cfg.imei
    : device.mqttDeviceId
      ? `MQTT: ${device.mqttDeviceId}`
      : 'No identifier';
  const hasGps = cfg.location?.lat !== undefined && cfg.location?.lng !== undefined;

  return (
    <CardShell
      accentClass="from-emerald-400 via-emerald-500 to-teal-500"
      glowClass="hover:shadow-emerald-500/10"
      iconBgClass="bg-emerald-500/10"
      icon={<Signal className="w-4 h-4 text-emerald-400" />}
      protocolLabel="GSM"
      name={device.name}
      subtitle={subtitle}
      status={device.status}
      lastSeen={device.lastSeen}
      onEdit={() => onEdit(device)}
      onDelete={() => onDelete(device)}
    >
      {device.mqttDeviceId && (
        <KvRow label="MQTT Topic" value={`devices/${device.mqttDeviceId}/data`} mono />
      )}
      {cfg.imei && <KvRow label="IMEI" value={cfg.imei} mono />}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <MiniTag color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">GSM</MiniTag>
        {cfg.networkType && (
          <MiniTag color={NETWORK_COLORS[cfg.networkType] ?? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}>
            {cfg.networkType}
          </MiniTag>
        )}
      </div>
      {hasGps && (
        <KvRow
          label="GPS"
          value={`${cfg.location!.lat.toFixed(4)}, ${cfg.location!.lng.toFixed(4)}`}
          mono
        />
      )}
      {device.signalStrength !== undefined && (
        <SignalBar value={device.signalStrength} />
      )}
    </CardShell>
  );
}

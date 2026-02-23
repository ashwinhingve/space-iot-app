'use client';

import React from 'react';
import { Bluetooth } from 'lucide-react';
import { NetworkDevice } from '@/store/slices/networkDeviceSlice';
import { CardShell, KvRow, MiniTag, SignalBar, BatteryBar } from './DeviceShared';

interface Props {
  device: NetworkDevice;
  onEdit: (device: NetworkDevice) => void;
  onDelete: (device: NetworkDevice) => void;
}

export function BluetoothCard({ device, onEdit, onDelete }: Props) {
  const cfg = device.bluetooth ?? {};
  const subtitle = cfg.macAddress ?? (cfg.manufacturer ?? '—');

  return (
    <CardShell
      accentClass="from-blue-400 via-blue-500 to-indigo-500"
      glowClass="hover:shadow-blue-500/10"
      iconBgClass="bg-blue-500/10"
      icon={<Bluetooth className="w-4 h-4 text-blue-400" />}
      protocolLabel="Bluetooth"
      name={device.name}
      subtitle={subtitle}
      status={device.status}
      lastSeen={device.lastSeen}
      onEdit={() => onEdit(device)}
      onDelete={() => onDelete(device)}
    >
      {cfg.macAddress && <KvRow label="MAC" value={cfg.macAddress} mono />}
      <div className="flex items-center gap-1.5 flex-wrap">
        {cfg.protocol && (
          <MiniTag color={cfg.protocol === 'BLE' ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'}>
            {cfg.protocol}
          </MiniTag>
        )}
        {cfg.manufacturer && (
          <MiniTag color="bg-blue-500/15 text-blue-600 dark:text-blue-400">
            {cfg.manufacturer}
          </MiniTag>
        )}
      </div>
      {cfg.rssi !== undefined && (
        <KvRow label="RSSI" value={`${cfg.rssi} dBm`} />
      )}
      {cfg.firmwareVersion && (
        <KvRow label="Firmware" value={cfg.firmwareVersion} />
      )}
      {cfg.batteryLevel !== undefined && <BatteryBar value={cfg.batteryLevel} />}
      {device.signalStrength !== undefined && cfg.batteryLevel === undefined && (
        <SignalBar value={device.signalStrength} />
      )}
    </CardShell>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Signal } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { NetworkDevice } from '@/store/slices/networkDeviceSlice';
import { CardShell, KvRow, MiniTag, SignalBar } from './DeviceShared';
import { createAuthenticatedSocket } from '@/lib/socket';

interface Props {
  device: NetworkDevice;
  onEdit: (device: NetworkDevice) => void;
  onDelete: (device: NetworkDevice) => void;
}

interface GSMLiveData {
  signal?: number;
  networkType?: string;
  voltage?: number;
  location?: { lat: number; lng: number };
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

  const [live, setLive] = useState<GSMLiveData>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!device.mqttDeviceId) return;
    const socket = createAuthenticatedSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinNetworkDevice', device._id);
    });

    socket.on('networkDeviceData', (payload: { deviceId: string; data: GSMLiveData }) => {
      setLive((prev) => ({ ...prev, ...payload.data }));
    });

    socket.on('networkDeviceLocation', (payload: { deviceId: string; location: { lat: number; lng: number } }) => {
      setLive((prev) => ({ ...prev, location: payload.location }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [device._id, device.mqttDeviceId]);

  const signalValue = live.signal ?? device.signalStrength;
  const liveLocation = live.location;
  const hasGps = liveLocation
    ? true
    : cfg.location?.lat !== undefined && cfg.location?.lng !== undefined;
  const gpsCoords = liveLocation
    ? `${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)}`
    : hasGps
      ? `${cfg.location!.lat.toFixed(4)}, ${cfg.location!.lng.toFixed(4)}`
      : null;

  const networkType = live.networkType ?? cfg.networkType;

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
        <KvRow label="MQTT Topic" value={`gsm/${device.mqttDeviceId}/data`} mono />
      )}
      {cfg.imei && <KvRow label="IMEI" value={cfg.imei} mono />}
      {live.voltage !== undefined && (
        <KvRow label="Voltage" value={`${live.voltage.toFixed(2)} V`} mono />
      )}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <MiniTag color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">GSM</MiniTag>
        {networkType && (
          <MiniTag color={NETWORK_COLORS[networkType] ?? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}>
            {networkType}
          </MiniTag>
        )}
        {live.signal !== undefined && (
          <MiniTag color="bg-teal-500/10 text-teal-400 border border-teal-500/20">
            Live
          </MiniTag>
        )}
      </div>
      {gpsCoords && (
        <KvRow label="GPS" value={gpsCoords} mono />
      )}
      {signalValue !== undefined && (
        <SignalBar value={signalValue} />
      )}
    </CardShell>
  );
}

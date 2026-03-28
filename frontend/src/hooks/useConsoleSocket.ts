'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { Socket } from 'socket.io-client';
import { AppDispatch } from '@/store/store';
import { createAuthenticatedSocket } from '@/lib/socket';
import { setWidgetValue } from '@/store/slices/consoleSlice';
import type { ConsoleDashboard, ConsoleWidget } from '@/store/slices/consoleSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function applyTransform(raw: unknown, widget: ConsoleWidget): string | number {
  const n = Number(raw);
  if (isNaN(n)) return raw as string;
  const ds = widget.dataSource;
  if (!ds || !ds.transform || ds.transform === 'none') return n;
  const tv = ds.transformValue ?? 1;
  switch (ds.transform) {
    case 'multiply': return n * tv;
    case 'divide':   return tv !== 0 ? n / tv : n;
    case 'round':    return Math.round(n);
    case 'toFixed1': return parseFloat(n.toFixed(1));
    case 'toFixed2': return parseFloat(n.toFixed(2));
    default:         return n;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConsoleSocket(dashboard: ConsoleDashboard | null) {
  const dispatch = useDispatch<AppDispatch>();
  const socketRef = useRef<Socket | null>(null);
  const prevRoomRef = useRef<{ type: string; id: string } | null>(null);
  const widgetsRef = useRef<ConsoleWidget[]>([]);

  // Keep widgetsRef current so the socket handlers always see the latest widget list
  // without needing to re-subscribe the socket when widgets are added/edited.
  useEffect(() => {
    widgetsRef.current = dashboard?.widgets ?? [];
  }, [dashboard?.widgets]);

  useEffect(() => {
    if (!dashboard) return;

    if (!socketRef.current) {
      socketRef.current = createAuthenticatedSocket();
    }
    const socket = socketRef.current;
    const { deviceRef } = dashboard;

    // Leave previous room
    const prev = prevRoomRef.current;
    if (prev) {
      if (prev.type === 'ttn')     socket.emit('leaveTTNApplication', prev.id);
      if (prev.type === 'wifi')    socket.emit('leaveNetworkDevice', prev.id);
      if (prev.type === 'manifold') socket.emit('leaveManifold', prev.id);
    }

    // Join new room
    if (deviceRef.deviceType === 'ttn' && deviceRef.ttnApplicationId) {
      socket.emit('joinTTNApplication', deviceRef.ttnApplicationId);
      prevRoomRef.current = { type: 'ttn', id: deviceRef.ttnApplicationId };
    } else if (deviceRef.deviceType === 'wifi' && deviceRef.deviceId) {
      socket.emit('joinNetworkDevice', deviceRef.deviceId);
      prevRoomRef.current = { type: 'wifi', id: deviceRef.deviceId };
    } else if (deviceRef.deviceType === 'manifold' && deviceRef.manifoldId) {
      socket.emit('joinManifold', deviceRef.manifoldId);
      prevRoomRef.current = { type: 'manifold', id: deviceRef.manifoldId };
    } else if (deviceRef.deviceType === 'mqtt') {
      prevRoomRef.current = { type: 'mqtt', id: deviceRef.deviceId ?? '' };
    }

    // Dispatch live value for each widget whose dataSource.path matches the payload.
    // Uses widgetsRef.current so the handler always has the latest widget list
    // without re-subscribing the socket when widgets are added/edited.
    const dispatchForWidgets = (payload: Record<string, unknown>) => {
      for (const widget of widgetsRef.current) {
        if (!widget.dataSource?.path) {
          // Terminal widgets: log the entire payload as the "value"
          if (widget.type === 'terminal') {
            dispatch(setWidgetValue({
              widgetId: widget.widgetId,
              rawValue: payload,
              displayValue: JSON.stringify(payload),
              timestamp: Date.now(),
            }));
          }
          continue;
        }
        const rawValue = getNestedValue(payload, widget.dataSource.path);
        if (rawValue === undefined) continue;
        const displayValue = applyTransform(rawValue, widget);
        dispatch(setWidgetValue({ widgetId: widget.widgetId, rawValue, displayValue, timestamp: Date.now() }));
      }
    };

    // ── Event handlers ──────────────────────────────────────────────────────

    // TTN: { deviceId, applicationId, uplink: { decodedPayload, rssi, snr, ... } }
    const handleTTNUplink = (data: { deviceId: string; uplink: Record<string, unknown> }) => {
      if (deviceRef.ttnDeviceId && data.deviceId !== deviceRef.ttnDeviceId) return;
      const flat: Record<string, unknown> = {
        ...data.uplink,
        ...((data.uplink.decodedPayload as Record<string, unknown>) ?? {}),
        decodedPayload: data.uplink.decodedPayload,
      };
      dispatchForWidgets(flat);
    };

    // Wi-Fi / GSM: { deviceId, data: { temperature, humidity, rssi, ledState, ... } }
    const handleNetworkDeviceData = (data: { deviceId: string; data: Record<string, unknown> }) => {
      dispatchForWidgets(data.data);
    };

    // Manifold telemetry: { deviceId, data: { pt1, pt2, battery, solar, tamper, rssi, snr } }
    const handleDeviceTelemetry = (data: { data: Record<string, unknown> }) => {
      dispatchForWidgets(data.data);
    };

    // Manifold status: { manifoldId, valves: [...] }
    const handleManifoldStatus = (data: { valves: unknown[] }) => {
      dispatchForWidgets({ valves: data.valves });
    };

    // Generic MQTT: { deviceId, data: { temperature, humidity, value, ... } }
    const handleDeviceData = (data: { deviceId: string; data: Record<string, unknown> }) => {
      if (deviceRef.deviceType !== 'mqtt') return;
      if (deviceRef.deviceId && data.deviceId !== deviceRef.deviceId) return;
      dispatchForWidgets(data.data);
    };

    // MQTT device status: { deviceId, status: 'online'|'offline' }
    const handleDeviceStatus = (data: { deviceId: string; status: string }) => {
      if (deviceRef.deviceType !== 'mqtt') return;
      if (deviceRef.deviceId && data.deviceId !== deviceRef.deviceId) return;
      dispatchForWidgets({ status: data.status });
    };

    socket.on('ttnUplink',           handleTTNUplink);
    socket.on('networkDeviceData',   handleNetworkDeviceData);
    socket.on('deviceTelemetry',     handleDeviceTelemetry);
    socket.on('manifoldStatus',      handleManifoldStatus);
    socket.on('deviceData',          handleDeviceData);
    socket.on('deviceStatus',        handleDeviceStatus);

    return () => {
      socket.off('ttnUplink',           handleTTNUplink);
      socket.off('networkDeviceData',   handleNetworkDeviceData);
      socket.off('deviceTelemetry',     handleDeviceTelemetry);
      socket.off('manifoldStatus',      handleManifoldStatus);
      socket.off('deviceData',          handleDeviceData);
      socket.off('deviceStatus',        handleDeviceStatus);
    };
  }, [dashboard?._id, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const s = socketRef.current;
      if (s) {
        const prev = prevRoomRef.current;
        if (prev) {
          if (prev.type === 'ttn')      s.emit('leaveTTNApplication', prev.id);
          if (prev.type === 'wifi')     s.emit('leaveNetworkDevice', prev.id);
          if (prev.type === 'manifold') s.emit('leaveManifold', prev.id);
        }
        s.disconnect();
        socketRef.current = null;
        prevRoomRef.current = null;
      }
    };
  }, []);
}

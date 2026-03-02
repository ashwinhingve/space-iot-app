'use client';

/**
 * useSocketTTN
 *
 * Manages a Socket.io connection to the backend for real-time TTN events.
 * Joins the application-specific room (ttn-{applicationId}) and dispatches
 * Redux actions when events arrive.
 *
 * Usage:
 *   useSocketTTN(selectedApplication?.applicationId);
 */

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Socket } from 'socket.io-client';
import { AppDispatch } from '@/store/store';
import { createAuthenticatedSocket } from '@/lib/socket';
import {
  addUplink,
  updateDownlinkStatus,
  updateGatewayFromUplink,
  deviceOffline,
  deviceJoined,
  TTNUplink,
} from '@/store/slices/ttnSlice';

export function useSocketTTN(applicationId: string | null | undefined): void {
  const dispatch = useDispatch<AppDispatch>();
  const socketRef = useRef<Socket | null>(null);
  const currentAppRef = useRef<string | null>(null);

  useEffect(() => {
    // Create socket singleton (persists across applicationId changes)
    if (!socketRef.current) {
      socketRef.current = createAuthenticatedSocket();
    }
    const socket = socketRef.current;

    // Leave previous app room when applicationId changes
    if (currentAppRef.current && currentAppRef.current !== applicationId) {
      socket.emit('leaveTTNApplication', currentAppRef.current);
    }

    if (!applicationId) {
      currentAppRef.current = null;
      return;
    }

    // Join new application room
    socket.emit('joinTTNApplication', applicationId);
    currentAppRef.current = applicationId;

    // ── Event Handlers ─────────────────────────────────────────────────────

    const handleUplink = (data: {
      deviceId: string;
      applicationId: string;
      uplink: TTNUplink;
      deviceUpdate?: {
        isOnline: boolean;
        lastSeen: string;
        connectedSince: string | null;
      };
      timestamp: string;
    }) => {
      dispatch(addUplink({
        uplink: data.uplink,
        deviceUpdate: data.deviceUpdate,
      }));
    };

    const handleDeviceOnline = (data: {
      deviceId: string;
      applicationId: string;
      connectedSince: string;
      timestamp: string;
    }) => {
      dispatch(deviceJoined({
        deviceId: data.deviceId,
        connectedSince: data.connectedSince,
      }));
    };

    const handleDeviceOffline = (data: {
      deviceId: string;
      applicationId: string;
      timestamp: string;
    }) => {
      dispatch(deviceOffline({
        deviceId: data.deviceId,
        disconnectedAt: data.timestamp,
      }));
    };

    const handleDeviceJoin = (data: {
      deviceId: string;
      applicationId: string;
      devAddr: string;
      connectedSince: string;
      wasOffline: boolean;
      timestamp: string;
    }) => {
      dispatch(deviceJoined({
        deviceId: data.deviceId,
        devAddr: data.devAddr,
        connectedSince: data.connectedSince,
      }));
    };

    const handleDownlinkAck = (data: {
      deviceId: string;
      applicationId: string;
      correlationIds?: string[];
      timestamp: string;
    }) => {
      const corrId = data.correlationIds?.[0];
      if (corrId) {
        dispatch(updateDownlinkStatus({
          correlationId: corrId,
          status: 'ACKNOWLEDGED',
          timestamp: data.timestamp,
        }));
      }
    };

    const handleDownlinkSent = (data: {
      deviceId: string;
      applicationId: string;
      correlationIds?: string[];
      timestamp: string;
    }) => {
      const corrId = data.correlationIds?.[0];
      if (corrId) {
        dispatch(updateDownlinkStatus({
          correlationId: corrId,
          status: 'SENT',
          timestamp: data.timestamp,
        }));
      }
    };

    const handleDownlinkFailed = (data: {
      deviceId: string;
      applicationId: string;
      correlationIds?: string[];
      timestamp: string;
    }) => {
      const corrId = data.correlationIds?.[0];
      if (corrId) {
        dispatch(updateDownlinkStatus({
          correlationId: corrId,
          status: 'FAILED',
          timestamp: data.timestamp,
        }));
      }
    };

    const handleGatewayUpdate = (data: {
      applicationId: string;
      gateways: string[];
      timestamp: string;
    }) => {
      dispatch(updateGatewayFromUplink({ gatewayIds: data.gateways }));
    };

    // ── Register Listeners ─────────────────────────────────────────────────

    socket.on('ttnUplink', handleUplink);
    socket.on('ttnDeviceOnline', handleDeviceOnline);
    socket.on('ttnDeviceOffline', handleDeviceOffline);
    socket.on('ttnDeviceJoin', handleDeviceJoin);
    socket.on('ttnDownlinkAck', handleDownlinkAck);
    socket.on('ttnDownlinkSent', handleDownlinkSent);
    socket.on('ttnDownlinkFailed', handleDownlinkFailed);
    socket.on('ttnGatewayUpdate', handleGatewayUpdate);

    return () => {
      socket.off('ttnUplink', handleUplink);
      socket.off('ttnDeviceOnline', handleDeviceOnline);
      socket.off('ttnDeviceOffline', handleDeviceOffline);
      socket.off('ttnDeviceJoin', handleDeviceJoin);
      socket.off('ttnDownlinkAck', handleDownlinkAck);
      socket.off('ttnDownlinkSent', handleDownlinkSent);
      socket.off('ttnDownlinkFailed', handleDownlinkFailed);
      socket.off('ttnGatewayUpdate', handleGatewayUpdate);
    };
  }, [applicationId, dispatch]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        if (currentAppRef.current) {
          socketRef.current.emit('leaveTTNApplication', currentAppRef.current);
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        currentAppRef.current = null;
      }
    };
  }, []);
}

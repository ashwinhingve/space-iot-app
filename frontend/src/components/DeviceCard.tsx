'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Switch } from '@/components/ui/switch';
import { useDispatch } from 'react-redux';
import { setSelectedDevice, controlDevice, updateDeviceStatus, updateDeviceData } from '@/store/slices/deviceSlice';
// import { motion } from 'framer-motion';
import { 
  BarChart4, 
  ExternalLink, 
  Settings, 
  Signal,
  ToggleLeft, 
  SlidersHorizontal
} from 'lucide-react';
import { AppDispatch } from '@/store/store';
import { io } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';
import { SOCKET_CONFIG } from '@/lib/config';

interface DeviceCardProps {
  device: {
    _id: string;
    name: string;
    type: string;
    status: 'online' | 'offline';
    mqttTopic: string;
    lastData: {
      timestamp: string;
      value: number;
    };
    settings?: {
      temperature?: number;
      humidity?: number;
      value?: number;
    };
  };
}

// Define interface for socket data
interface DeviceData {
  deviceId: string;
  data: {
    temperature?: number;
    humidity?: number;
    value?: number;
    timestamp: string | Date;
  };
}

interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline';
}

export const DeviceCard = ({ device }: DeviceCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Derive the initial state directly from the device settings or lastData
  const getInitialPowerState = () => {
    // Check settings first
    if (device.settings && device.settings.value !== undefined) {
      return device.settings.value > 0;
    }
    // Fall back to lastData if available
    if (device.lastData && device.lastData.value !== undefined) {
      return device.lastData.value > 0;
    }
    // Default to off if no data is available
    return false;
  };
  
  const [isOn, setIsOn] = useState(getInitialPowerState());
  const [localStatus, setLocalStatus] = useState(device.status);
  const [localData, setLocalData] = useState(device.settings || {});
  const formattedLastUpdate = device.lastData?.timestamp 
    ? new Date(device.lastData.timestamp).toLocaleTimeString() 
    : 'Unknown';
  
  // Socket connection ref to avoid recreating it - replace any type with Socket type
  const socketRef = React.useRef<ReturnType<typeof io> | null>(null);
  
  useEffect(() => {
    // We're now setting the initial state in the state initialization
    // so we don't need to do it here again
    
    // Connect to Socket.io for real-time updates
    socketRef.current = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);
    
    const socket = socketRef.current;
    
    socket.on('connect', () => {
      // Immediately request current status when connected
      socket.emit('joinDevice', device._id);
      socket.emit('requestDeviceStatus', device._id);
    });
    
    socket.on('deviceData', (data: DeviceData) => {
      if (data.deviceId === device._id) {
        setLocalData(data.data);
        
        // Update switch state if value is included
        if (data.data.value !== undefined) {
          // Ensure we properly convert the value to a boolean 
          const newState = data.data.value > 0;
          setIsOn(newState);
        }
        
        // Also update status to online since we received data
        setLocalStatus('online');
        // Update Redux store with the new device data and status
        dispatch(updateDeviceData({ deviceId: device._id, data: data.data }));
      }
    });
    
    socket.on('deviceStatus', (data: DeviceStatus) => {
      if (data.deviceId === device._id) {
        setLocalStatus(data.status);
        // Update Redux store with the new device status
        dispatch(updateDeviceStatus({ deviceId: device._id, status: data.status }));
      }
    });
    
    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('reconnect', () => {
      console.log('Socket reconnected');
      // Re-join device room and request status
      socket.emit('joinDevice', device._id);
      socket.emit('requestDeviceStatus', device._id);
    });
    
    return () => {
      socket.disconnect();
    };
  }, [device._id, dispatch]);
  
  // Update when device.lastData.timestamp changes
  useEffect(() => {
    // Function now empty as we're computing the formatted time directly
    // and the lastUpdated state variable has been removed
  }, [device.lastData?.timestamp]);
  
  // Update when device prop changes
  useEffect(() => {
    // Only update if the device settings or lastData have changed
    const newValue = device.settings?.value !== undefined 
      ? device.settings.value 
      : device.lastData?.value;
    
    if (newValue !== undefined) {
      const newState = newValue > 0;
      if (newState !== isOn) {
        setIsOn(newState);
      }
    }

    // Update local status and data from device prop
    setLocalStatus(device.status);
    setLocalData(device.settings || {});
  }, [device, isOn]);
  
  const handleControl = (value: number) => {
    // Update local state before making API call to prevent UI lag
    const newState = value > 0;
    setIsOn(newState);
    // Then dispatch the action
    dispatch(controlDevice({ deviceId: device._id, value }));
  };
  
  const handleSelect = () => {
    dispatch(setSelectedDevice(device));
  };
  
  const deviceIcon = React.useMemo(() => {
    switch (device.type) {
      case 'switch':
        return <ToggleLeft className="h-5 w-5" />;
      case 'slider':
        return <SlidersHorizontal className="h-5 w-5" />;
      case 'sensor':
        return <Signal className="h-5 w-5" />;
      case 'chart':
        return <BarChart4 className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  }, [device.type]);
  
  const renderDeviceContent = () => {
    switch (device.type) {
      case 'switch':
        return (
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Power</span>
              {/* Simplified button logic that more clearly represents the on/off state */}
              {isOn ? (
                <Button
                  variant="default"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => handleControl(0)}
                  disabled={localStatus !== 'online'}
                >
                  Turn Off
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleControl(1)}
                  disabled={localStatus !== 'online'}
                >
                  Turn On
                </Button>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${localStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm capitalize">{localStatus}</span>
              </div>
            </div>
          </div>
        );
      case 'sensor':
        return (
          <div className="mt-4 space-y-4">
            {(localData.temperature !== undefined || device.lastData?.value !== undefined) && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Temperature</span>
                <span className="font-medium">{localData.temperature || device.lastData?.value || 0}°C</span>
              </div>
            )}
            {localData.humidity !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Humidity</span>
                <span className="font-medium">{localData.humidity}%</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${localStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm capitalize">{localStatus}</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              Last value: {device.lastData.value}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${localStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm capitalize">{localStatus}</span>
              </div>
            </div>
          </div>
        );
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
              {deviceIcon}
            </div>
            <div>
              <CardTitle className="text-lg">{device.name}</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="capitalize">{device.type}</span>
              </div>
            </div>
          </div>
          <Badge
            variant={localStatus === 'online' ? 'success' : 'destructive'}
          >
            {localStatus}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-4">
          {renderDeviceContent()}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Update</span>
            <span className="text-sm">
              {formattedLastUpdate}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2 pb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={handleSelect}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}; 
'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { createDevice, fetchDevices, deleteDevice } from '@/store/slices/deviceSlice';
import { RootState } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Smartphone, Settings, PieChart, ToggleLeft, SlidersHorizontal } from 'lucide-react';
import { AppDispatch } from '@/store/store';

type DeviceType = {
  _id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  mqttTopic: string;
  lastData: {
    timestamp: string;
    value: number;
  };
};

const deviceTypeIcons = {
  switch: <ToggleLeft className="h-5 w-5" />,
  slider: <SlidersHorizontal className="h-5 w-5" />,
  sensor: <Settings className="h-5 w-5" />,
  chart: <PieChart className="h-5 w-5" />,
};

export default function DevicesPage() {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'switch',
    mqttTopic: '',
  });
  
  const dispatch = useDispatch<AppDispatch>();
  const { devices = [], loading } = useSelector((state: RootState) => state.devices);

  useEffect(() => {
    dispatch(fetchDevices());
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createDevice(newDevice));
      setShowAddDevice(false);
      setNewDevice({ name: '', type: 'switch', mqttTopic: '' });
    } catch (error) {
      console.error('Failed to create device:', error);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await dispatch(deleteDevice(deviceId));
      } catch (error) {
        console.error('Failed to delete device:', error);
      }
    }
  };

  return (
    <MainLayout showFooter={false}>
      <div className="container py-10">
        <motion.div 
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold">Devices</h1>
            <p className="text-muted-foreground mt-1">
              Manage your IoT devices
            </p>
          </div>
          <Button onClick={() => setShowAddDevice(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        </motion.div>

        {/* Add Device Modal */}
        <AnimatePresence>
          {showAddDevice && (
            <motion.div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddDevice(false)}
            >
              <motion.div 
                className="bg-card p-6 rounded-lg w-full max-w-md shadow-xl"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Add New Device</h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowAddDevice(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Device Name
                      </label>
                      <input
                        type="text"
                        value={newDevice.name}
                        onChange={(e) =>
                          setNewDevice({ ...newDevice, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        placeholder="My ESP32 Device"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Device Type
                      </label>
                      <select
                        value={newDevice.type}
                        onChange={(e) =>
                          setNewDevice({ ...newDevice, type: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="switch">Switch</option>
                        <option value="slider">Slider</option>
                        <option value="sensor">Sensor</option>
                        <option value="chart">Chart</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        MQTT Topic
                      </label>
                      <input
                        type="text"
                        value={newDevice.mqttTopic}
                        onChange={(e) =>
                          setNewDevice({ ...newDevice, mqttTopic: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-md font-mono text-sm bg-background"
                        placeholder="devices/esp32-01"
                        required
                      />
                      <div className="mt-2 p-3 bg-muted/50 rounded text-xs">
                        <p className="font-medium mb-1">Important: MQTT Topic Format</p>
                        <p className="mb-1">Match exactly what&apos;s in your ESP32 code:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>If your ESP32 deviceId is <code>esp32-01</code>, use <code>devices/esp32-01</code></li>
                          <li>Must match the base topic defined in your ESP32 code</li>
                          <li>Do not add <code>/data</code> or <code>/online</code> suffixes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDevice(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Adding...' : 'Add Device'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device: DeviceType) => (
              <motion.div
                key={device._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-card p-6 rounded-lg shadow-sm border"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{device.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {deviceTypeIcons[device.type as keyof typeof deviceTypeIcons]}
                        <span>{device.type}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      device.status === 'online'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {device.status}
                  </span>
                </div>
                
                <div className="mt-6 text-sm">
                  <p className="text-muted-foreground mb-1">MQTT Topic:</p>
                  <p className="font-mono text-xs bg-muted/50 p-2 rounded">{device.mqttTopic}</p>
                </div>
                
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(device._id)}
                  >
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && devices.length === 0 && (
          <motion.div 
            className="text-center py-16 bg-muted/30 rounded-lg border border-dashed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg font-medium mb-2">No devices found</h3>
            <p className="text-muted-foreground mb-6">
              Add your first device to get started
            </p>
            <Button onClick={() => setShowAddDevice(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
} 
'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { createDevice, fetchDevices, deleteDevice } from '@/store/slices/deviceSlice';
import { RootState } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Smartphone } from 'lucide-react';
import { AppDispatch } from '@/store/store';
import { ModernDeviceCard } from '@/components/ModernDeviceCard';

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
  settings?: {
    temperature?: number;
    humidity?: number;
    value?: number;
    fanSpeed?: number;
    dataLogging?: boolean;
    valves?: { v1: boolean; v2: boolean; v3: boolean; v4: boolean };
  };
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
      <div className="devices-page-container">
        {/* Page Header */}
        <motion.div
          className="devices-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="devices-title">My Devices</h1>
          <Button
            onClick={() => setShowAddDevice(true)}
            className="add-device-btn"
          >
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        </motion.div>

        {/* Add Device Modal */}
        <AnimatePresence>
          {showAddDevice && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddDevice(false)}
            >
              <motion.div
                className="add-device-modal"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', duration: 0.5 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Add New Device</h2>
                    <p className="text-sm text-gray-400 mt-1">Connect your IoT device to the platform</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => setShowAddDevice(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">
                        Device Name
                      </label>
                      <input
                        type="text"
                        value={newDevice.name}
                        onChange={(e) =>
                          setNewDevice({ ...newDevice, name: e.target.value })
                        }
                        className="modal-input"
                        placeholder="ESP32-001: Smart Plug"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">
                        Device Type
                      </label>
                      <select
                        value={newDevice.type}
                        onChange={(e) =>
                          setNewDevice({ ...newDevice, type: e.target.value })
                        }
                        className="modal-input"
                      >
                        <option value="switch">Switch</option>
                        <option value="slider">Slider</option>
                        <option value="sensor">Sensor</option>
                        <option value="chart">Chart</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">
                        MQTT Topic
                      </label>
                      <input
                        type="text"
                        value={newDevice.mqttTopic}
                        onChange={(e) =>
                          setNewDevice({ ...newDevice, mqttTopic: e.target.value })
                        }
                        className="modal-input font-mono text-sm"
                        placeholder="devices/esp32-001"
                        required
                      />
                      <div className="mt-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs">
                        <p className="font-semibold mb-2 flex items-center gap-2 text-purple-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          MQTT Topic Format
                        </p>
                        <p className="mb-2 text-gray-400">Match exactly what&apos;s in your ESP32 code:</p>
                        <ul className="list-disc pl-4 space-y-1 text-gray-400">
                          <li>If your ESP32 deviceId is <code className="px-1.5 py-0.5 bg-black/30 rounded text-purple-300">esp32-001</code>, use <code className="px-1.5 py-0.5 bg-black/30 rounded text-purple-300">devices/esp32-001</code></li>
                          <li>Must match the base topic defined in your ESP32 code</li>
                          <li>Do not add <code className="px-1.5 py-0.5 bg-black/30 rounded">/data</code> or <code className="px-1.5 py-0.5 bg-black/30 rounded">/online</code> suffixes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDevice(false)}
                      className="px-6 border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="modal-submit-btn px-6"
                    >
                      {loading ? 'Adding...' : 'Add Device'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          /* Device Cards Grid */
          <div className="devices-grid">
            {devices.map((device: DeviceType, index: number) => (
              <motion.div
                key={device._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <ModernDeviceCard device={device} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && devices.length === 0 && (
          <motion.div
            className="empty-state-modern"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="empty-state-icon">
              <Smartphone className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">No Devices Yet</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Connect your first IoT device to start monitoring and controlling it from anywhere
            </p>
            <Button
              onClick={() => setShowAddDevice(true)}
              className="add-first-device-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Device
            </Button>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}

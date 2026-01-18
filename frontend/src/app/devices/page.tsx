'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import AnimatedBackground from '@/components/AnimatedBackground';
import { createDevice, fetchDevices, deleteDevice } from '@/store/slices/deviceSlice';
import { RootState } from '@/store/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Smartphone, Sparkles, Cpu, Wifi } from 'lucide-react';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
      <div className="relative min-h-screen">
        {/* Animated Background */}
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <motion.div
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <motion.div
                className="flex items-center gap-3 mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative p-2.5 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl border border-brand-500/20">
                    <Cpu className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  My Devices
                </h1>
              </motion.div>
              <motion.p
                className="text-muted-foreground ml-[52px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Manage and monitor your connected IoT devices
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={() => setShowAddDevice(true)}
                className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 group"
              >
                <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                Add Device
                <Sparkles className="h-3.5 w-3.5 ml-2 opacity-70" />
              </Button>
            </motion.div>
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
                  className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                  <div className="relative p-8">
                    {/* Modal Header */}
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-lg border border-brand-500/20">
                            <Wifi className="h-5 w-5 text-brand-500" />
                          </div>
                          <h2 className="text-2xl font-bold">Add New Device</h2>
                        </div>
                        <p className="text-sm text-muted-foreground ml-[44px]">
                          Connect your IoT device to the platform
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive rounded-full"
                        onClick={() => setShowAddDevice(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                      {/* Device Name */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Device Name
                        </label>
                        <div className={`relative group transition-all duration-300 ${focusedField === 'name' ? 'scale-[1.01]' : ''}`}>
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-0 transition-opacity duration-300 ${focusedField === 'name' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                          <input
                            type="text"
                            value={newDevice.name}
                            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                            className="relative w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-300 outline-none"
                            placeholder="ESP32-001: Smart Plug"
                            required
                            onFocus={() => setFocusedField('name')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </div>

                      {/* Device Type */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Device Type
                        </label>
                        <div className={`relative group transition-all duration-300 ${focusedField === 'type' ? 'scale-[1.01]' : ''}`}>
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-0 transition-opacity duration-300 ${focusedField === 'type' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                          <select
                            value={newDevice.type}
                            onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                            className="relative w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-300 outline-none appearance-none cursor-pointer"
                            onFocus={() => setFocusedField('type')}
                            onBlur={() => setFocusedField(null)}
                          >
                            <option value="switch">Switch</option>
                            <option value="slider">Slider</option>
                            <option value="sensor">Sensor</option>
                            <option value="chart">Chart</option>
                          </select>
                        </div>
                      </div>

                      {/* MQTT Topic */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          MQTT Topic
                        </label>
                        <div className={`relative group transition-all duration-300 ${focusedField === 'mqtt' ? 'scale-[1.01]' : ''}`}>
                          <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/20 to-purple-500/20 blur-xl opacity-0 transition-opacity duration-300 ${focusedField === 'mqtt' ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                          <input
                            type="text"
                            value={newDevice.mqttTopic}
                            onChange={(e) => setNewDevice({ ...newDevice, mqttTopic: e.target.value })}
                            className="relative w-full px-4 py-3 border border-border/50 rounded-xl bg-background/50 backdrop-blur-sm focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all duration-300 outline-none font-mono text-sm"
                            placeholder="devices/esp32-001"
                            required
                            onFocus={() => setFocusedField('mqtt')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>

                        {/* MQTT Help */}
                        <div className="mt-3 p-4 bg-brand-500/5 border border-brand-500/10 rounded-xl text-xs">
                          <p className="font-semibold mb-2 flex items-center gap-2 text-brand-600 dark:text-brand-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            MQTT Topic Format
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                            <li>Match exactly what&apos;s in your ESP32 code</li>
                            <li>Example: <code className="px-1.5 py-0.5 bg-background/50 rounded text-brand-500 font-mono">devices/esp32-001</code></li>
                            <li>Do not add <code className="px-1.5 py-0.5 bg-background/50 rounded">/data</code> or <code className="px-1.5 py-0.5 bg-background/50 rounded">/online</code> suffixes</li>
                          </ul>
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddDevice(false)}
                          className="px-6 hover:bg-secondary/80"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="px-6 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 group relative overflow-hidden"
                        >
                          <span className="relative z-10 flex items-center">
                            {loading ? (
                              <>
                                <motion.div
                                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                                Adding...
                              </>
                            ) : (
                              'Add Device'
                            )}
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-brand-600 via-purple-600 to-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="h-12 w-12 rounded-full border-2 border-transparent border-t-brand-500 border-r-purple-500" />
                </motion.div>
              </div>
              <p className="text-muted-foreground text-sm animate-pulse">Loading devices...</p>
            </div>
          ) : (
            /* Device Cards Grid */
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 }
                }
              }}
            >
              {devices.map((device: DeviceType, index: number) => (
                <motion.div
                  key={device._id}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ModernDeviceCard device={device} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty State */}
          {!loading && devices.length === 0 && (
            <motion.div
              className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 mesh-gradient opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 animate-pulse" style={{ animationDuration: '4s' }} />

              <div className="relative z-10 py-20 px-6 text-center">
                <motion.div
                  className="relative w-20 h-20 mx-auto mb-8"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-purple-500 rounded-2xl blur-xl opacity-40" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Smartphone className="h-10 w-10 text-brand-600 dark:text-brand-400" />
                  </div>
                </motion.div>

                <motion.h3
                  className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  No Devices Yet
                </motion.h3>

                <motion.p
                  className="text-muted-foreground mb-8 max-w-md mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Connect your first IoT device to start monitoring and controlling it from anywhere
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={() => setShowAddDevice(true)}
                    className="bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 hover:shadow-glow text-white border-0 group"
                  >
                    <Plus className="h-4 w-4 mr-2 transition-transform group-hover:rotate-90" />
                    Add Your First Device
                    <Sparkles className="h-3.5 w-3.5 ml-2 opacity-70" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

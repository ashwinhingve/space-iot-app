'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, Key, Lock, Check, AlertCircle, Copy, Trash2, Cpu, ChevronRight, Settings, Plus, Signal } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

interface WiFiConfigResponse {
  success: boolean;
  message: string;
  deviceId: string;
  apiKey: string;
  ssid: string;
  instructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
}

interface WiFiConfigItem {
  deviceId: string;
  ssid: string;
  apiKey: string;
  lastFetched: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WiFiConfigPage() {
  const [deviceId, setDeviceId] = useState('');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [responseData, setResponseData] = useState<WiFiConfigResponse | null>(null);
  const [configs, setConfigs] = useState<WiFiConfigItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<WiFiConfigItem | null>(null);

  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  const fetchConfigs = useCallback(async () => {
    try {
      setLoadingConfigs(true);
      const response = await fetch(`${API_BASE_URL}/api/device/wifi/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs || []);
      }
    } catch (err) {
      console.error('Failed to fetch configs:', err);
    } finally {
      setLoadingConfigs(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchConfigs();
  }, [isAuthenticated, router, fetchConfigs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setResponseData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/device/wifi`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, ssid, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setResponseData(data);
        fetchConfigs();
        setTimeout(() => {
          setDeviceId('');
          setSsid('');
          setPassword('');
        }, 500);
      } else {
        setError(data.message || 'Failed to save WiFi configuration');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm(`Delete WiFi configuration for ${deviceId}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/device/wifi/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchConfigs();
        if (selectedConfig?.deviceId === deviceId) {
          setSelectedConfig(null);
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete configuration');
      }
    } catch (err) {
      alert('Failed to delete configuration');
      console.error('Error:', err);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full py-4 px-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="inline-block">
            <span className="font-bold text-xl inline-block bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              IoT Space
            </span>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/30">
              <Wifi className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">ESP32 WiFi Configuration</h1>
              <p className="text-muted-foreground mt-1">
                Configure and manage WiFi credentials for your ESP32 devices
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-500" />
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-sky-500/5 to-transparent" />
                
                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <Settings className="w-5 h-5 text-sky-400" />
                    <h2 className="text-xl font-semibold">Add New Device</h2>
                  </div>

                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                      <label htmlFor="deviceId" className="block text-sm font-medium mb-2">
                        <Cpu className="w-4 h-4 inline mr-1 text-muted-foreground" />
                        Device ID
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                          id="deviceId"
                          type="text"
                          required
                          className="pl-10 w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                          placeholder="esp32-01"
                          value={deviceId}
                          onChange={(e) => setDeviceId(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Unique identifier for your device
                      </p>
                    </div>

                    <div>
                      <label htmlFor="ssid" className="block text-sm font-medium mb-2">
                        <Signal className="w-4 h-4 inline mr-1 text-muted-foreground" />
                        WiFi SSID
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Wifi className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                          id="ssid"
                          type="text"
                          required
                          className="pl-10 w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                          placeholder="Your WiFi Network Name"
                          value={ssid}
                          onChange={(e) => setSsid(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium mb-2">
                        <Lock className="w-4 h-4 inline mr-1 text-muted-foreground" />
                        WiFi Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          className="pl-10 pr-20 w-full px-4 py-3 border border-border/60 rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all"
                          placeholder="Enter WiFi password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span className="text-sm">{error}</span>
                        </motion.div>
                      )}

                      {success && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl"
                        >
                          <Check className="h-4 w-4 shrink-0" />
                          <span className="text-sm">Configuration saved successfully!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 border-0"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Save Configuration
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              </Card>

              {responseData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-5 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20">
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-emerald-400">API Key Generated</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Copy this API key and flash it to your ESP32 device.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={responseData.apiKey}
                      className="flex-1 px-4 py-2.5 border border-border/60 rounded-xl bg-background/50 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(responseData.apiKey)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-6">
              <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-500" />
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-sky-500/5 to-transparent" />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-sky-500/10">
                        <Cpu className="w-5 h-5 text-sky-400" />
                      </div>
                      <h2 className="text-xl font-semibold">Your Devices</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {configs.length} device{configs.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {loadingConfigs ? (
                    <div className="flex items-center justify-center py-12">
                      <svg className="animate-spin h-8 w-8 text-sky-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  ) : configs.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="p-4 rounded-2xl bg-muted/30 mx-auto w-fit mb-4">
                        <Wifi className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No devices configured yet</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Add your first ESP32 device using the form
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {configs.map((config, index) => (
                        <motion.div
                          key={config.deviceId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                            selectedConfig?.deviceId === config.deviceId
                              ? 'bg-sky-500/10 border-sky-500/30'
                              : 'bg-muted/20 border-border/50 hover:bg-muted/40 hover:border-border'
                          }`}
                          onClick={() => setSelectedConfig(config)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/20">
                                <Wifi className="w-5 h-5 text-sky-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm">{config.deviceId}</h4>
                                <p className="text-xs text-muted-foreground">{config.ssid}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {config.lastFetched ? new Date(config.lastFetched).toLocaleDateString() : 'Never fetched'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(config.deviceId);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">API Key:</span>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {config.apiKey.substring(0, 12)}...
                              </code>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(config.apiKey);
                              }}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-500" />
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-sky-500/5 to-transparent" />
                
                <div className="relative">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Setup Instructions
                  </h3>
                  
                  <div className="space-y-4">
                    {responseData?.instructions ? (
                      <ol className="space-y-3">
                        {[
                          responseData.instructions.step1,
                          responseData.instructions.step2,
                          responseData.instructions.step3,
                          responseData.instructions.step4,
                        ].map((step, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-3"
                          >
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
                          </motion.li>
                        ))}
                      </ol>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded-md bg-sky-500/20">
                              <Key className="w-3 h-3 text-sky-400" />
                            </div>
                            <span className="text-sm font-medium">1. Copy API Key</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Copy the generated API key from the form above after saving
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded-md bg-cyan-500/20">
                              <Cpu className="w-3 h-3 text-cyan-400" />
                            </div>
                            <span className="text-sm font-medium">2. Update Firmware</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Add the API key to your ESP32 firmware configuration
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded-md bg-emerald-500/20">
                              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium">3. Flash Device</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Upload the firmware to your ESP32 device
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded-md bg-amber-500/20">
                              <Wifi className="w-3 h-3 text-amber-400" />
                            </div>
                            <span className="text-sm font-medium">4. Auto-Connect</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Device will fetch WiFi credentials automatically on boot
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                      <p className="text-xs text-blue-400/80 flex items-start gap-2">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Your WiFi password is encrypted and stored securely. The ESP32 fetches credentials securely using the API key.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

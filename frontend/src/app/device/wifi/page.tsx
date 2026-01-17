'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Wifi, Key, Lock, Check, AlertCircle, Copy, Trash2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [responseData, setResponseData] = useState<WiFiConfigResponse | null>(null);
  const [configs, setConfigs] = useState<WiFiConfigItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

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
        // Refresh the list
        fetchConfigs();
        // Clear form after a delay
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
      <header className="w-full py-4 px-6 border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="inline-block">
            <span className="font-bold text-xl inline-block bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              IoT Space
            </span>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <Wifi className="h-8 w-8" />
              WiFi Configuration
            </h1>
            <p className="mt-3 text-muted-foreground">
              Configure WiFi credentials for your ESP32 devices
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Form */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Add/Update Device WiFi</h2>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="deviceId" className="block text-sm font-medium mb-1">
                    Device ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="deviceId"
                      type="text"
                      required
                      className="pl-10 w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="esp32-01"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique identifier for your device (e.g., esp32-01)
                  </p>
                </div>

                <div>
                  <label htmlFor="ssid" className="block text-sm font-medium mb-1">
                    WiFi SSID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Wifi className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="ssid"
                      type="text"
                      required
                      className="pl-10 w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="Your WiFi Name"
                      value={ssid}
                      onChange={(e) => setSsid(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    WiFi Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      className="pl-10 w-full px-3 py-2 border rounded-md bg-background"
                      placeholder="WiFi Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md">
                    <Check className="h-5 w-5" />
                    <span className="text-sm">Configuration saved successfully!</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </form>
            </Card>

            {/* Instructions & API Key */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>

              {responseData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                    <p className="font-semibold text-green-600 dark:text-green-400 mb-2">
                      Configuration Saved!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {responseData.message}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      API Key (Copy this!)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={responseData.apiKey}
                        className="flex-1 px-3 py-2 border rounded-md bg-muted font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(responseData.apiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {responseData.instructions && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Next Steps:</h3>
                      <ol className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <span className="font-semibold">1.</span>
                          <span>{responseData.instructions.step1}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold">2.</span>
                          <span>{responseData.instructions.step2}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold">3.</span>
                          <span>{responseData.instructions.step3}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-semibold">4.</span>
                          <span>{responseData.instructions.step4}</span>
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>After saving your configuration:</p>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Copy the generated API key</li>
                    <li>Update your ESP32 firmware with the API key</li>
                    <li>Flash the firmware to your device</li>
                    <li>The device will automatically fetch WiFi credentials</li>
                  </ol>
                  <p className="mt-4 text-xs">
                    Your WiFi password is encrypted and stored securely. The ESP32 will fetch
                    credentials on boot using the API key.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Existing Configurations */}
          <Card className="p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Your Device Configurations</h2>

            {loadingConfigs ? (
              <p className="text-muted-foreground">Loading configurations...</p>
            ) : configs.length === 0 ? (
              <p className="text-muted-foreground">No configurations yet. Add your first device above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 font-medium">Device ID</th>
                      <th className="pb-3 font-medium">WiFi SSID</th>
                      <th className="pb-3 font-medium">API Key</th>
                      <th className="pb-3 font-medium">Last Fetched</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {configs.map((config) => (
                      <tr key={config.deviceId}>
                        <td className="py-3 font-mono text-sm">{config.deviceId}</td>
                        <td className="py-3">{config.ssid}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {config.apiKey.substring(0, 16)}...
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(config.apiKey)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {config.lastFetched
                            ? new Date(config.lastFetched).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(config.deviceId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

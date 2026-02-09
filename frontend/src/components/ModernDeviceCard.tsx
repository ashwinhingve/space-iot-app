'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { controlDevice, updateDeviceStatus, updateDeviceData, saveWiFiConfig, fetchWiFiConfigs, clearWiFiMessages, deleteDevice, updateDevice, deleteWiFiConfig } from '@/store/slices/deviceSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, X, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Copy, Check, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { AppDispatch, RootState } from '@/store/store';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '@/lib/config';

// ============================================
// CONNECTION TOGGLE COMPONENT
// ============================================
interface ConnectionToggleProps {
  isConnected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ConnectionToggle = ({ isConnected, onToggle, disabled }: ConnectionToggleProps) => {
  return (
    <motion.button
      className={`connection-toggle ${isConnected ? 'connected' : 'disconnected'} ${disabled ? 'disabled' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="toggle-thumb"
        animate={{ x: isConnected ? 28 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
};

// ============================================
// VALVE TOGGLE COMPONENT
// ============================================
interface ValveToggleProps {
  label: string;
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ValveToggle = ({ label, isOn, onToggle, disabled }: ValveToggleProps) => {
  return (
    <div className="valve-toggle-container">
      <span className="valve-label">{label}</span>
      <motion.button
        className={`valve-toggle ${isOn ? 'on' : 'off'} ${disabled ? 'disabled' : ''}`}
        onClick={onToggle}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
      >
        <span className="valve-status">{isOn ? 'ON' : 'OFF'}</span>
        <motion.div
          className="valve-thumb"
          animate={{ x: isOn ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
};

// ============================================
// VALVE CONTROL COMPONENT
// ============================================
interface ValveControlProps {
  valves: { v1: boolean; v2: boolean; v3: boolean; v4: boolean } | undefined;
  onChange: (valve: 'v1' | 'v2' | 'v3' | 'v4', value: boolean) => void;
  disabled?: boolean;
}

const ValveControl = ({ valves, onChange, disabled }: ValveControlProps) => {
  // If no valve data, show placeholder
  if (!valves) {
    return (
      <div className="valve-control-grid">
        <div className="valve-placeholder">No valve data available</div>
      </div>
    );
  }

  return (
    <div className="valve-control-grid">
      <ValveToggle
        label="V1"
        isOn={valves.v1}
        onToggle={() => onChange('v1', !valves.v1)}
        disabled={disabled}
      />
      <ValveToggle
        label="V2"
        isOn={valves.v2}
        onToggle={() => onChange('v2', !valves.v2)}
        disabled={disabled}
      />
      <ValveToggle
        label="V3"
        isOn={valves.v3}
        onToggle={() => onChange('v3', !valves.v3)}
        disabled={disabled}
      />
      <ValveToggle
        label="V4"
        isOn={valves.v4}
        onToggle={() => onChange('v4', !valves.v4)}
        disabled={disabled}
      />
    </div>
  );
};

// ============================================
// SENSOR CHART COMPONENT (Real Data)
// ============================================
interface SensorChartProps {
  data: number[];
  hasData: boolean;
}

const SensorChart = ({ data, hasData }: SensorChartProps) => {
  const width = 280;
  const height = 60;
  const padding = 5;

  if (!hasData || data.length === 0) {
    return (
      <div className="sensor-chart empty">
        <span className="no-data-text">No sensor data available</span>
      </div>
    );
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="sensor-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + (i * (height - 2 * padding)) / 3}
            x2={width - padding}
            y2={padding + (i * (height - 2 * padding)) / 3}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />
        ))}

        {/* Data line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke="url(#dataGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// ============================================
// ESP32 DEVICE IMAGE COMPONENT
// ============================================
const ESP32Image = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <motion.div
      className="esp32-image"
      animate={{ scale: isConnected ? 1 : 0.95, opacity: isConnected ? 1 : 0.7 }}
      transition={{ duration: 0.3 }}
    >
      <svg viewBox="0 0 140 90" className="esp32-svg">
        {/* PCB Board */}
        <rect x="10" y="10" width="120" height="70" rx="4" className="pcb-board" />

        {/* Pin headers top */}
        {Array.from({ length: 19 }).map((_, i) => (
          <rect key={`t${i}`} x={14 + i * 6} y="5" width="3" height="8" className="pin-header" />
        ))}

        {/* Pin headers bottom */}
        {Array.from({ length: 19 }).map((_, i) => (
          <rect key={`b${i}`} x={14 + i * 6} y="77" width="3" height="8" className="pin-header" />
        ))}

        {/* USB Port */}
        <rect x="3" y="30" width="14" height="30" rx="2" className="usb-port" />
        <rect x="6" y="35" width="8" height="20" rx="1" className="usb-inner" />

        {/* ESP32 Chip */}
        <rect x="45" y="22" width="40" height="35" rx="3" className="esp-chip" />
        <rect x="52" y="28" width="26" height="23" rx="2" className="esp-chip-inner" />

        {/* Chip pins left */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`cl${i}`} x="42" y={24 + i * 5} width="3" height="2" className="chip-pin" />
        ))}

        {/* Chip pins right */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`cr${i}`} x="85" y={24 + i * 5} width="3" height="2" className="chip-pin" />
        ))}

        {/* Antenna module */}
        <rect x="95" y="18" width="28" height="18" rx="2" className="antenna" />
        <path d="M100 22 L100 32 M105 22 L105 32 M110 22 L110 32 M115 22 L115 32"
              stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* Status LEDs */}
        <circle cx="100" cy="60" r="3" className={isConnected ? "led-green" : "led-red"} />
        <circle cx="112" cy="60" r="3" className="led-blue" />

        {/* Components */}
        <rect x="30" y="55" width="8" height="12" rx="1" className="component" />
        <rect x="75" y="55" width="6" height="8" rx="1" className="component-small" />
      </svg>

      {isConnected && (
        <motion.div
          className="glow-effect"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

// ============================================
// WIFI CONFIG MODAL COMPONENT
// ============================================
interface WiFiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceName: string;
}

const WiFiConfigModal = ({ isOpen, onClose, deviceId, deviceName }: WiFiConfigModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { wifiConfigs, wifiLoading, wifiError, wifiSuccess } = useSelector((state: RootState) => state.devices);

  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Find existing config for this device
  const existingConfig = wifiConfigs.find(c => c.deviceId === deviceId);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchWiFiConfigs());
      // Pre-fill SSID if config exists
      if (existingConfig) {
        setSsid(existingConfig.ssid);
      }
    }
  }, [isOpen, dispatch, existingConfig]);

  useEffect(() => {
    // Clear messages when modal closes
    if (!isOpen) {
      dispatch(clearWiFiMessages());
      setPassword('');
      setShowPassword(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(saveWiFiConfig({ deviceId, ssid, password }));
  };

  const handleCopyApiKey = () => {
    if (existingConfig?.apiKey) {
      navigator.clipboard.writeText(existingConfig.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteConfig = async () => {
    await dispatch(deleteWiFiConfig(deviceId));
    setShowDeleteConfirm(false);
    setSsid('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="wifi-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="wifi-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="wifi-modal-header">
            <div>
              <h2 className="wifi-modal-title">
                <Wifi className="w-5 h-5" />
                WiFi Configuration
              </h2>
              <p className="wifi-modal-subtitle">{deviceName}</p>
            </div>
            <button className="wifi-modal-close" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="wifi-modal-content">
            {/* Status Messages */}
            {wifiError && (
              <div className="wifi-message error">
                <AlertCircle className="w-4 h-4" />
                {wifiError}
              </div>
            )}
            {wifiSuccess && (
              <div className="wifi-message success">
                <CheckCircle className="w-4 h-4" />
                {wifiSuccess}
              </div>
            )}

            {/* Device ID Display */}
            <div className="wifi-field">
              <label className="wifi-label">Device ID</label>
              <div className="wifi-device-id">{deviceId}</div>
            </div>

            {/* SSID Input */}
            <div className="wifi-field">
              <label className="wifi-label">WiFi Network (SSID)</label>
              <input
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="wifi-input"
                placeholder="Enter WiFi network name"
                required
              />
            </div>

            {/* Password Input */}
            <div className="wifi-field">
              <label className="wifi-label">WiFi Password</label>
              <div className="wifi-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="wifi-input"
                  placeholder="Enter WiFi password"
                  required
                />
                <button
                  type="button"
                  className="wifi-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* API Key Display (if exists) */}
            {existingConfig?.apiKey && (
              <div className="wifi-field">
                <label className="wifi-label">API Key (for ESP32)</label>
                <div className="wifi-api-key">
                  <code className="api-key-text">{existingConfig.apiKey}</code>
                  <button type="button" className="copy-btn" onClick={handleCopyApiKey}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="wifi-hint">Use this API key in your ESP32 firmware to fetch WiFi credentials.</p>
              </div>
            )}

            {/* Info Box */}
            <div className="wifi-info-box">
              <p className="wifi-info-title">How it works:</p>
              <ul className="wifi-info-list">
                <li>Save your WiFi credentials securely (password is encrypted)</li>
                <li>Copy the API key to your ESP32 firmware</li>
                <li>ESP32 fetches credentials on boot using the API key</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="wifi-submit-btn"
              disabled={wifiLoading || !ssid || !password}
            >
              {wifiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>

            {/* Delete Config Section */}
            {existingConfig && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete WiFi Configuration
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 text-center">
                      Are you sure you want to delete this WiFi configuration?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 py-2 px-3 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 transition-colors text-sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-2 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1"
                        onClick={handleDeleteConfig}
                        disabled={wifiLoading}
                      >
                        {wifiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// EDIT DEVICE MODAL COMPONENT
// ============================================
interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    _id: string;
    name: string;
    type: string;
    mqttTopic: string;
  };
}

const EditDeviceModal = ({ isOpen, onClose, device }: EditDeviceModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState(device.name);
  const [type, setType] = useState(device.type);
  const [mqttTopic, setMqttTopic] = useState(device.mqttTopic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(device.name);
      setType(device.type);
      setMqttTopic(device.mqttTopic);
      setError(null);
    }
  }, [isOpen, device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await dispatch(updateDevice({ deviceId: device._id, data: { name, type, mqttTopic } })).unwrap();
      onClose();
    } catch {
      setError('Failed to update device');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="wifi-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="wifi-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="wifi-modal-header">
            <div>
              <h2 className="wifi-modal-title">
                <Edit3 className="w-5 h-5" />
                Edit Device
              </h2>
              <p className="wifi-modal-subtitle">Update device settings</p>
            </div>
            <button className="wifi-modal-close" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="wifi-modal-content">
            {error && (
              <div className="wifi-message error">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="wifi-field">
              <label className="wifi-label">Device Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="wifi-input"
                placeholder="Enter device name"
                required
              />
            </div>

            <div className="wifi-field">
              <label className="wifi-label">Device Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="wifi-input"
                required
              >
                <option value="switch">Switch</option>
                <option value="slider">Slider</option>
                <option value="sensor">Sensor</option>
                <option value="chart">Chart</option>
              </select>
            </div>

            <div className="wifi-field">
              <label className="wifi-label">MQTT Topic</label>
              <input
                type="text"
                value={mqttTopic}
                onChange={(e) => setMqttTopic(e.target.value)}
                className="wifi-input"
                placeholder="devices/esp32-001"
                required
              />
              <p className="wifi-hint">Format: devices/your-device-id</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// DELETE CONFIRMATION MODAL COMPONENT
// ============================================
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deviceName: string;
  loading: boolean;
}

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, deviceName, loading }: DeleteConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="wifi-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="wifi-modal"
          style={{ maxWidth: '400px' }}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="wifi-modal-header">
            <div>
              <h2 className="wifi-modal-title" style={{ color: '#ef4444' }}>
                <Trash2 className="w-5 h-5" />
                Delete Device
              </h2>
            </div>
            <button className="wifi-modal-close" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="wifi-modal-content">
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong className="text-white">{deviceName}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// MAIN DEVICE CARD COMPONENT
// ============================================
interface DeviceSettings {
  temperature?: number;
  humidity?: number;
  value?: number;
  fanSpeed?: number;
  dataLogging?: boolean;
  valves?: { v1: boolean; v2: boolean; v3: boolean; v4: boolean };
}

interface ModernDeviceCardProps {
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
    settings?: DeviceSettings;
  };
}

interface DeviceData {
  deviceId: string;
  data: DeviceSettings & { timestamp: string | Date };
}

interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline';
}

export const ModernDeviceCard = ({ device }: ModernDeviceCardProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const [isConnected, setIsConnected] = useState(device.status === 'online');
  const [localStatus, setLocalStatus] = useState(device.status);
  const [valves, setValves] = useState<{ v1: boolean; v2: boolean; v3: boolean; v4: boolean } | undefined>(device.settings?.valves);
  const [sensorHistory, setSensorHistory] = useState<number[]>([]);
  const [showWiFiModal, setShowWiFiModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [temperature, setTemperature] = useState<number | undefined>(device.settings?.temperature);
  const [humidity, setHumidity] = useState<number | undefined>(device.settings?.humidity);
  const [lastValue, setLastValue] = useState<number | undefined>(device.settings?.value ?? device.lastData?.value);

  const socketRef = React.useRef<ReturnType<typeof io> | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    socketRef.current = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);
    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('joinDevice', device._id);
      socket.emit('requestDeviceStatus', device._id);
    });

    socket.on('deviceData', (data: DeviceData) => {
      if (data.deviceId === device._id) {
        // Update local state with real data
        if (data.data.value !== undefined) {
          setLastValue(data.data.value);
          setSensorHistory(prev => {
            const newHistory = [...prev, data.data.value as number];
            // Keep only last 20 data points
            return newHistory.slice(-20);
          });
          const newState = data.data.value > 0;
          setIsConnected(newState);
        }
        if (data.data.temperature !== undefined) {
          setTemperature(data.data.temperature);
        }
        if (data.data.humidity !== undefined) {
          setHumidity(data.data.humidity);
        }
        if (data.data.valves !== undefined) {
          setValves(data.data.valves);
        }
        setLocalStatus('online');
        dispatch(updateDeviceData({ deviceId: device._id, data: data.data }));
      }
    });

    socket.on('deviceStatus', (data: DeviceStatus) => {
      if (data.deviceId === device._id) {
        setLocalStatus(data.status);
        setIsConnected(data.status === 'online');
        dispatch(updateDeviceStatus({ deviceId: device._id, status: data.status }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [device._id, dispatch]);

  useEffect(() => {
    setLocalStatus(device.status);
    setIsConnected(device.status === 'online');
    setValves(device.settings?.valves);
    setTemperature(device.settings?.temperature);
    setHumidity(device.settings?.humidity);
    setLastValue(device.settings?.value ?? device.lastData?.value);
  }, [device]);

  const handleConnectionToggle = useCallback(() => {
    const newValue = isConnected ? 0 : 1;
    setIsConnected(!isConnected);
    dispatch(controlDevice({ deviceId: device._id, value: newValue }));
  }, [isConnected, device._id, dispatch]);

  const handleValveChange = useCallback((valve: 'v1' | 'v2' | 'v3' | 'v4', value: boolean) => {
    setValves(prev => prev ? { ...prev, [valve]: value } : { v1: false, v2: false, v3: false, v4: false, [valve]: value });
  }, []);

  const handleDelete = useCallback(async () => {
    setDeleteLoading(true);
    try {
      await dispatch(deleteDevice(device._id)).unwrap();
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Failed to delete device:', err);
    } finally {
      setDeleteLoading(false);
    }
  }, [device._id, dispatch]);

  // Extract device ID from MQTT topic
  const deviceId = device.mqttTopic.split('/').pop() || device._id.slice(-8);

  // Check if we have any real sensor data
  const hasRealData = sensorHistory.length > 0 || temperature !== undefined || humidity !== undefined || lastValue !== undefined;

  return (
    <>
      <motion.div
        className="modern-device-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Card Header */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">{device.name}</h3>

          {/* Menu Button */}
          <div className="relative" ref={menuRef}>
            <motion.button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setShowMenu(!showMenu)}
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-purple-600/20 hover:text-purple-400 transition-colors"
                    onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Device
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                    onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Device
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main Content */}
        <div className="card-content">
          {/* Top Section - Device Image & Connection Status */}
          <div className="device-header-section">
            <ESP32Image isConnected={isConnected} />

            <div className="connection-section">
              <span className={`status-label ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
              <ConnectionToggle
                isConnected={isConnected}
                onToggle={handleConnectionToggle}
                disabled={localStatus === 'offline'}
              />
            </div>
          </div>

          {/* Controls Grid */}
          <div className="controls-grid">
            {/* Device Name Section */}
            <div className="control-section device-name-section">
              <label className="section-label">Device Name:</label>
              <div className="device-name-input">
                <span className="device-name-text">
                  ESP32-<span className="highlight">{deviceId}</span>
                </span>
              </div>
            </div>

            {/* Valve Control Section - Only show if we have valve data or device is online */}
            <div className="control-section valve-control-section">
              <label className="section-label">Valve Control</label>
              <ValveControl
                valves={valves}
                onChange={handleValveChange}
                disabled={!isConnected}
              />
            </div>
          </div>

          {/* Sensor Data Section - Only show real data */}
          <div className="sensor-data-section">
            <div className="sensor-header">
              <label className="section-label">Sensor Data</label>
              {hasRealData && (
                <div className="sensor-values">
                  {temperature !== undefined && (
                    <span className="sensor-value">
                      <span className="sensor-icon temp">🌡</span>
                      {temperature.toFixed(1)}°C
                    </span>
                  )}
                  {humidity !== undefined && (
                    <span className="sensor-value">
                      <span className="sensor-icon humid">💧</span>
                      {humidity.toFixed(1)}%
                    </span>
                  )}
                  {lastValue !== undefined && temperature === undefined && humidity === undefined && (
                    <span className="sensor-value">
                      <span className="sensor-icon">📊</span>
                      {lastValue}
                    </span>
                  )}
                </div>
              )}
            </div>
            <SensorChart data={sensorHistory} hasData={sensorHistory.length > 0} />
          </div>

          {/* Wi-Fi Config Button */}
          <motion.button
            className="wifi-config-button"
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowWiFiModal(true)}
          >
            <Wifi className="wifi-icon" />
            Wi-Fi Config
          </motion.button>
        </div>
      </motion.div>

      {/* WiFi Configuration Modal */}
      <WiFiConfigModal
        isOpen={showWiFiModal}
        onClose={() => setShowWiFiModal(false)}
        deviceId={deviceId}
        deviceName={device.name}
      />

      {/* Edit Device Modal */}
      <EditDeviceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        device={device}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        deviceName={device.name}
        loading={deleteLoading}
      />
    </>
  );
};

export default ModernDeviceCard;

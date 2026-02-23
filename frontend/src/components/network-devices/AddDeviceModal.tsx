'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio, Wifi, Bluetooth, Signal, ChevronLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { NetworkProtocol, NetworkDevice, createNetworkDevice } from '@/store/slices/networkDeviceSlice';
import { AppDispatch, RootState } from '@/store/store';

// ─── Protocol options ─────────────────────────────────────────────────────────

const PROTOCOLS: {
  id: NetworkProtocol;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}[] = [
  {
    id: 'lorawan',
    label: 'LoRaWAN',
    icon: <Radio className="w-6 h-6" />,
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 hover:border-purple-500/60 text-purple-500',
    description: 'Long-range, low-power wide-area network devices',
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    icon: <Wifi className="w-6 h-6" />,
    color: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 hover:border-sky-500/60 text-sky-500',
    description: 'IEEE 802.11 wireless LAN devices',
  },
  {
    id: 'bluetooth',
    label: 'Bluetooth',
    icon: <Bluetooth className="w-6 h-6" />,
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/60 text-blue-500',
    description: 'BLE and Classic Bluetooth devices',
  },
  {
    id: 'gsm',
    label: 'GSM / Cellular',
    icon: <Signal className="w-6 h-6" />,
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-500',
    description: '2G/3G/4G/LTE cellular connected devices',
  },
];

// ─── Form field helper ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm bg-background/70 border border-border/50 rounded-lg focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 text-sm bg-background/70 border border-border/50 rounded-lg focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors appearance-none cursor-pointer"
    >
      {props.children}
    </select>
  );
}

// ─── Protocol-specific form sections ─────────────────────────────────────────

function LoRaWANForm({ form, setForm }: { form: Record<string, string>; setForm: (f: Record<string, string>) => void }) {
  return (
    <>
      <Field label="DevEUI"><Input placeholder="0004A30B001C0530" value={form.devEui || ''} onChange={(e) => setForm({ ...form, devEui: e.target.value })} /></Field>
      <Field label="App ID"><Input placeholder="my-application" value={form.appId || ''} onChange={(e) => setForm({ ...form, appId: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Activation Mode">
          <Select value={form.activationMode || ''} onChange={(e) => setForm({ ...form, activationMode: e.target.value })}>
            <option value="">Select…</option>
            <option value="OTAA">OTAA</option>
            <option value="ABP">ABP</option>
          </Select>
        </Field>
        <Field label="Device Class">
          <Select value={form.deviceClass || ''} onChange={(e) => setForm({ ...form, deviceClass: e.target.value })}>
            <option value="">Select…</option>
            <option value="A">Class A</option>
            <option value="B">Class B</option>
            <option value="C">Class C</option>
          </Select>
        </Field>
      </div>
      {form.activationMode === 'OTAA' && (
        <Field label="App Key"><Input placeholder="2B7E151628AED2A6…" value={form.appKey || ''} onChange={(e) => setForm({ ...form, appKey: e.target.value })} /></Field>
      )}
      {form.activationMode === 'ABP' && (
        <Field label="DevAddr"><Input placeholder="26011BDA" value={form.devAddr || ''} onChange={(e) => setForm({ ...form, devAddr: e.target.value })} /></Field>
      )}
    </>
  );
}

function WiFiForm({ form, setForm }: { form: Record<string, string>; setForm: (f: Record<string, string>) => void }) {
  const deviceId = form.mqttDeviceId || (form._name ? form._name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'esp32-devkit-v1');

  return (
    <>
      <Field label="MQTT Device ID">
        <Input
          placeholder="esp32-devkit-v1"
          value={form.mqttDeviceId || ''}
          onChange={(e) => setForm({ ...form, mqttDeviceId: e.target.value })}
        />
      </Field>

      <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 px-3 py-3 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
          📡 ESP32 Wi-Fi Device — Sketch Configuration
        </p>
        {/* Sketch constants */}
        <div className="rounded-lg bg-background/60 px-3 py-2 font-mono text-[10px] space-y-0.5 leading-relaxed">
          <p className="text-slate-400">{'// ── esp32_wifi_device.ino ──'}</p>
          <p><span className="text-purple-400">const char*</span> <span className="text-sky-300">DEVICE_ID</span> {`= "`}<span className="text-amber-300">{deviceId}</span>{`";`}</p>
          <p><span className="text-purple-400">const char*</span> <span className="text-sky-300">MQTT_SERVER</span> {`= `}<span className="text-amber-300">&quot;{'<broker-ip>'}&quot;</span>;</p>
          <p><span className="text-purple-400">const int</span>   <span className="text-sky-300">MQTT_PORT</span>   {"= "}<span className="text-green-300">1883</span>;</p>
        </div>
        {/* Topics */}
        <div className="space-y-1">
          <p className="font-medium opacity-80">MQTT Topics (auto-configured by sketch):</p>
          {[
            { role: 'Publish data', topic: `devices/${deviceId}/data` },
            { role: 'Subscribe ctrl', topic: `devices/${deviceId}/control` },
            { role: 'Online flag', topic: `devices/${deviceId}/online` },
          ].map(({ role, topic }) => (
            <div key={role} className="flex items-center justify-between gap-2">
              <span className="opacity-60 shrink-0">{role}:</span>
              <code className="font-mono text-[10px] text-sky-400/90 truncate">{topic}</code>
            </div>
          ))}
        </div>
        <p className="opacity-50 text-[10px]">Payload includes: temperature, humidity, ledState, pinsActive, rssi</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Chipset (optional)">
          <Input
            placeholder="ESP32-DevKit-V1"
            value={form.chipset || ''}
            onChange={(e) => setForm({ ...form, chipset: e.target.value })}
          />
        </Field>
        <Field label="Firmware Version">
          <Input
            placeholder="1.0.0"
            value={form.firmwareVersion || ''}
            onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })}
          />
        </Field>
      </div>
    </>
  );
}

function BluetoothForm({ form, setForm }: { form: Record<string, string>; setForm: (f: Record<string, string>) => void }) {
  return (
    <>
      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2.5 text-xs text-muted-foreground mb-1">
        <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">🔵 Bluetooth Placeholder</p>
        <p>Bluetooth devices are currently monitored locally. Full BLE integration is coming soon. You can register the device now for future use.</p>
      </div>
      <Field label="MAC Address (optional)"><Input placeholder="AA:BB:CC:DD:EE:FF" value={form.macAddress || ''} onChange={(e) => setForm({ ...form, macAddress: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={form.protocol || ''} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
            <option value="">Select…</option>
            <option value="BLE">BLE</option>
            <option value="Classic">Classic</option>
          </Select>
        </Field>
        <Field label="Manufacturer (optional)"><Input placeholder="Nordic Semi" value={form.manufacturer || ''} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
      </div>
    </>
  );
}

function GSMForm({ form, setForm }: { form: Record<string, string>; setForm: (f: Record<string, string>) => void }) {
  const mqttTopic = form.mqttDeviceId
    ? `devices/${form.mqttDeviceId}/data`
    : form._name
      ? `devices/${form._name.toLowerCase().replace(/[^a-z0-9]/g, '-')}/data`
      : 'devices/<device-id>/data';

  return (
    <>
      <Field label="MQTT Device ID">
        <Input
          placeholder="gsm-sensor-01"
          value={form.mqttDeviceId || ''}
          onChange={(e) => setForm({ ...form, mqttDeviceId: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IMEI (optional)"><Input placeholder="353879234252654" value={form.imei || ''} onChange={(e) => setForm({ ...form, imei: e.target.value })} /></Field>
        <Field label="Network Type">
          <Select value={form.networkType || ''} onChange={(e) => setForm({ ...form, networkType: e.target.value })}>
            <option value="">Select…</option>
            <option value="2G">2G</option>
            <option value="3G">3G</option>
            <option value="4G">4G</option>
            <option value="LTE">LTE</option>
          </Select>
        </Field>
      </div>
      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-emerald-600 dark:text-emerald-400">📡 ESP32 + SIM MQTT Configuration</p>
        <p>Publish sensor data to this topic:</p>
        <code className="block font-mono text-[11px] bg-background/60 rounded px-2 py-1 mt-1 break-all">{mqttTopic}</code>
        <div className="mt-2 space-y-0.5 opacity-80">
          <p>Broker: <span className="font-mono">your-cluster.s1.eu.hivemq.cloud</span></p>
          <p>Port: <span className="font-mono">8883 (TLS)</span> · Auth: username + password required</p>
          <p className="opacity-70 text-[10px] mt-1">See <span className="font-mono">console.hivemq.cloud</span> for your cluster host &amp; credentials.</p>
        </div>
      </div>
    </>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  initialProtocol?: NetworkProtocol | null;
  onClose: () => void;
  onSuccess?: (device: NetworkDevice) => void;
}

export function AddDeviceModal({ open, initialProtocol, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((s: RootState) => s.networkDevices);

  const [step, setStep] = useState<'pick' | 'form'>(initialProtocol ? 'form' : 'pick');
  const [protocol, setProtocol] = useState<NetworkProtocol | null>(initialProtocol ?? null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protoForm, setProtoForm] = useState<Record<string, string>>({});

  const handleClose = () => {
    setStep(initialProtocol ? 'form' : 'pick');
    setProtocol(initialProtocol ?? null);
    setName('');
    setDescription('');
    setProtoForm({});
    onClose();
  };

  const pickProtocol = (p: NetworkProtocol) => {
    setProtocol(p);
    setProtoForm({});
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocol) return;

    const payload: Parameters<typeof createNetworkDevice>[0] = {
      name,
      description: description || undefined,
      protocol,
      tags: [],
      status: 'offline',
    };

    if (protocol === 'lorawan') {
      payload.lorawan = {
        devEui: protoForm.devEui || undefined,
        appId: protoForm.appId || undefined,
        activationMode: (protoForm.activationMode as 'OTAA' | 'ABP') || undefined,
        deviceClass: (protoForm.deviceClass as 'A' | 'B' | 'C') || undefined,
        appKey: protoForm.appKey || undefined,
        devAddr: protoForm.devAddr || undefined,
      };
    } else if (protocol === 'wifi') {
      // Auto-generate MQTT device ID from name if not provided
      const mqttId = protoForm.mqttDeviceId || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      (payload as Record<string, unknown>).mqttDeviceId = mqttId;
      payload.wifi = {
        macAddress: protoForm.macAddress || undefined,
        ipAddress: undefined,
        ssid: undefined,
        chipset: protoForm.chipset || 'ESP32-DevKit-V1',
        firmwareVersion: protoForm.firmwareVersion || undefined,
      };
    } else if (protocol === 'bluetooth') {
      payload.bluetooth = {
        macAddress: protoForm.macAddress || undefined,
        protocol: (protoForm.protocol as 'BLE' | 'Classic') || undefined,
        manufacturer: protoForm.manufacturer || undefined,
        firmwareVersion: undefined,
      };
    } else if (protocol === 'gsm') {
      // Auto-generate MQTT device ID from name if not provided
      const mqttId = protoForm.mqttDeviceId || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      (payload as Record<string, unknown>).mqttDeviceId = mqttId;
      payload.gsm = {
        imei: protoForm.imei || undefined,
        networkType: (protoForm.networkType as '2G' | '3G' | '4G' | 'LTE') || undefined,
      };
    }

    const result = await dispatch(createNetworkDevice(payload));
    if (createNetworkDevice.fulfilled.match(result)) {
      onSuccess?.(result.payload);
      handleClose();
    }
  };

  const selectedMeta = PROTOCOLS.find((p) => p.id === protocol);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3">
                {step === 'form' && !initialProtocol && (
                  <button
                    onClick={() => setStep('pick')}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold">
                    {step === 'pick' ? 'Add Network Device' : `Add ${selectedMeta?.label} Device`}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step === 'pick' ? 'Select a protocol to continue' : selectedMeta?.description}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <AnimatePresence mode="wait">
                {step === 'pick' ? (
                  <motion.div
                    key="pick"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {PROTOCOLS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => pickProtocol(p.id)}
                        className={`flex flex-col items-center gap-3 p-5 rounded-xl border bg-gradient-to-br ${p.color} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        {p.icon}
                        <div className="text-center">
                          <div className="font-semibold text-sm">{p.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{p.description}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    id="add-device-form"
                  >
                    {/* Shared fields */}
                    <Field label="Device Name *">
                      <Input
                        placeholder="My Device 01"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Description">
                      <Input
                        placeholder="Optional description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </Field>

                    {/* Divider */}
                    <div className="border-t border-border/50 my-2" />

                    {/* Protocol-specific fields */}
                    {protocol === 'lorawan' && <LoRaWANForm form={protoForm} setForm={setProtoForm} />}
                    {protocol === 'wifi' && <WiFiForm form={{ ...protoForm, _name: name }} setForm={(f) => setProtoForm({ ...f, _name: undefined as unknown as string })} />}
                    {protocol === 'bluetooth' && <BluetoothForm form={protoForm} setForm={setProtoForm} />}
                    {protocol === 'gsm' && <GSMForm form={{ ...protoForm, _name: name }} setForm={(f) => setProtoForm({ ...f, _name: undefined as unknown as string })} />}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Footer (only for form step) */}
            {step === 'form' && (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/50 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm rounded-lg border border-border/50 hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="add-device-form"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading && (
                    <motion.div
                      className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  Add Device
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

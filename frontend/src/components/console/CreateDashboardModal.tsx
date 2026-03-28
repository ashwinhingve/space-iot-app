'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { X, Wifi, Radio, Cpu, Activity, Loader2 } from 'lucide-react';
import { RootState, AppDispatch } from '@/store/store';
import { createDashboard, fetchTemplates } from '@/store/slices/consoleSlice';
import type { DeviceType, ConsoleTemplate } from '@/store/slices/consoleSlice';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/lib/config';

interface Props { onClose: () => void; }

const DEVICE_TYPE_CONFIG: Record<DeviceType, { label: string; icon: React.ElementType; color: string }> = {
  ttn:      { label: 'TTN / LoRaWAN', icon: Radio,    color: 'text-purple-400' },
  wifi:     { label: 'Wi-Fi / ESP32',  icon: Wifi,     color: 'text-blue-400'   },
  manifold: { label: 'Manifold',       icon: Activity, color: 'text-cyan-400'   },
  mqtt:     { label: 'MQTT Device',    icon: Cpu,      color: 'text-emerald-400'},
};

export function CreateDashboardModal({ onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const manifolds  = useSelector((s: RootState) => s.manifolds.manifolds);
  const templates  = useSelector((s: RootState) => s.console.templates);
  const saving     = useSelector((s: RootState) => s.console.saving);

  const [name, setName]             = useState('');
  const [description, setDesc]      = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('ttn');
  const [templateId, setTemplate]   = useState('');
  const [deviceId, setDeviceId]     = useState('');
  const [manifoldId, setManifoldId] = useState('');
  const [ttnAppId, setTtnAppId]     = useState('');
  const [ttnDeviceId, setTtnDevId]  = useState('');
  const [deviceName, setDeviceName] = useState('');

  // Device lists
  const [wifiDevices, setWifiDevices]   = useState<{ _id: string; name: string }[]>([]);
  const [mqttDevices, setMqttDevices]   = useState<{ _id: string; name: string }[]>([]);
  const [ttnApps, setTtnApps]           = useState<{ applicationId: string; name: string }[]>([]);
  const [ttnDevices, setTtnDevices]     = useState<{ deviceId: string; name: string }[]>([]);

  useEffect(() => { if (templates.length === 0) dispatch(fetchTemplates()); }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (deviceType === 'wifi') {
      fetch(`${API_ENDPOINTS.NETWORK_DEVICES}?protocol=wifi`, { headers: h }).then(r => r.json()).then(d => setWifiDevices(d.devices ?? []));
    } else if (deviceType === 'mqtt') {
      fetch(API_ENDPOINTS.DEVICES, { headers: h }).then(r => r.json()).then(d => setMqttDevices(d.devices ?? []));
    } else if (deviceType === 'ttn') {
      fetch(API_ENDPOINTS.TTN_APPLICATIONS, { headers: h }).then(r => r.json()).then(d => setTtnApps(d.applications ?? []));
    }
  }, [deviceType]);

  useEffect(() => {
    if (deviceType !== 'ttn' || !ttnAppId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(API_ENDPOINTS.TTN_DEVICES(ttnAppId), { headers: h }).then(r => r.json()).then(d => setTtnDevices(d.devices ?? []));
  }, [ttnAppId]);

  const filteredTemplates = templates.filter(t => !deviceType || t.deviceType === deviceType);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const deviceRef = {
      deviceType,
      ...(deviceType === 'ttn' ? { ttnApplicationId: ttnAppId, ttnDeviceId, deviceName: deviceName || ttnDeviceId } : {}),
      ...(deviceType === 'wifi' ? { deviceId, deviceName: deviceName || deviceId } : {}),
      ...(deviceType === 'manifold' ? { manifoldId, deviceName: deviceName || manifoldId } : {}),
      ...(deviceType === 'mqtt' ? { deviceId, deviceName: deviceName || deviceId } : {}),
    };
    const result = await dispatch(createDashboard({ name: name.trim(), description: description.trim(), deviceRef, templateId: templateId || undefined }));
    if (createDashboard.fulfilled.match(result)) {
      router.push(`/console/${result.payload._id}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-md p-5 z-10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold text-base">New Dashboard</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="My Dashboard"
              className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Description</label>
            <input
              value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional description"
              className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/40"
            />
          </div>

          {/* Device Type */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Device Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DEVICE_TYPE_CONFIG) as [DeviceType, typeof DEVICE_TYPE_CONFIG[DeviceType]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                const active = deviceType === type;
                return (
                  <button key={type} onClick={() => setDeviceType(type)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${active ? 'border-brand-500/60 bg-brand-500/10' : 'border-border/30 hover:border-border/60'}`}>
                    <Icon className={`h-4 w-4 ${active ? 'text-brand-400' : 'text-muted-foreground/60'}`} />
                    <span className={`text-xs ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device picker */}
          {deviceType === 'ttn' && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">TTN Application</label>
              <select value={ttnAppId} onChange={e => setTtnAppId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none">
                <option value="">Select application…</option>
                {ttnApps.map(a => <option key={a.applicationId} value={a.applicationId}>{a.name}</option>)}
              </select>
              {ttnAppId && (
                <>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Device (optional)</label>
                  <select value={ttnDeviceId} onChange={e => setTtnDevId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none">
                    <option value="">All devices in app</option>
                    {ttnDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.name}</option>)}
                  </select>
                </>
              )}
            </div>
          )}
          {deviceType === 'wifi' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Wi-Fi Device</label>
              <select value={deviceId} onChange={e => setDeviceId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none">
                <option value="">Select device…</option>
                {wifiDevices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {deviceType === 'manifold' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Manifold</label>
              <select value={manifoldId} onChange={e => setManifoldId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none">
                <option value="">Select manifold…</option>
                {manifolds.map(m => <option key={m._id} value={m.manifoldId ?? m._id}>{m.name}</option>)}
              </select>
            </div>
          )}
          {deviceType === 'mqtt' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">MQTT Device</label>
              <select value={deviceId} onChange={e => setDeviceId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none">
                <option value="">Select device…</option>
                {mqttDevices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Template */}
          {filteredTemplates.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Template (optional)</label>
              <div className="space-y-1.5">
                <button
                  onClick={() => setTemplate('')}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${!templateId ? 'border-brand-500/60 bg-brand-500/10' : 'border-border/30 hover:border-border/60'}`}
                >
                  <span className="font-medium">Blank</span>
                  <span className="text-muted-foreground ml-2">Start with empty canvas</span>
                </button>
                {filteredTemplates.map(t => (
                  <button key={t.slug} onClick={() => setTemplate(t.slug)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${templateId === t.slug ? 'border-brand-500/60 bg-brand-500/10' : 'border-border/30 hover:border-border/60'}`}>
                    <span className="font-medium">{t.name}</span>
                    <p className="text-muted-foreground mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || saving} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { X, Trash2, Save } from 'lucide-react';
import { RootState, AppDispatch } from '@/store/store';
import { updateWidget, deleteWidget, setEditingWidget } from '@/store/slices/consoleSlice';
import type { ConsoleWidget, WidgetOnPress } from '@/store/slices/consoleSlice';
import { Button } from '@/components/ui/button';

interface Props {
  dashboardId: string;
}

const COLOR_SWATCHES = ['#00e5ff','#7c3aed','#22c55e','#f59e0b','#ef4444','#ec4899','#3b82f6','#ffffff'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder = '' }: {
  value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-8 rounded-lg border border-border/50 bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/40"
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-8 rounded-lg border border-border/50 bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/40"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function WidgetConfigPanel({ dashboardId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const editingId = useSelector((s: RootState) => s.console.editingWidgetId);
  const dashboard = useSelector((s: RootState) => s.console.activeDashboard);
  const saving = useSelector((s: RootState) => s.console.saving);

  const widget = dashboard?.widgets.find(w => w.widgetId === editingId);
  const [form, setForm] = useState<Partial<ConsoleWidget>>({});

  useEffect(() => {
    if (widget) setForm({ ...widget });
  }, [widget?.widgetId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!widget || !editingId) return null;

  const update = (key: keyof ConsoleWidget, val: unknown) => setForm(f => ({ ...f, [key]: val }));
  const updateDS = (key: string, val: unknown) => setForm(f => ({ ...f, dataSource: { ...(f.dataSource ?? { path: '' }), [key]: val } }));
  const updateOP = (key: keyof WidgetOnPress, val: unknown) => setForm(f => ({ ...f, onPress: { ...(f.onPress ?? { apiType: 'none' }), [key]: val } as WidgetOnPress }));

  const handleSave = () => {
    dispatch(updateWidget({ dashboardId, widgetId: editingId, fields: form }));
    dispatch(setEditingWidget(null));
  };

  const handleDelete = () => {
    dispatch(deleteWidget({ dashboardId, widgetId: editingId }));
  };

  const apiType = form.onPress?.apiType ?? 'none';
  const hasDataSource = !['button'].includes(form.type ?? widget.type);
  const hasControl = ['button','switch','slider'].includes(form.type ?? widget.type);

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 22, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-72 bg-card/95 backdrop-blur-xl border-l border-border/40 z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
        <p className="text-sm font-semibold">Widget Config</p>
        <button onClick={() => dispatch(setEditingWidget(null))} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Display */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Display</p>
          <Field label="Label">
            <Input value={form.label ?? ''} onChange={v => update('label', v)} placeholder="Widget label" />
          </Field>
          <Field label="Color">
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_SWATCHES.map(c => (
                <button key={c} onClick={() => update('color', c)}
                  className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: form.color === c ? '#fff' : 'transparent' }} />
              ))}
              <input
                type="text" value={form.color ?? ''} onChange={e => update('color', e.target.value)}
                className="w-20 h-6 rounded-md border border-border/50 bg-background px-1.5 text-[10px] focus:outline-none"
                placeholder="#hex"
              />
            </div>
          </Field>
        </div>

        {/* Gauge-specific */}
        {(form.type ?? widget.type) === 'gauge' && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Gauge</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min"><Input type="number" value={form.min ?? 0} onChange={v => update('min', Number(v))} /></Field>
              <Field label="Max"><Input type="number" value={form.max ?? 100} onChange={v => update('max', Number(v))} /></Field>
            </div>
            <Field label="Unit"><Input value={form.unit ?? ''} onChange={v => update('unit', v)} placeholder="°C, %, bar…" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Warning">
                <Input type="number" value={form.warningThreshold ?? ''} onChange={v => update('warningThreshold', v ? Number(v) : undefined)} placeholder="optional" />
              </Field>
              <Field label="Critical">
                <Input type="number" value={form.criticalThreshold ?? ''} onChange={v => update('criticalThreshold', v ? Number(v) : undefined)} placeholder="optional" />
              </Field>
            </div>
          </div>
        )}

        {/* Value-specific */}
        {(form.type ?? widget.type) === 'value' && (
          <Field label="Unit"><Input value={form.unit ?? ''} onChange={v => update('unit', v)} placeholder="°C, %, bar…" /></Field>
        )}

        {/* Chart-specific */}
        {(form.type ?? widget.type) === 'chart' && (
          <Field label="Max data points">
            <Input type="number" value={form.chartMaxPoints ?? 50} onChange={v => update('chartMaxPoints', Number(v))} />
          </Field>
        )}

        {/* LED-specific */}
        {(form.type ?? widget.type) === 'led' && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">LED</p>
            <Field label="ON value"><Input value={String(form.onValue ?? '')} onChange={v => update('onValue', v)} placeholder="true, 1, online…" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="On color"><Input value={form.trueColor ?? '#22c55e'} onChange={v => update('trueColor', v)} /></Field>
              <Field label="Off color"><Input value={form.falseColor ?? '#ef4444'} onChange={v => update('falseColor', v)} /></Field>
            </div>
          </div>
        )}

        {/* Slider-specific */}
        {(form.type ?? widget.type) === 'slider' && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Slider</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Min"><Input type="number" value={form.sliderMin ?? 0} onChange={v => update('sliderMin', Number(v))} /></Field>
              <Field label="Max"><Input type="number" value={form.sliderMax ?? 100} onChange={v => update('sliderMax', Number(v))} /></Field>
              <Field label="Step"><Input type="number" value={form.sliderStep ?? 1} onChange={v => update('sliderStep', Number(v))} /></Field>
            </div>
          </div>
        )}

        {/* Data Source */}
        {hasDataSource && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Data Source</p>
            <Field label="Field path">
              <Input value={form.dataSource?.path ?? ''} onChange={v => updateDS('path', v)} placeholder="e.g. decodedPayload.temperature" />
            </Field>
            <Field label="Transform">
              <Select value={form.dataSource?.transform ?? 'none'} onChange={v => updateDS('transform', v)} options={[
                { value: 'none', label: 'None' },
                { value: 'round', label: 'Round' },
                { value: 'toFixed1', label: '1 decimal' },
                { value: 'toFixed2', label: '2 decimals' },
                { value: 'multiply', label: 'Multiply by…' },
                { value: 'divide', label: 'Divide by…' },
              ]} />
            </Field>
            {['multiply','divide'].includes(form.dataSource?.transform ?? '') && (
              <Field label="Transform value">
                <Input type="number" value={form.dataSource?.transformValue ?? 1} onChange={v => updateDS('transformValue', Number(v))} />
              </Field>
            )}
          </div>
        )}

        {/* Control */}
        {hasControl && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Control</p>
            <Field label="API type">
              <Select value={apiType} onChange={v => updateOP('apiType', v)} options={[
                { value: 'none', label: 'None (display only)' },
                { value: 'mqtt', label: 'MQTT Device' },
                { value: 'ttn-downlink', label: 'TTN Downlink' },
                { value: 'valve', label: 'Valve Command' },
              ]} />
            </Field>
            {apiType === 'mqtt' && (
              <>
                <Field label="Device ID"><Input value={form.onPress?.mqttDeviceId ?? ''} onChange={v => updateOP('mqttDeviceId', v)} placeholder="MongoDB _id" /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Press value"><Input type="number" value={form.onPress?.pressValue ?? 1} onChange={v => updateOP('pressValue', Number(v))} /></Field>
                  <Field label="Release value"><Input type="number" value={form.onPress?.releaseValue ?? 0} onChange={v => updateOP('releaseValue', Number(v))} /></Field>
                </div>
              </>
            )}
            {apiType === 'ttn-downlink' && (
              <>
                <Field label="App ID"><Input value={form.onPress?.ttnAppId ?? ''} onChange={v => updateOP('ttnAppId', v)} /></Field>
                <Field label="Device ID"><Input value={form.onPress?.ttnDeviceId ?? ''} onChange={v => updateOP('ttnDeviceId', v)} /></Field>
                <Field label="fPort"><Input type="number" value={form.onPress?.fPort ?? 1} onChange={v => updateOP('fPort', Number(v))} /></Field>
              </>
            )}
            {apiType === 'valve' && (
              <>
                <Field label="Valve ID"><Input value={form.onPress?.valveId ?? ''} onChange={v => updateOP('valveId', v)} placeholder="Valve _id" /></Field>
                <Field label="Action">
                  <Select value={form.onPress?.valveAction ?? 'ON'} onChange={v => updateOP('valveAction', v)} options={[
                    { value: 'ON', label: 'ON' }, { value: 'OFF', label: 'OFF' }, { value: 'PULSE', label: 'PULSE' },
                  ]} />
                </Field>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/30 space-y-2 shrink-0">
        <Button size="sm" onClick={handleSave} disabled={saving} className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2">
          <Save className="h-3.5 w-3.5" /> Save Changes
        </Button>
        <Button size="sm" variant="outline" onClick={handleDelete}
          className="w-full gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5" /> Delete Widget
        </Button>
      </div>
    </motion.div>
  );
}

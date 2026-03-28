import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ConsoleDashboard } from '../models/ConsoleDashboard';
import { createDashboardSchema, updateDashboardSchema, addWidgetSchema, updateWidgetSchema, parseBody } from '../utils/validate';

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_DEVICE_TYPES = ['ttn', 'wifi', 'manifold', 'mqtt'] as const;
const VALID_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const VALID_PATH_REGEX  = /^[a-zA-Z0-9_.]+$/;
const MAX_WIDGETS       = 50;

// Fields that a client is allowed to update on a widget (whitelist)
const WIDGET_UPDATABLE_FIELDS = [
  'label', 'color', 'backgroundColor', 'unit', 'min', 'max',
  'warningThreshold', 'criticalThreshold', 'trueColor', 'falseColor',
  'onValue', 'onPress', 'dataSource', 'chartMaxPoints',
  'sliderMin', 'sliderMax', 'sliderStep', 'layout',
] as const;

// ─── Static Templates ────────────────────────────────────────────────────────

const CONSOLE_TEMPLATES = [
  {
    slug: 'ttn-env-sensor',
    name: 'Environmental Sensor',
    description: 'Temperature, humidity, battery and RSSI for a LoRaWAN environmental node',
    deviceType: 'ttn',
    widgets: [
      { type: 'gauge', label: 'Temperature', color: '#00e5ff', unit: '°C', min: -10, max: 60,
        warningThreshold: 40, criticalThreshold: 50,
        dataSource: { path: 'decodedPayload.temperature', unit: '°C' },
        layout: { i: '__REPLACE__', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 } },
      { type: 'gauge', label: 'Humidity', color: '#7c3aed', unit: '%', min: 0, max: 100,
        warningThreshold: 80, criticalThreshold: 95,
        dataSource: { path: 'decodedPayload.humidity', unit: '%' },
        layout: { i: '__REPLACE__', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 } },
      { type: 'value', label: 'RSSI', color: '#22c55e', unit: 'dBm',
        dataSource: { path: 'rssi', unit: 'dBm' },
        layout: { i: '__REPLACE__', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'value', label: 'SNR', color: '#f59e0b', unit: 'dB',
        dataSource: { path: 'snr', unit: 'dB' },
        layout: { i: '__REPLACE__', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'chart', label: 'Temperature History', color: '#00e5ff', chartMaxPoints: 30,
        dataSource: { path: 'decodedPayload.temperature' },
        layout: { i: '__REPLACE__', x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 } },
      { type: 'led', label: 'Device Online', trueColor: '#22c55e', falseColor: '#ef4444', onValue: 'online',
        dataSource: { path: 'status' },
        layout: { i: '__REPLACE__', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'terminal', label: 'Event Log', color: '#00e5ff',
        layout: { i: '__REPLACE__', x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 } },
    ],
  },
  {
    slug: 'wifi-control-node',
    name: 'Wi-Fi Control Node',
    description: 'Temperature display, LED state, and remote control for ESP32/ESP8266 Wi-Fi devices',
    deviceType: 'wifi',
    widgets: [
      { type: 'gauge', label: 'Temperature', color: '#00e5ff', unit: '°C', min: 0, max: 80,
        warningThreshold: 60, criticalThreshold: 75,
        dataSource: { path: 'temperature', unit: '°C' },
        layout: { i: '__REPLACE__', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 } },
      { type: 'gauge', label: 'Humidity', color: '#7c3aed', unit: '%', min: 0, max: 100,
        dataSource: { path: 'humidity', unit: '%' },
        layout: { i: '__REPLACE__', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 } },
      { type: 'switch', label: 'LED Control', color: '#22c55e', onValue: true,
        dataSource: { path: 'ledState' },
        onPress: { apiType: 'mqtt', pressValue: 1, releaseValue: 0 },
        layout: { i: '__REPLACE__', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'value', label: 'Wi-Fi RSSI', color: '#f59e0b', unit: 'dBm',
        dataSource: { path: 'rssi', unit: 'dBm' },
        layout: { i: '__REPLACE__', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'led', label: 'LED State', trueColor: '#f59e0b', falseColor: '#374151', onValue: true,
        dataSource: { path: 'ledState' },
        layout: { i: '__REPLACE__', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'chart', label: 'Temperature Trend', color: '#00e5ff', chartMaxPoints: 50,
        dataSource: { path: 'temperature' },
        layout: { i: '__REPLACE__', x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 } },
      { type: 'chart', label: 'Humidity Trend', color: '#7c3aed', chartMaxPoints: 50,
        dataSource: { path: 'humidity' },
        layout: { i: '__REPLACE__', x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 } },
    ],
  },
  {
    slug: 'manifold-monitor',
    name: 'Manifold Monitor',
    description: 'Pressure transducers, battery, solar, and valve status for a manifold controller',
    deviceType: 'manifold',
    widgets: [
      { type: 'gauge', label: 'PT1 Pressure', color: '#00e5ff', unit: 'bar', min: 0, max: 10,
        warningThreshold: 8, criticalThreshold: 9.5,
        dataSource: { path: 'pt1', unit: 'bar' },
        layout: { i: '__REPLACE__', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 } },
      { type: 'gauge', label: 'PT2 Pressure', color: '#7c3aed', unit: 'bar', min: 0, max: 10,
        warningThreshold: 8, criticalThreshold: 9.5,
        dataSource: { path: 'pt2', unit: 'bar' },
        layout: { i: '__REPLACE__', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 } },
      { type: 'value', label: 'Battery', color: '#22c55e', unit: '%',
        dataSource: { path: 'battery', unit: '%' },
        layout: { i: '__REPLACE__', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'value', label: 'Solar', color: '#f59e0b', unit: '%',
        dataSource: { path: 'solar', unit: '%' },
        layout: { i: '__REPLACE__', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'value', label: 'RSSI', color: '#64748b', unit: 'dBm',
        dataSource: { path: 'rssi', unit: 'dBm' },
        layout: { i: '__REPLACE__', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'led', label: 'Tamper Alert', trueColor: '#ef4444', falseColor: '#22c55e', onValue: true,
        dataSource: { path: 'tamper' },
        layout: { i: '__REPLACE__', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 } },
      { type: 'chart', label: 'PT1 History', color: '#00e5ff', chartMaxPoints: 60,
        dataSource: { path: 'pt1' },
        layout: { i: '__REPLACE__', x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 } },
      { type: 'terminal', label: 'Event Log', color: '#00e5ff',
        layout: { i: '__REPLACE__', x: 6, y: 4, w: 6, h: 4, minW: 4, minH: 3 } },
    ],
  },
  {
    slug: 'mqtt-generic',
    name: 'MQTT Generic Sensor',
    description: 'Flexible template for any MQTT device publishing temperature, humidity, or a single value',
    deviceType: 'mqtt',
    widgets: [
      { type: 'value', label: 'Sensor Value', color: '#00e5ff', unit: '',
        dataSource: { path: 'value', unit: '' },
        layout: { i: '__REPLACE__', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 } },
      { type: 'gauge', label: 'Temperature', color: '#f59e0b', unit: '°C', min: 0, max: 100,
        dataSource: { path: 'temperature', unit: '°C' },
        layout: { i: '__REPLACE__', x: 4, y: 0, w: 4, h: 4, minW: 2, minH: 3 } },
      { type: 'gauge', label: 'Humidity', color: '#7c3aed', unit: '%', min: 0, max: 100,
        dataSource: { path: 'humidity', unit: '%' },
        layout: { i: '__REPLACE__', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3 } },
      { type: 'button', label: 'Send ON', color: '#00e5ff',
        onPress: { apiType: 'mqtt', pressValue: 1, releaseValue: 0 },
        layout: { i: '__REPLACE__', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 } },
      { type: 'slider', label: 'Control Level', color: '#00e5ff', sliderMin: 0, sliderMax: 100, sliderStep: 1,
        onPress: { apiType: 'mqtt', pressValue: 50 },
        layout: { i: '__REPLACE__', x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 2 } },
      { type: 'led', label: 'Device Status', trueColor: '#22c55e', falseColor: '#ef4444', onValue: 'online',
        dataSource: { path: 'status' },
        layout: { i: '__REPLACE__', x: 8, y: 4, w: 2, h: 2, minW: 2, minH: 2 } },
      { type: 'chart', label: 'Data History', color: '#00e5ff', chartMaxPoints: 50,
        dataSource: { path: 'value' },
        layout: { i: '__REPLACE__', x: 0, y: 6, w: 12, h: 4, minW: 6, minH: 3 } },
    ],
  },
];

function applyTemplate(slug: string): any[] {
  const template = CONSOLE_TEMPLATES.find(t => t.slug === slug);
  if (!template) return [];
  return template.widgets.map(w => {
    const id = randomUUID();
    return { ...w, widgetId: id, layout: { ...w.layout, i: id } };
  });
}

// ─── Controller Functions ────────────────────────────────────────────────────

export const getTemplates = (_req: Request, res: Response) => {
  res.json({ templates: CONSOLE_TEMPLATES.map(({ slug, name, description, deviceType }) => ({ slug, name, description, deviceType })) });
};

export const getDashboards = async (req: Request, res: Response) => {
  try {
    const dashboards = await ConsoleDashboard.find({ owner: (req as any).user._id }).sort('-updatedAt').lean();
    res.json({ dashboards });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const createDashboard = async (req: Request, res: Response) => {
  try {
    const body = parseBody(createDashboardSchema, req.body, res);
    if (!body) return;
    const { name, description, icon, color, deviceRef, templateId } = body;

    const widgets = templateId ? applyTemplate(templateId) : [];
    const dashboard = await ConsoleDashboard.create({
      owner: (req as any).user._id,
      name: name.trim(),
      description: description?.trim(),
      icon: icon || 'LayoutDashboard',
      color: color || '#00e5ff',
      deviceRef,
      widgets,
      templateId,
    });
    res.status(201).json({ dashboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await ConsoleDashboard.findOne({ _id: req.params.id, owner: (req as any).user._id }).lean();
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    res.json({ dashboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const body = parseBody(updateDashboardSchema, req.body, res);
    if (!body) return;
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body) as (keyof typeof body)[]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    const dashboard = await ConsoleDashboard.findOneAndUpdate(
      { _id: req.params.id, owner: (req as any).user._id },
      { $set: updates },
      { new: true }
    );
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    res.json({ dashboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const saveDashboardLayout = async (req: Request, res: Response) => {
  try {
    const { widgets } = req.body;
    if (!Array.isArray(widgets)) return res.status(400).json({ error: 'widgets must be an array' });
    const dashboard = await ConsoleDashboard.findOneAndUpdate(
      { _id: req.params.id, owner: (req as any).user._id },
      { $set: { widgets } },
      { new: true }
    );
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    res.json({ dashboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const addWidget = async (req: Request, res: Response) => {
  try {
    const dashboard = await ConsoleDashboard.findOne({ _id: req.params.id, owner: (req as any).user._id });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    if (dashboard.widgets.length >= MAX_WIDGETS) {
      return res.status(400).json({ error: `Maximum ${MAX_WIDGETS} widgets per dashboard` });
    }

    const widgetBody = parseBody(addWidgetSchema, req.body, res);
    if (!widgetBody) return;

    const widgetId = randomUUID();
    const widget = { ...widgetBody, widgetId, layout: { ...widgetBody.layout, i: widgetId } };
    dashboard.widgets.push(widget);
    await dashboard.save();
    res.status(201).json({ dashboard, widgetId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateWidget = async (req: Request, res: Response) => {
  try {
    const dashboard = await ConsoleDashboard.findOne({ _id: req.params.id, owner: (req as any).user._id });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });

    const idx = dashboard.widgets.findIndex((w: any) => w.widgetId === req.params.widgetId);
    if (idx === -1) return res.status(404).json({ error: 'Widget not found' });

    // Validate and whitelist update fields via Zod schema
    const updateBody = parseBody(updateWidgetSchema, req.body, res);
    if (!updateBody) return;

    const existing = dashboard.widgets[idx] as any;
    const updated = { ...(existing.toObject?.() ?? existing), ...updateBody, widgetId: existing.widgetId };
    dashboard.widgets[idx] = updated;
    dashboard.markModified('widgets');
    await dashboard.save();
    res.json({ dashboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteWidget = async (req: Request, res: Response) => {
  try {
    const dashboard = await ConsoleDashboard.findOneAndUpdate(
      { _id: req.params.id, owner: (req as any).user._id },
      { $pull: { widgets: { widgetId: req.params.widgetId } as any } },
      { new: true }
    );
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    res.json({ dashboard });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await ConsoleDashboard.findOneAndDelete({ _id: req.params.id, owner: (req as any).user._id });
    if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
    res.json({ message: 'Dashboard deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

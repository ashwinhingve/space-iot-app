'use client';

import { X, Gauge, Hash, LineChart, Zap, ToggleLeft, SlidersHorizontal, Circle, Terminal } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { addWidget } from '@/store/slices/consoleSlice';
import type { WidgetType } from '@/store/slices/consoleSlice';

interface Props {
  dashboardId: string;
  onClose: () => void;
}

const WIDGET_TYPES: { type: WidgetType; icon: React.ElementType; label: string; desc: string; defaultW: number; defaultH: number }[] = [
  { type: 'gauge',    icon: Gauge,             label: 'Gauge',    desc: 'SVG arc gauge with min/max/thresholds', defaultW: 3, defaultH: 4 },
  { type: 'value',    icon: Hash,              label: 'Value',    desc: 'Large number display with trend arrow',  defaultW: 3, defaultH: 3 },
  { type: 'chart',    icon: LineChart,         label: 'Chart',    desc: 'Time-series line chart with history',   defaultW: 6, defaultH: 4 },
  { type: 'button',   icon: Zap,               label: 'Button',   desc: 'Momentary press, sends command',        defaultW: 3, defaultH: 2 },
  { type: 'switch',   icon: ToggleLeft,        label: 'Switch',   desc: 'Toggle ON/OFF, bidirectional',          defaultW: 3, defaultH: 2 },
  { type: 'slider',   icon: SlidersHorizontal, label: 'Slider',   desc: 'Range value, sends on release',         defaultW: 4, defaultH: 2 },
  { type: 'led',      icon: Circle,            label: 'LED',      desc: 'Color indicator, shows online state',   defaultW: 2, defaultH: 2 },
  { type: 'terminal', icon: Terminal,          label: 'Terminal', desc: 'Scrolling log of received events',      defaultW: 6, defaultH: 4 },
];

export function AddWidgetPanel({ dashboardId, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();

  const handleAdd = (type: WidgetType, defaultW: number, defaultH: number) => {
    dispatch(addWidget({
      dashboardId,
      widget: {
        type,
        label: WIDGET_TYPES.find(t => t.type === type)?.label ?? type,
        color: '#00e5ff',
        layout: { i: 'new', x: 0, y: 0, w: defaultW, h: defaultH, minW: 2, minH: 2 },
      },
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-lg p-5 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-base">Add Widget</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WIDGET_TYPES.map(({ type, icon: Icon, label, desc, defaultW, defaultH }) => (
            <button
              key={type}
              onClick={() => handleAdd(type, defaultW, defaultH)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/30 bg-secondary/20 hover:bg-secondary/50 hover:border-brand-500/40 transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                <Icon className="h-4.5 w-4.5 text-brand-400" />
              </div>
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

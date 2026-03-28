'use client';

import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Settings, Trash2, GripVertical } from 'lucide-react';
import { RootState, AppDispatch } from '@/store/store';
import { deleteWidget, setEditingWidget } from '@/store/slices/consoleSlice';
import type { ConsoleWidget } from '@/store/slices/consoleSlice';
import { GaugeWidget }    from './widgets/GaugeWidget';
import { ValueWidget }    from './widgets/ValueWidget';
import { ChartWidget }    from './widgets/ChartWidget';
import { ButtonWidget }   from './widgets/ButtonWidget';
import { SwitchWidget }   from './widgets/SwitchWidget';
import { SliderWidget }   from './widgets/SliderWidget';
import { LEDWidget }      from './widgets/LEDWidget';
import { TerminalWidget } from './widgets/TerminalWidget';

interface Props {
  widget: ConsoleWidget;
  dashboardId: string;
  isEditMode: boolean;
}

const WIDGET_BG: Record<string, string> = {
  gauge:    'bg-card/60',
  value:    'bg-card/60',
  chart:    'bg-card/40',
  button:   'bg-card/50',
  switch:   'bg-card/50',
  slider:   'bg-card/50',
  led:      'bg-card/50',
  terminal: 'bg-black/50',
};

export function WidgetRenderer({ widget, dashboardId, isEditMode }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const liveValue = useSelector((s: RootState) => s.console.widgetValues[widget.widgetId]);
  const editingId = useSelector((s: RootState) => s.console.editingWidgetId);
  const isEditing = editingId === widget.widgetId;

  const props = { widget, liveValue, isEditMode, onConfigOpen: (id: string) => dispatch(setEditingWidget(id)) };

  const inner = (() => {
    switch (widget.type) {
      case 'gauge':    return <GaugeWidget    {...props} />;
      case 'value':    return <ValueWidget    {...props} />;
      case 'chart':    return <ChartWidget    {...props} />;
      case 'button':   return <ButtonWidget   {...props} />;
      case 'switch':   return <SwitchWidget   {...props} />;
      case 'slider':   return <SliderWidget   {...props} />;
      case 'led':      return <LEDWidget      {...props} />;
      case 'terminal': return <TerminalWidget {...props} />;
      default:         return null;
    }
  })();

  return (
    <div className={`relative w-full h-full rounded-xl border overflow-hidden transition-all ${
      WIDGET_BG[widget.type] || 'bg-card/60'
    } ${isEditing ? 'border-brand-500/60 ring-1 ring-brand-500/30' : 'border-border/30'
    } backdrop-blur-sm`}
      style={widget.backgroundColor ? { background: widget.backgroundColor } : undefined}
    >
      {inner}

      {/* Edit mode overlay */}
      {isEditMode && (
        <div className="absolute inset-0 bg-black/20 flex items-start justify-between p-1.5 opacity-0 hover:opacity-100 transition-opacity z-10">
          {/* Drag handle (top-left) */}
          <div className="cursor-grab active:cursor-grabbing p-1 rounded bg-black/40 text-muted-foreground/70 drag-handle">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          {/* Action buttons (top-right) */}
          <div className="flex gap-1">
            <button
              onClick={() => dispatch(setEditingWidget(widget.widgetId))}
              className="p-1 rounded bg-black/40 text-muted-foreground/70 hover:text-brand-400 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => dispatch(deleteWidget({ dashboardId, widgetId: widget.widgetId }))}
              className="p-1 rounded bg-black/40 text-muted-foreground/70 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { SwitchWidget } from '@/components/widgets/Switch';
import { SliderWidget } from '@/components/widgets/Slider';
import { GaugeWidget } from '@/components/widgets/Gauge';
import { ChartWidget } from '@/components/widgets/Chart';
import { ValueWidget } from '@/components/widgets/Value';
import { ButtonWidget } from '@/components/widgets/Button';

// Define a more specific type for widget configuration
interface WidgetConfig {
  deviceId?: string;
  value?: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  color?: string;
  data?: number[];
  type?: 'bar' | 'line';
  timeframe?: string;
  topic?: string;
}

interface WidgetContentProps {
  widget: {
    type: string;
    config: WidgetConfig;
  };
}

export const WidgetContent: React.FC<WidgetContentProps> = ({ widget }) => {
  switch (widget.type) {
    case 'switch':
      return (
        <SwitchWidget
          deviceId={widget.config.deviceId || ''}
          value={widget.config.value as boolean || false}
          onChange={(value) => console.log('Switch changed:', value)}
        />
      );
    case 'slider':
      return (
        <SliderWidget
          deviceId={widget.config.deviceId || ''}
          topic={widget.config.topic || ''}
          value={Number(widget.config.value) || 0}
          onChange={(value) => console.log('Slider changed:', value)}
        />
      );
    case 'gauge':
      return (
        <GaugeWidget
          deviceId={widget.config.deviceId || ''}
          value={Number(widget.config.value) || 0}
          min={widget.config.min || 0}
          max={widget.config.max || 100}
          label={widget.config.label || 'Value'}
          color={widget.config.color || 'blue'}
        />
      );
    case 'chart':
      return (
        <ChartWidget
          deviceId={widget.config.deviceId || ''}
          data={widget.config.data || []}
          type={widget.config.type || 'bar'}
          timeframe={widget.config.timeframe || 'day'}
        />
      );
    case 'value':
      return (
        <ValueWidget
          value={typeof widget.config.value === 'boolean' 
            ? Number(widget.config.value) 
            : (widget.config.value || 0)}
          label={widget.config.label || 'Value'}
          unit={widget.config.unit || ''}
        />
      );
    case 'button':
      return (
        <ButtonWidget
          deviceId={widget.config.deviceId || ''}
          label={widget.config.label || 'Press'}
          onClick={() => console.log('Button clicked')}
        />
      );
    default:
      return (
        <div className="p-4 text-center text-muted-foreground">
          Widget type not implemented
        </div>
      );
  }
}; 
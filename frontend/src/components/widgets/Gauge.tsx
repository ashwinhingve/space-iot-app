import React from 'react';
import { Badge } from '@/components/ui/badge';

interface GaugeWidgetProps {
  deviceId: string;
  value: number;
  min?: number;
  max?: number;
  label?: string;
  color?: string;
}

export const GaugeWidget: React.FC<GaugeWidgetProps> = ({
  value,
  min = 0,
  max = 100,
  label = 'Value',
  color = 'blue'
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Get color class based on value
  const getColorClass = () => {
    if (color === 'blue') return 'bg-blue-500';
    if (color === 'green') return 'bg-green-500';
    if (color === 'yellow') return 'bg-yellow-500';
    if (color === 'red') return 'bg-red-500';
    return 'bg-blue-500';
  };
  
  return (
    <div className="p-4 bg-background border border-border rounded-lg transition-colors duration-200">
      <label className="text-sm font-medium text-foreground mb-2 block">{label}</label>
      <div className="space-y-2">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColorClass()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{min}</span>
          <Badge>{value}</Badge>
          <span className="text-xs text-muted-foreground">{max}</span>
        </div>
      </div>
    </div>
  );
}; 
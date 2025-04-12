import React from 'react';

interface ChartWidgetProps {
  deviceId: string;
  data: number[];
  type?: 'bar' | 'line';
  timeframe?: string;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  data = [25, 36, 43, 29, 40, 27, 33],
  type = 'bar',
  timeframe = 'day'
}) => {
  const maxValue = Math.max(...data);
  
  return (
    <div className="p-4 bg-background border border-border rounded-lg transition-colors duration-200">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-foreground">Data Chart</label>
        <span className="text-xs text-muted-foreground">{timeframe}</span>
      </div>
      <div className="h-24 flex items-end justify-between gap-1">
        {data.map((value, i) => (
          <div 
            key={i} 
            className={`${type === 'bar' ? 'bg-blue-500' : 'bg-primary'} rounded-t w-full`} 
            style={{ height: `${(value / maxValue) * 100}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}; 
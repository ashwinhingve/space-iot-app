import React from 'react';

interface ValueWidgetProps {
  deviceId?: string;
  value: string | number;
  label?: string;
  unit?: string;
}

export const ValueWidget: React.FC<ValueWidgetProps> = ({
  value,
  label = 'Value',
  unit = ''
}) => {
  return (
    <div className="p-4 bg-background border border-border rounded-lg transition-colors duration-200">
      <div className="text-center">
        <div className="text-3xl font-bold">
          {value}
          {unit && <span className="text-sm ml-1 text-muted-foreground">{unit}</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}; 
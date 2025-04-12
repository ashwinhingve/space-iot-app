import React from 'react';
import { Switch } from '@/components/ui/switch';

interface SwitchWidgetProps {
  deviceId: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const SwitchWidget: React.FC<SwitchWidgetProps> = ({
  value,
  onChange
}) => {
  return (
    <div className="p-4 bg-background border border-border rounded-lg transition-colors duration-200">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Switch Control</label>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
}; 
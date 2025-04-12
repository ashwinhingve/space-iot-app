import React from 'react';
import { Button } from '@/components/ui/button';

interface ButtonWidgetProps {
  deviceId: string;
  label?: string;
  onClick?: () => void;
}

export const ButtonWidget: React.FC<ButtonWidgetProps> = ({
  label = 'Press',
  onClick
}) => {
  return (
    <div className="p-4 bg-background border border-border rounded-lg transition-colors duration-200">
      <Button 
        onClick={onClick}
        className="w-full"
      >
        {label}
      </Button>
    </div>
  );
}; 
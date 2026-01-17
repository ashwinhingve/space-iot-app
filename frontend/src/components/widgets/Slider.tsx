import React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

interface SliderWidgetProps {
  deviceId: string;
  topic: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export const SliderWidget: React.FC<SliderWidgetProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : min;

  return (
    <div className="p-4 bg-background border border-border rounded-lg transition-colors duration-200">
      <label className="text-sm font-medium text-foreground mb-2 block">
        Slider Control
      </label>
      <SliderPrimitive.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[safeValue]}
        onValueChange={([newValue]) => onChange(newValue)}
        max={max}
        min={min}
        step={step}
      >
        <SliderPrimitive.Track className="bg-muted h-1 relative grow rounded-full">
          <SliderPrimitive.Range className="absolute h-full bg-primary rounded-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block w-4 h-4 bg-primary rounded-full shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Root>
      <div className="mt-2 text-sm text-muted-foreground text-right">
        {safeValue}
      </div>
    </div>
  );
}; 
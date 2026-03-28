'use client';

import { useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { AlertCircle } from 'lucide-react';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';
import { sendWidgetControl } from './shared/sendControl';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function SliderWidget({ widget, liveValue, isEditMode }: Props) {
  const min = widget.sliderMin ?? 0;
  const max = widget.sliderMax ?? 100;
  const step = widget.sliderStep ?? 1;
  const color = widget.color || '#00e5ff';

  const liveNum = typeof liveValue?.displayValue === 'number' ? liveValue.displayValue : min;
  const [localVal, setLocalVal] = useState<number>(liveNum);
  const [error, setError] = useState<string | null>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const handleChange = (vals: number[]) => {
    setLocalVal(vals[0]);
  };

  const handleCommit = async (vals: number[]) => {
    if (isEditMode) return;
    const val = Math.max(min, Math.min(max, vals[0])); // clamp to valid range
    try {
      await sendWidgetControl(widget, val);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Command failed');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 px-4 py-3 select-none">
      <div className="flex items-center justify-between w-full">
        {widget.label && (
          <p className="text-xs text-muted-foreground truncate">{widget.label}</p>
        )}
        <span className="font-data text-sm font-bold ml-auto" style={{ color }}>{localVal}</span>
      </div>
      <SliderPrimitive.Root
        min={min} max={max} step={step}
        value={[localVal]}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        disabled={isEditMode}
        className="relative flex items-center w-full h-5 select-none touch-none disabled:opacity-50"
      >
        <SliderPrimitive.Track className="relative h-1.5 flex-grow rounded-full bg-white/10">
          <SliderPrimitive.Range className="absolute h-full rounded-full" style={{ background: color }} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-5 w-5 rounded-full border-2 shadow-md focus:outline-none transition-all"
          style={{ borderColor: color, background: '#0d1117', boxShadow: `0 0 8px ${color}60` }}
        />
      </SliderPrimitive.Root>
      <div className="flex justify-between w-full text-[9px] text-muted-foreground/40">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {error && (
        <div className="flex items-center gap-1 text-[10px] text-red-400 w-full">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
}

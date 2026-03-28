'use client';

import { useState } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { AlertCircle } from 'lucide-react';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';
import { sendWidgetControl } from './shared/sendControl';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function SwitchWidget({ widget, liveValue, isEditMode }: Props) {
  const raw = liveValue?.rawValue;
  const onValue = widget.onValue;
  const isOn = raw === onValue || raw === true || raw === 1 || raw === 'on' || raw === 'ON';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color = widget.color || '#22c55e';

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const handleChange = async (checked: boolean) => {
    if (isEditMode || pending) return;
    setPending(true);
    try {
      const pressVal = checked
        ? (widget.onPress?.pressValue ?? 1)
        : (widget.onPress?.releaseValue ?? 0);
      await sendWidgetControl(widget, pressVal);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 p-3 select-none">
      <SwitchPrimitive.Root
        checked={isOn}
        onCheckedChange={handleChange}
        disabled={isEditMode || pending}
        className="relative h-7 w-14 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
        style={{
          background: isOn ? `${color}40` : 'rgba(255,255,255,0.08)',
          borderColor: isOn ? color : 'rgba(255,255,255,0.15)',
          boxShadow: isOn ? `0 0 12px ${color}50` : 'none',
        }}
      >
        <SwitchPrimitive.Thumb
          className="block h-5 w-5 rounded-full shadow-sm transition-transform data-[state=checked]:translate-x-7 translate-x-1"
          style={{ background: isOn ? color : 'rgba(255,255,255,0.4)' }}
        />
      </SwitchPrimitive.Root>
      {widget.label && (
        <p className="text-xs text-muted-foreground text-center truncate w-full">{widget.label}</p>
      )}
      <p className="text-[10px]" style={{ color: isOn ? color : 'rgba(255,255,255,0.3)' }}>
        {isOn ? 'ON' : 'OFF'}
      </p>
      {error && (
        <div className="flex items-center gap-1 text-[10px] text-red-400 w-full px-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
}

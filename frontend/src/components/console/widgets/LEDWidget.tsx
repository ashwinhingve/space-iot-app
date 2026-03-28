'use client';

import { motion } from 'framer-motion';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function LEDWidget({ widget, liveValue }: Props) {
  const raw = liveValue?.rawValue;
  const onValue = widget.onValue;
  const isOn = raw === onValue || raw === true || raw === 1 || raw === 'on' || raw === 'ON' || raw === 'online';
  const trueColor  = widget.trueColor  ?? '#22c55e';
  const falseColor = widget.falseColor ?? '#ef4444';
  const color = isOn ? trueColor : falseColor;
  const hasData = liveValue !== undefined;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 select-none">
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        {isOn && (
          <motion.div
            className="absolute rounded-full"
            style={{ background: trueColor, opacity: 0.2 }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            initial={{ width: 40, height: 40 }}
          />
        )}
        {/* LED circle */}
        <motion.div
          className="rounded-full border-2"
          style={{
            width: 32,
            height: 32,
            background: hasData ? `${color}30` : 'rgba(255,255,255,0.05)',
            borderColor: hasData ? color : 'rgba(255,255,255,0.15)',
            boxShadow: isOn ? `0 0 14px ${trueColor}80, inset 0 0 6px ${trueColor}40` : 'none',
          }}
          animate={isOn ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Inner bright dot */}
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
          >
            <div
              className="rounded-full"
              style={{
                width: 12, height: 12,
                background: hasData ? color : 'rgba(255,255,255,0.15)',
                boxShadow: isOn ? `0 0 6px ${trueColor}` : 'none',
              }}
            />
          </div>
        </motion.div>
      </div>
      {widget.label && (
        <p className="text-xs text-muted-foreground text-center truncate w-full">{widget.label}</p>
      )}
      <p className="text-[10px] font-semibold" style={{ color: hasData ? color : 'rgba(255,255,255,0.2)' }}>
        {!hasData ? 'WAITING' : isOn ? 'ONLINE' : 'OFFLINE'}
      </p>
    </div>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function ValueWidget({ widget, liveValue }: Props) {
  const displayValue = liveValue?.displayValue ?? '--';
  const unit = widget.unit ?? widget.dataSource?.unit ?? '';
  const history = liveValue?.history ?? [];

  const trend = history.length >= 2
    ? history[history.length - 1].value - history[history.length - 2].value
    : 0;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-muted-foreground/40';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={String(displayValue)}
          initial={{ scale: 0.92, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="flex items-end gap-1 justify-center"
        >
          <span className="font-data font-bold leading-none" style={{
            fontSize: 'clamp(1.8rem, 5vw, 3rem)',
            color: widget.color || '#00e5ff',
          }}>
            {displayValue}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground mb-1">{unit}</span>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-1.5 mt-1">
        {history.length >= 2 && <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />}
        {widget.label && (
          <p className="text-xs text-muted-foreground truncate">{widget.label}</p>
        )}
      </div>
    </div>
  );
}

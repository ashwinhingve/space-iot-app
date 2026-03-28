'use client';

import { useState } from 'react';
import { Loader2, Zap, AlertCircle } from 'lucide-react';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';
import { sendWidgetControl } from './shared/sendControl';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function ButtonWidget({ widget, isEditMode }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const color = widget.color || '#00e5ff';

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const handleMouseDown = async () => {
    if (isEditMode || loading) return;
    setLoading(true);
    try {
      await sendWidgetControl(widget, widget.onPress?.pressValue ?? 1);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseUp = async () => {
    if (isEditMode || loading) return;
    const rv = widget.onPress?.releaseValue;
    if (rv !== undefined && rv !== null) {
      try {
        await sendWidgetControl(widget, rv);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Release failed');
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={isEditMode || loading}
        className="w-full flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border"
        style={{
          borderColor: `${color}60`,
          background: `${color}18`,
          color,
          boxShadow: loading ? `0 0 20px ${color}40` : 'none',
        }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {widget.label || 'Press'}
      </button>
      {error && (
        <div className="flex items-center gap-1 text-[10px] text-red-400 w-full px-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
}

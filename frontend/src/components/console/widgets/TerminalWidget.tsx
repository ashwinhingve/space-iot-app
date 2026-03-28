'use client';

import { useEffect, useRef } from 'react';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function TerminalWidget({ widget, liveValue }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const history = liveValue?.history ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-b-xl">
      {widget.label && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-muted-foreground/50 font-data">{widget.label}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 font-data text-[10px] leading-relaxed space-y-0.5"
        style={{ background: 'rgba(0,0,0,0.4)' }}>
        {history.length === 0 ? (
          <p className="text-muted-foreground/30 italic">Waiting for events…</p>
        ) : (
          history.map((h, i) => (
            <div key={i} className="flex gap-2 min-w-0">
              <span className="text-muted-foreground/40 shrink-0">
                {new Date(h.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-emerald-400/80 break-all"
                style={{ wordBreak: 'break-all' }}>
                {typeof h.value === 'number'
                  ? String(h.value)
                  : typeof (h as any).raw === 'string'
                    ? (h as any).raw
                    : JSON.stringify(h.value)}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

export function ChartWidget({ widget, liveValue }: Props) {
  const maxPoints = widget.chartMaxPoints ?? 50;
  const history = (liveValue?.history ?? []).slice(-maxPoints);
  const color = widget.color || '#00e5ff';
  const data = history.map(h => ({ time: h.timestamp, value: h.value }));

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
        <div className="text-xs text-muted-foreground/40">Waiting for data…</div>
        {widget.label && <p className="text-[10px] text-muted-foreground/30">{widget.label}</p>}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-2 pt-3 gap-1">
      {widget.label && (
        <p className="text-[10px] text-muted-foreground/60 truncate px-1 shrink-0">{widget.label}</p>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="time" hide tick={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0d1117', border: `1px solid ${color}40`, borderRadius: 8, fontSize: 11, padding: '4px 10px' }}
              labelFormatter={(ts) => new Date(ts as number).toLocaleTimeString()}
              formatter={(val: number) => [val.toFixed(2), widget.dataSource?.label || 'Value']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

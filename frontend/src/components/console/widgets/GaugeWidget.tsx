'use client';

import type { ConsoleWidget, WidgetLiveValue } from '@/store/slices/consoleSlice';

interface Props {
  widget: ConsoleWidget;
  liveValue?: WidgetLiveValue;
  isEditMode: boolean;
  onConfigOpen: (id: string) => void;
}

const R = 80;
const CX = 100;
const CY = 95;
const SWEEP = Math.PI; // 180°
const ARC_LEN = SWEEP * R;

function polarToXY(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

export function GaugeWidget({ widget, liveValue }: Props) {
  const min = widget.min ?? 0;
  const max = widget.max ?? 100;
  const rawNum = typeof liveValue?.displayValue === 'number'
    ? liveValue.displayValue
    : parseFloat(String(liveValue?.displayValue ?? min));
  const value = isNaN(rawNum) ? min : rawNum;
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));

  const startAngle = Math.PI;        // left (9 o'clock)
  const endAngle   = 2 * Math.PI;    // right (3 o'clock), travelling clockwise through bottom

  const activeEnd = startAngle + ratio * SWEEP;

  // Color zones
  let color = widget.color || '#00e5ff';
  if (widget.criticalThreshold !== undefined && value >= widget.criticalThreshold) color = '#ef4444';
  else if (widget.warningThreshold !== undefined && value >= widget.warningThreshold) color = '#f59e0b';

  const bgPath   = describeArc(CX, CY, R, startAngle, endAngle);
  const fgPath   = ratio > 0 ? describeArc(CX, CY, R, startAngle, activeEnd) : null;

  const unit = widget.unit || liveValue && '';
  const displayUnit = widget.unit ?? widget.dataSource?.unit ?? '';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 select-none">
      <svg viewBox="0 0 200 110" className="w-full" style={{ maxHeight: '90%' }}>
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
        {/* Value arc */}
        {fgPath && (
          <path d={fgPath} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        )}
        {/* Min / Max labels */}
        <text x="18" y="108" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">{min}</text>
        <text x="182" y="108" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">{max}</text>
        {/* Value text */}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>
          {liveValue ? (typeof value === 'number' ? value.toFixed(typeof value === 'number' && value % 1 !== 0 ? 1 : 0) : value) : '--'}
        </text>
        {displayUnit && (
          <text x={CX} y={CY + 8} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.45)">{displayUnit}</text>
        )}
      </svg>
      {widget.label && (
        <p className="text-xs text-muted-foreground text-center truncate w-full mt-1 px-1">{widget.label}</p>
      )}
    </div>
  );
}

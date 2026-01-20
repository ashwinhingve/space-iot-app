'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Droplet, AlertTriangle } from 'lucide-react';

interface ValveState {
  valveNumber: number;
  status: 'ON' | 'OFF' | 'FAULT';
  mode: 'AUTO' | 'MANUAL';
  cycleCount: number;
}

interface ManifoldDiagramProps {
  valves: ValveState[];
  manifoldName: string;
  isOnline: boolean;
}

export const ManifoldDiagram: React.FC<ManifoldDiagramProps> = ({
  valves,
  manifoldName,
  isOnline,
}) => {
  const getValveColor = (status: string) => {
    switch (status) {
      case 'ON':
        return '#10b981'; // emerald-500
      case 'FAULT':
        return '#ef4444'; // red-500
      default:
        return '#64748b'; // slate-500
    }
  };

  const getValveStrokeColor = (status: string) => {
    switch (status) {
      case 'ON':
        return '#059669'; // emerald-600
      case 'FAULT':
        return '#dc2626'; // red-600
      default:
        return '#475569'; // slate-600
    }
  };

  // Sort valves by valve number
  const sortedValves = [...valves].sort((a, b) => a.valveNumber - b.valveNumber);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Droplet className="h-5 w-5 text-brand-600" />
          System Diagram
        </h3>
        <Badge variant={isOnline ? 'default' : 'secondary'} className={isOnline ? 'bg-emerald-500' : ''}>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <svg
        viewBox="0 0 800 600"
        className="w-full h-auto bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-xl border border-border/50 p-4"
        style={{ maxHeight: '500px' }}
      >
        {/* Title */}
        <text x="400" y="30" textAnchor="middle" className="fill-foreground font-semibold text-base">
          {manifoldName}
        </text>
        <text x="400" y="50" textAnchor="middle" className="fill-muted-foreground text-xs">
          MANIFOLD-27 | 4&quot; Inlet → 4 Valves → 2&quot; Outlets
        </text>

        {/* 4" Inlet Pipe */}
        <rect x="50" y="200" width="100" height="60" rx="4" className="fill-slate-400 stroke-slate-600" strokeWidth="2" />
        <text x="100" y="235" textAnchor="middle" className="fill-white text-xs font-semibold">
          4&quot; INLET
        </text>

        {/* Inlet Flow Animation */}
        {isOnline && (
          <motion.circle
            cx="50"
            cy="230"
            r="4"
            className="fill-blue-400"
            animate={{ cx: [50, 150] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Main Inlet Arrow */}
        <line x1="20" y1="230" x2="50" y2="230" className="stroke-slate-600" strokeWidth="3" />
        <polygon points="20,230 30,225 30,235" className="fill-slate-600" />

        {/* Connection to Butterfly Valve */}
        <line x1="150" y1="230" x2="190" y2="230" className="stroke-slate-600" strokeWidth="3" />

        {/* Butterfly Valve */}
        <circle cx="210" cy="230" r="25" className="fill-slate-300 stroke-slate-600" strokeWidth="2" />
        <rect x="205" y="210" width="10" height="40" rx="2" className="fill-slate-600" />
        <text x="210" y="275" textAnchor="middle" className="fill-muted-foreground text-xs">
          Butterfly
        </text>

        {/* Connection to ARV */}
        <line x1="235" y1="230" x2="275" y2="230" className="stroke-slate-600" strokeWidth="3" />

        {/* ARV (Air Release Valve) */}
        <rect x="275" y="215" width="30" height="30" rx="4" className="fill-amber-400 stroke-amber-600" strokeWidth="2" />
        <line x1="290" y1="215" x2="290" y2="195" className="stroke-amber-600" strokeWidth="2" />
        <circle cx="290" cy="190" r="5" className="fill-amber-300 stroke-amber-600" strokeWidth="1" />
        <text x="290" y="265" textAnchor="middle" className="fill-muted-foreground text-xs">
          ARV
        </text>

        {/* Connection to Filter */}
        <line x1="305" y1="230" x2="340" y2="230" className="stroke-slate-600" strokeWidth="3" />

        {/* Filter Section (SASF) */}
        <rect x="340" y="210" width="50" height="40" rx="4" className="fill-blue-300 stroke-blue-600" strokeWidth="2" />
        <line x1="350" y1="220" x2="350" y2="240" className="stroke-blue-600" strokeWidth="1" />
        <line x1="365" y1="220" x2="365" y2="240" className="stroke-blue-600" strokeWidth="1" />
        <line x1="380" y1="220" x2="380" y2="240" className="stroke-blue-600" strokeWidth="1" />
        <text x="365" y="270" textAnchor="middle" className="fill-muted-foreground text-xs">
          SASF Filter
        </text>

        {/* Connection to PDPC Valve */}
        <line x1="390" y1="230" x2="430" y2="230" className="stroke-slate-600" strokeWidth="3" />

        {/* PDPC Valve (Pressure Differential Pressure Control) */}
        <circle cx="450" cy="230" r="25" className="fill-purple-300 stroke-purple-600" strokeWidth="2" />
        <text x="450" y="235" textAnchor="middle" className="fill-purple-900 text-xs font-bold">
          P
        </text>
        <text x="450" y="275" textAnchor="middle" className="fill-muted-foreground text-xs">
          PDPC
        </text>

        {/* Connection to Manifold Distribution */}
        <line x1="475" y1="230" x2="520" y2="230" className="stroke-slate-600" strokeWidth="3" />

        {/* Manifold Body */}
        <rect x="520" y="150" width="80" height="160" rx="8" className="fill-slate-200 stroke-slate-700" strokeWidth="3" />
        <text x="560" y="175" textAnchor="middle" className="fill-slate-700 text-xs font-bold">
          MANIFOLD
        </text>
        <text x="560" y="190" textAnchor="middle" className="fill-slate-600 text-xs">
          4-VALVE
        </text>

        {/* Valve Bank - 4 Valves */}
        {sortedValves.map((valve, index) => {
          const yPos = 210 + index * 35;
          const color = getValveColor(valve.status);
          const strokeColor = getValveStrokeColor(valve.status);
          const isOn = valve.status === 'ON';

          return (
            <g key={valve.valveNumber}>
              {/* Valve Outlet from Manifold */}
              <line x1="600" y1={yPos} x2="630" y2={yPos} className="stroke-slate-600" strokeWidth="2" />

              {/* Valve Body */}
              <motion.rect
                x="630"
                y={yPos - 12}
                width="30"
                height="24"
                rx="4"
                fill={color}
                stroke={strokeColor}
                strokeWidth="2"
                animate={isOn ? { opacity: [1, 0.7, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              {/* Valve Number */}
              <text x="645" y={yPos + 4} textAnchor="middle" className="fill-white text-xs font-bold">
                V{valve.valveNumber}
              </text>

              {/* Status Indicator */}
              <motion.circle
                cx="670"
                cy={yPos}
                r="6"
                fill={color}
                stroke={strokeColor}
                strokeWidth="1"
                animate={isOn ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              {/* Fault Indicator */}
              {valve.status === 'FAULT' && (
                <g>
                  <circle cx="685" cy={yPos} r="8" className="fill-red-500/20" />
                  <text x="685" y={yPos + 3} textAnchor="middle" className="fill-red-600 text-xs font-bold">
                    !
                  </text>
                </g>
              )}

              {/* Outlet Pipe to 2" Connection */}
              <line x1="660" y1={yPos} x2="700" y2={yPos} stroke={color} strokeWidth="3" />

              {/* Flow Animation when ON */}
              {isOn && isOnline && (
                <motion.circle
                  cx="660"
                  cy={yPos}
                  r="3"
                  fill={color}
                  animate={{ cx: [660, 700] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              )}

              {/* 2" Outlet */}
              <rect x="700" y={yPos - 10} width="50" height="20" rx="3" fill={color} stroke={strokeColor} strokeWidth="2" />
              <text x="725" y={yPos + 4} textAnchor="middle" className="fill-white text-xs font-semibold">
                2&quot; OUT
              </text>

              {/* Mode Badge */}
              <text x="765" y={yPos + 4} textAnchor="start" className="fill-muted-foreground text-xs">
                {valve.mode}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(50, 480)">
          <text x="0" y="0" className="fill-foreground text-xs font-semibold">
            Legend:
          </text>

          {/* ON Status */}
          <circle cx="10" cy="20" r="6" className="fill-emerald-500 stroke-emerald-600" strokeWidth="1" />
          <text x="25" y="24" className="fill-muted-foreground text-xs">
            Valve ON
          </text>

          {/* OFF Status */}
          <circle cx="110" cy="20" r="6" className="fill-slate-500 stroke-slate-600" strokeWidth="1" />
          <text x="125" y="24" className="fill-muted-foreground text-xs">
            Valve OFF
          </text>

          {/* FAULT Status */}
          <circle cx="220" cy="20" r="6" className="fill-red-500 stroke-red-600" strokeWidth="1" />
          <text x="235" y="24" className="fill-muted-foreground text-xs">
            Valve FAULT
          </text>

          {/* Flow Indicator */}
          <circle cx="340" cy="20" r="4" className="fill-blue-400" />
          <text x="355" y="24" className="fill-muted-foreground text-xs">
            Flow Direction
          </text>
        </g>

        {/* System Statistics */}
        <g transform="translate(550, 480)">
          <text x="0" y="0" className="fill-foreground text-xs font-semibold">
            Active: {sortedValves.filter((v) => v.status === 'ON').length}/{sortedValves.length}
          </text>
          <text x="0" y="20" className="fill-muted-foreground text-xs">
            Total Cycles: {sortedValves.reduce((sum, v) => sum + v.cycleCount, 0).toLocaleString()}
          </text>
        </g>

        {/* Offline Overlay */}
        {!isOnline && (
          <g>
            <rect x="0" y="0" width="800" height="600" className="fill-black/10" />
            <text x="400" y="300" textAnchor="middle" className="fill-red-600 text-2xl font-bold">
              SYSTEM OFFLINE
            </text>
          </g>
        )}
      </svg>

      {/* Component Notes */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
          <h4 className="font-semibold mb-2 flex items-center gap-1">
            <Droplet className="h-3 w-3" />
            Inlet Section
          </h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 4&quot; Inlet with Butterfly Valve</li>
            <li>• ARV (Air Release Valve)</li>
            <li>• SASF Sand Filter</li>
            <li>• PDPC Pressure Control</li>
          </ul>
        </div>
        <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
          <h4 className="font-semibold mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Valve Bank
          </h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 4 Solenoid Valves (ESP32 Controlled)</li>
            <li>• Individual 2&quot; Outlets</li>
            <li>• AUTO/MANUAL Mode per Valve</li>
            <li>• Real-time Status Monitoring</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

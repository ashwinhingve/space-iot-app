'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import AnimatedBackground from '@/components/AnimatedBackground';
import { Monitor, ArrowLeft, Power, RotateCcw, Activity, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useManifoldSimulation, getPressureColor } from '@/hooks/useManifoldSimulation';

const Manifold3DViewer = dynamic(
  () => import('@/components/Manifold3DViewer').then(mod => mod.Manifold3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Loading 3D Engine...</span>
        </div>
      </div>
    ),
  }
);

function PressureDot({ pressure }: { pressure: number }) {
  const color = getPressureColor(pressure);
  const cls =
    color === 'green'
      ? 'bg-green-500 shadow-green-500/50'
      : color === 'yellow'
        ? 'bg-yellow-500 shadow-yellow-500/50'
        : 'bg-red-500 shadow-red-500/50';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-lg ${cls}`} />;
}

export default function ScadaPage() {
  const sim = useManifoldSimulation();

  const chartData = useMemo(() => sim.timeSeries, [sim.timeSeries]);

  return (
    <MainLayout>
      <div className="relative min-h-screen">
        <AnimatedBackground variant="subtle" showParticles={true} showGradientOrbs={true} />

        <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-40" />
                  <div className="relative p-2.5 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                    <Monitor className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                    Manifold SCADA
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    MANIFOLD-27 Interactive Control System
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {sim.pressures.inlet.toFixed(0)} PSI Inlet
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {sim.totalFlow.toFixed(1)} LPS Total
                </span>
              </div>
            </div>
          </motion.div>

          {/* 3D Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6"
          >
            <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: 500 }}>
              <Manifold3DViewer
                valves={sim.valves}
                ptfcOn={sim.ptfcOn}
                sasfOn={sim.sasfOn}
                pressures={sim.pressures}
                flowRates={sim.flowRates}
                maxPressure={sim.maxPressure}
                isOnline={sim.isOnline}
                onValveClick={sim.toggleValve}
                onPTFCClick={sim.togglePTFC}
                onSASFClick={sim.toggleSASF}
              />
            </div>
          </motion.div>

          {/* Dashboard Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left Column */}
            <div className="space-y-6">
              {/* Valve Status Panel */}
              <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Power className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-foreground">Device Status</h3>
                </div>

                <div className="space-y-3">
                  {/* Valve rows */}
                  {sim.valves.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50">
                      <div className="flex items-center gap-3">
                        <PressureDot pressure={v.pressure} />
                        <span className="text-sm font-medium text-foreground">{v.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {v.pressure.toFixed(1)} PSI
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${v.isOpen ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {v.isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                        <button
                          onClick={() => sim.toggleValve(v.id)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            v.isOpen
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                          }`}
                        >
                          {v.isOpen ? 'Close' : 'Open'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* PTFC */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      <PressureDot pressure={sim.pressures.distribution} />
                      <span className="text-sm font-medium text-foreground">PTFC</span>
                      <span className="text-xs text-muted-foreground">
                        {sim.pressures.distribution.toFixed(1)} PSI
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${sim.ptfcOn ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {sim.ptfcOn ? 'REGULATING' : 'BYPASS'}
                      </span>
                      <button
                        onClick={sim.togglePTFC}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          sim.ptfcOn
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                        }`}
                      >
                        {sim.ptfcOn ? 'Bypass' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  {/* SASF */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      <PressureDot pressure={sim.pressures.postFilter} />
                      <span className="text-sm font-medium text-foreground">SASF</span>
                      <span className="text-xs text-muted-foreground">
                        {sim.pressures.postFilter.toFixed(1)} PSI
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${sim.sasfOn ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        {sim.sasfOn ? 'ACTIVE' : 'BYPASS'}
                      </span>
                      <button
                        onClick={sim.toggleSASF}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          sim.sasfOn
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                        }`}
                      >
                        {sim.sasfOn ? 'Bypass' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Panel */}
              <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-foreground">Controls</h3>
                </div>

                <div className="space-y-4">
                  {/* Target Pressure */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Target Pressure</span>
                      <span className="text-sm font-bold text-foreground">{sim.targetPressure} PSI</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sim.targetPressure}
                      onChange={(e) => sim.setTargetPressure(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0 PSI</span>
                      <span>100 PSI</span>
                    </div>
                  </div>

                  {/* System Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-background/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Inlet</p>
                      <p className="text-lg font-bold text-foreground">{sim.pressures.inlet.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">PSI</p>
                    </div>
                    <div className="rounded-lg bg-background/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Distribution</p>
                      <p className="text-lg font-bold text-foreground">{sim.pressures.distribution.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">PSI</p>
                    </div>
                    <div className="rounded-lg bg-background/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Flow</p>
                      <p className="text-lg font-bold text-foreground">{sim.totalFlow.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">LPS</p>
                    </div>
                  </div>

                  {/* Reset */}
                  <button
                    onClick={sim.resetAll}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium border border-red-500/20"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset All
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Pressure Chart */}
              <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-foreground">Pressure History</h3>
                </div>

                <div className="h-[280px]">
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          label={{ value: 'PSI', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15,23,42,0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                          itemStyle={{ color: '#e2e8f0' }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                        />
                        <Line type="monotone" dataKey="inlet" stroke="#3b82f6" strokeWidth={2} dot={false} name="Inlet" />
                        <Line type="monotone" dataKey="postFilter" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Post-Filter" />
                        <Line type="monotone" dataKey="distribution" stroke="#06b6d4" strokeWidth={2} dot={false} name="Distribution" />
                        <Line type="monotone" dataKey="outlet1" stroke="#22c55e" strokeWidth={1} dot={false} name="V1" strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="outlet2" stroke="#eab308" strokeWidth={1} dot={false} name="V2" strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="outlet3" stroke="#f97316" strokeWidth={1} dot={false} name="V3" strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="outlet4" stroke="#ef4444" strokeWidth={1} dot={false} name="V4" strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Collecting data...
                    </div>
                  )}
                </div>
              </div>

              {/* Flow Visualization */}
              <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Droplets className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-foreground">Flow Distribution</h3>
                </div>

                <div className="space-y-3">
                  {sim.valves.map((v, i) => {
                    const maxFlow = 3.0;
                    const pct = Math.min(100, (v.flowRate / maxFlow) * 100);
                    const barColor = v.isOpen
                      ? pct > 80
                        ? 'bg-red-500'
                        : pct > 50
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      : 'bg-slate-600';

                    return (
                      <div key={v.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{v.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {v.flowRate.toFixed(2)} LPS
                          </span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Total flow */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">Total Flow</span>
                      <span className="text-xs font-bold text-cyan-400">
                        {sim.totalFlow.toFixed(2)} LPS
                      </span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${Math.min(100, (sim.totalFlow / 12) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}

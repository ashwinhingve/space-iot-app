'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ValveState {
  id: number;
  label: string;
  isOpen: boolean;
  pressure: number;
  flowRate: number;
}

export interface PressureReadings {
  inlet: number;
  postFilter: number;
  distribution: number;
  outlets: number[];
}

export interface TimeSeriesPoint {
  time: number;
  inlet: number;
  postFilter: number;
  distribution: number;
  outlet1: number;
  outlet2: number;
  outlet3: number;
  outlet4: number;
}

export interface ManifoldSimulation {
  valves: ValveState[];
  ptfcOn: boolean;
  sasfOn: boolean;
  pressures: PressureReadings;
  flowRates: number[];
  totalFlow: number;
  targetPressure: number;
  maxPressure: number;
  timeSeries: TimeSeriesPoint[];
  isOnline: boolean;
  toggleValve: (id: number) => void;
  setTargetPressure: (psi: number) => void;
  togglePTFC: () => void;
  toggleSASF: () => void;
  resetAll: () => void;
}

const MAX_PRESSURE = 100;
const MAX_HISTORY = 60;
const TICK_INTERVAL = 500;
const MAX_FLOW_PER_VALVE = 3.0;

function getPressureColor(pressure: number): 'green' | 'yellow' | 'red' {
  if (pressure < 40) return 'green';
  if (pressure < 70) return 'yellow';
  return 'red';
}

export { getPressureColor };

export function useManifoldSimulation(): ManifoldSimulation {
  const [valves, setValves] = useState<ValveState[]>([
    { id: 1, label: 'V1', isOpen: false, pressure: 0, flowRate: 0 },
    { id: 2, label: 'V2', isOpen: false, pressure: 0, flowRate: 0 },
    { id: 3, label: 'V3', isOpen: false, pressure: 0, flowRate: 0 },
    { id: 4, label: 'V4', isOpen: false, pressure: 0, flowRate: 0 },
  ]);
  const [ptfcOn, setPtfcOn] = useState(true);
  const [sasfOn, setSasfOn] = useState(true);
  const [targetPressure, setTargetPressure] = useState(50);
  const [pressures, setPressures] = useState<PressureReadings>({
    inlet: 50,
    postFilter: 47,
    distribution: 45,
    outlets: [0, 0, 0, 0],
  });
  const [flowRates, setFlowRates] = useState([0, 0, 0, 0]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const tickRef = useRef(0);

  const toggleValve = useCallback((id: number) => {
    setValves(prev => prev.map(v =>
      v.id === id ? { ...v, isOpen: !v.isOpen } : v
    ));
  }, []);

  const togglePTFC = useCallback(() => setPtfcOn(prev => !prev), []);
  const toggleSASF = useCallback(() => setSasfOn(prev => !prev), []);

  const handleSetTargetPressure = useCallback((psi: number) => {
    setTargetPressure(Math.max(0, Math.min(MAX_PRESSURE, psi)));
  }, []);

  const resetAll = useCallback(() => {
    setValves(prev => prev.map(v => ({ ...v, isOpen: false, pressure: 0, flowRate: 0 })));
    setPtfcOn(true);
    setSasfOn(true);
    setTargetPressure(50);
  }, []);

  // Simulation tick
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;

      setValves(prevValves => {
        // Calculate pressures
        const noise = (Math.random() - 0.5) * 4;
        const inlet = Math.max(0, Math.min(MAX_PRESSURE, targetPressure + noise));

        const sasfDrop = sasfOn ? 3 + Math.random() * 2 : 0;
        const postFilter = Math.max(0, inlet - sasfDrop);

        // PTFC regulates toward target
        const ptfcRegulation = ptfcOn
          ? (postFilter - targetPressure) * 0.5
          : 0;
        const distribution = Math.max(0, postFilter - ptfcRegulation);

        const openCount = prevValves.filter(v => v.isOpen).length;
        const pressureDivision = openCount > 0 ? openCount * 2 : 0;

        const newValves = prevValves.map(v => {
          let outletPressure: number;
          let flow: number;

          if (v.isOpen) {
            const valveDrop = 3 + pressureDivision;
            outletPressure = Math.max(0, distribution - valveDrop);
            const delta = distribution - outletPressure;
            flow = Math.min(MAX_FLOW_PER_VALVE, (delta / 20) * MAX_FLOW_PER_VALVE);
            // Add small noise
            flow = Math.max(0, flow + (Math.random() - 0.5) * 0.2);
          } else {
            // Pressure builds toward distribution when closed
            outletPressure = v.pressure + (distribution - v.pressure) * 0.1;
            flow = Math.max(0, v.flowRate * 0.7);
            if (flow < 0.01) flow = 0;
          }

          return { ...v, pressure: outletPressure, flowRate: flow };
        });

        const outletPressures = newValves.map(v => v.pressure);
        const newFlowRates = newValves.map(v => v.flowRate);

        setPressures({
          inlet,
          postFilter,
          distribution,
          outlets: outletPressures,
        });
        setFlowRates(newFlowRates);

        setTimeSeries(prev => {
          const point: TimeSeriesPoint = {
            time: tickRef.current,
            inlet: Math.round(inlet * 10) / 10,
            postFilter: Math.round(postFilter * 10) / 10,
            distribution: Math.round(distribution * 10) / 10,
            outlet1: Math.round(outletPressures[0] * 10) / 10,
            outlet2: Math.round(outletPressures[1] * 10) / 10,
            outlet3: Math.round(outletPressures[2] * 10) / 10,
            outlet4: Math.round(outletPressures[3] * 10) / 10,
          };
          const next = [...prev, point];
          if (next.length > MAX_HISTORY) next.shift();
          return next;
        });

        return newValves;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [targetPressure, ptfcOn, sasfOn]);

  const totalFlow = flowRates.reduce((sum, r) => sum + r, 0);

  return {
    valves,
    ptfcOn,
    sasfOn,
    pressures,
    flowRates,
    totalFlow,
    targetPressure,
    maxPressure: MAX_PRESSURE,
    timeSeries,
    isOnline: true,
    toggleValve,
    setTargetPressure: handleSetTargetPressure,
    togglePTFC,
    toggleSASF,
    resetAll,
  };
}

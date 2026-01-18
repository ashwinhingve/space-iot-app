'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ValveState {
  valveNumber: number;
  status: 'ON' | 'OFF' | 'FAULT';
  mode: 'AUTO' | 'MANUAL';
  cycleCount: number;
}

interface Manifold3DWrapperProps {
  valves: ValveState[];
  manifoldName: string;
  isOnline: boolean;
  onValveClick?: (valveNumber: number) => void;
}

export function Manifold3DWrapper(props: Manifold3DWrapperProps) {
  const [Component, setComponent] = useState<React.ComponentType<Manifold3DWrapperProps> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Delay import to ensure we're fully on the client
    const loadComponent = async () => {
      try {
        const mod = await import('./Manifold3DViewer');
        if (mounted) {
          setComponent(() => mod.Manifold3DViewer);
        }
      } catch (err) {
        console.error('Failed to load 3D viewer:', err);
        if (mounted) {
          setError('Failed to load 3D viewer. Please refresh the page.');
        }
      }
    };

    // Use requestAnimationFrame to ensure we're in browser context
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        loadComponent();
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="text-white/60 text-sm">Loading 3D Engine...</span>
        </div>
      </div>
    );
  }

  return <Component {...props} />;
}

export default Manifold3DWrapper;

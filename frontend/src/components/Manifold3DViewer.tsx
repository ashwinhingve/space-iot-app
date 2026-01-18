'use client';

import React, { useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';

// Types
interface ValveState {
  valveNumber: number;
  status: 'ON' | 'OFF' | 'FAULT';
  mode: 'AUTO' | 'MANUAL';
  cycleCount: number;
}

interface Manifold3DViewerProps {
  valves: ValveState[];
  manifoldName: string;
  isOnline: boolean;
  onValveClick?: (valveNumber: number) => void;
}

// Color constants
const COLORS = {
  copper: '#B87333',
  copperDark: '#8B5A2B',
  steel: '#4A5568',
  steelLight: '#718096',
  steelDark: '#2D3748',
  pipe: '#1F2937',
  pipeLight: '#374151',
  green: '#10B981',
  greenDark: '#059669',
  blue: '#3B82F6',
  blueDark: '#1D4ED8',
  blueLight: '#60A5FA',
  filter: '#6B7280',
  filterDark: '#4B5563',
  valveOn: '#10B981',
  valveOff: '#64748B',
  valveFault: '#EF4444',
  actuatorBlue: '#2563EB',
  actuatorBlueDark: '#1E40AF',
  flow: '#60A5FA',
};

// Inner 3D components
interface PipeProps {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color?: string;
}

const Pipe: React.FC<PipeProps> = ({ start, end, radius, color = COLORS.pipe }) => {
  const { midPoint, quaternion, length } = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const direction = endVec.clone().sub(startVec);
    const len = direction.length();
    const mid = startVec.clone().add(direction.clone().multiplyScalar(0.5));
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, direction.clone().normalize());
    return { midPoint: mid, quaternion: q, length: len };
  }, [start, end]);

  return (
    <mesh position={midPoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 32]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
};

// Butterfly Valve component
const ButterflyValve: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.12, 0.12, 0.15, 32]} />
        <meshStandardMaterial color={COLORS.copper} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 32]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.02, 32]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 16]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.22, 0, 0]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
};

// ARV (Air Release Valve) component
const ARV: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.25, 32]} />
        <meshStandardMaterial color={COLORS.copper} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0.06, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
        <meshStandardMaterial color={COLORS.steelDark} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

// Ball Valve component
const BallValve: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.06, 32, 32]} />
        <meshStandardMaterial color={COLORS.copper} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.02, 0.1, 0.015]} />
        <meshStandardMaterial color={COLORS.copperDark} metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
};

// SASF Filter component
const SASFFilter: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 32]} />
        <meshStandardMaterial color={COLORS.filter} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.filterDark} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.04, 0.03, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.06, 16]} />
        <meshStandardMaterial color={COLORS.green} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.122, 0.122, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.steelLight} metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
};

// Grooved Coupling component
const GroovedCoupling: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
}> = ({ position, rotation = [0, 0, 0], radius }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <torusGeometry args={[radius * 1.2, radius * 0.3, 16, 32]} />
        <meshStandardMaterial color={COLORS.steelLight} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Reducer component (4" to 2")
const Reducer: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.08, 0.1, 32]} />
        <meshStandardMaterial color={COLORS.green} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <torusGeometry args={[0.085, 0.015, 8, 32]} />
        <meshStandardMaterial color={COLORS.greenDark} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <torusGeometry args={[0.045, 0.01, 8, 32]} />
        <meshStandardMaterial color={COLORS.greenDark} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Elbow component
const GroovedElbow: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
}> = ({ position, rotation = [0, 0, 0], radius }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <torusGeometry args={[radius * 2, radius, 16, 16, Math.PI / 2]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Electric Valve with Actuator component
const ElectricValve: React.FC<{
  position: [number, number, number];
  valveNumber: number;
  status: 'ON' | 'OFF' | 'FAULT';
  isOnline: boolean;
  onClick?: () => void;
  scale?: number;
}> = ({ position, valveNumber, status, isOnline, onClick, scale = 1 }) => {
  const [hovered, setHovered] = useState(false);
  const statusColor = status === 'ON' ? COLORS.valveOn : status === 'FAULT' ? COLORS.valveFault : COLORS.valveOff;

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.();
  }, [onClick]);

  return (
    <group
      position={position}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Valve body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Electric Actuator (blue box on top) */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.08]} />
        <meshStandardMaterial
          color={hovered ? COLORS.blueLight : COLORS.actuatorBlue}
          metalness={0.4}
          roughness={0.5}
          emissive={status === 'ON' ? COLORS.valveOn : status === 'FAULT' ? COLORS.valveFault : '#000000'}
          emissiveIntensity={status === 'ON' || status === 'FAULT' ? 0.3 : 0}
        />
      </mesh>

      {/* Actuator top cap */}
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.06]} />
        <meshStandardMaterial color={COLORS.actuatorBlueDark} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Status LED */}
      <mesh position={[0.055, 0.12, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isOnline ? 1 : 0.2}
        />
      </mesh>

      {/* Inlet/Outlet pipes */}
      <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
};

// Main Manifold Assembly
const ManifoldAssembly: React.FC<{
  valves: ValveState[];
  isOnline: boolean;
  onValveClick?: (valveNumber: number) => void;
}> = ({ valves, isOnline, onValveClick }) => {
  const sortedValves = useMemo(() =>
    [...valves].sort((a, b) => a.valveNumber - b.valveNumber),
    [valves]
  );

  return (
    <group position={[0, 0, 0]}>
      {/* === INLET SECTION (Vertical pipe on left) === */}
      <Pipe start={[0, -1.5, 0]} end={[0, 0.8, 0]} radius={0.08} color={COLORS.pipe} />
      <ButterflyValve position={[0, -1.2, 0]} scale={1.2} />

      {/* 4" Tee junction */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 32]} />
        <meshStandardMaterial color={COLORS.steelDark} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Vertical branch to ARV */}
      <Pipe start={[0, 0.1, 0]} end={[0, 0.5, 0]} radius={0.04} color={COLORS.pipe} />
      <BallValve position={[0, 0.55, 0]} scale={1} />
      <ARV position={[0, 0.75, 0]} scale={0.8} />

      {/* === HORIZONTAL SECTION TO FILTER === */}
      <Reducer position={[0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={1.2} />
      <Pipe start={[0.25, 0, 0]} end={[0.6, 0, 0]} radius={0.04} color={COLORS.pipe} />
      <SASFFilter position={[0.6, 0.2, 0]} scale={0.8} />

      {/* === HORIZONTAL PIPE TO PDFC AND MANIFOLD === */}
      <Pipe start={[0.6, 0.35, 0]} end={[0.6, 0.5, 0]} radius={0.04} color={COLORS.pipe} />
      <GroovedElbow position={[0.6, 0.5, 0]} rotation={[0, Math.PI, -Math.PI / 2]} radius={0.04} />
      <Pipe start={[0.68, 0.5, 0]} end={[1.0, 0.5, 0]} radius={0.04} color={COLORS.pipe} />

      {/* PDFC Valve */}
      <group position={[1.1, 0.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 32]} />
          <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.06, 0.06, 0.05]} />
          <meshStandardMaterial color={COLORS.actuatorBlue} metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      {/* === MAIN DISTRIBUTION MANIFOLD === */}
      <Pipe start={[1.2, 0.5, 0]} end={[3.2, 0.5, 0]} radius={0.05} color={COLORS.pipe} />

      {/* Grooved couplings along manifold */}
      <GroovedCoupling position={[1.4, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />
      <GroovedCoupling position={[2.0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />
      <GroovedCoupling position={[2.6, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />

      {/* End elbow */}
      <GroovedElbow position={[3.2, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.05} />
      <Pipe start={[3.2, 0.5, 0.1]} end={[3.2, 0.5, 0.4]} radius={0.05} color={COLORS.pipe} />

      {/* === 4 VALVE OUTLETS === */}
      {sortedValves.map((valve, index) => {
        const xPos = 1.5 + index * 0.5;
        const yPos = 0.5;

        return (
          <group key={valve.valveNumber}>
            {/* Tee connection */}
            <mesh position={[xPos, yPos, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.02, 32]} />
              <meshStandardMaterial color={COLORS.steelLight} metalness={0.7} roughness={0.2} />
            </mesh>

            {/* Vertical drop pipe */}
            <Pipe start={[xPos, yPos, 0]} end={[xPos, yPos - 0.25, 0]} radius={0.03} color={COLORS.pipe} />

            {/* Electric valve with actuator */}
            <ElectricValve
              position={[xPos, yPos - 0.35, 0]}
              valveNumber={valve.valveNumber}
              status={valve.status}
              isOnline={isOnline}
              onClick={() => onValveClick?.(valve.valveNumber)}
              scale={0.9}
            />

            {/* Outlet pipe */}
            <Pipe start={[xPos, yPos - 0.5, 0]} end={[xPos, yPos - 0.7, 0]} radius={0.03} color={COLORS.pipe} />

            {/* Outlet flange */}
            <mesh position={[xPos, yPos - 0.72, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.03, 32]} />
              <meshStandardMaterial
                color={valve.status === 'ON' ? COLORS.valveOn : COLORS.steelDark}
                metalness={0.6}
                roughness={0.3}
                emissive={valve.status === 'ON' ? COLORS.valveOn : '#000000'}
                emissiveIntensity={valve.status === 'ON' && isOnline ? 0.3 : 0}
              />
            </mesh>
          </group>
        );
      })}

      {/* Ground/Base plate */}
      <mesh position={[1.5, -1.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 2]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.2} roughness={0.8} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// Scene component with all Three.js elements
const Scene: React.FC<{
  valves: ValveState[];
  isOnline: boolean;
  onValveClick?: (valveNumber: number) => void;
  autoRotate: boolean;
}> = ({ valves, isOnline, onValveClick, autoRotate }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[3, 2, 4]} fov={45} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#60a5fa" />
      <Environment preset="city" />
      <ManifoldAssembly valves={valves} isOnline={isOnline} onValveClick={onValveClick} />
      <ContactShadows position={[1.5, -1.7, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={1}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={10}
        target={[1.5, 0, 0]}
      />
    </>
  );
};

// Inner canvas component that handles all 3D rendering
const Manifold3DCanvas: React.FC<{
  valves: ValveState[];
  isOnline: boolean;
  onValveClick?: (valveNumber: number) => void;
  autoRotate: boolean;
}> = ({ valves, isOnline, onValveClick, autoRotate }) => {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <Scene
          valves={valves}
          isOnline={isOnline}
          onValveClick={onValveClick}
          autoRotate={autoRotate}
        />
      </Suspense>
    </Canvas>
  );
};

// Main 3D Viewer Component - handles client-side only rendering
export const Manifold3DViewer: React.FC<Manifold3DViewerProps> = ({
  valves,
  manifoldName,
  isOnline,
  onValveClick,
}) => {
  const [autoRotate, setAutoRotate] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Initializing 3D Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            autoRotate
              ? 'bg-blue-500 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          {autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
        </button>
      </div>

      {/* Title overlay */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-white font-semibold text-lg">{manifoldName}</h3>
        <p className="text-white/60 text-xs">MANIFOLD-27 | 4&quot; Inlet → 4 Valves</p>
      </div>

      {/* Status overlay */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
        <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 text-white/70">
          Active: {valves.filter(v => v.status === 'ON').length}/{valves.length}
        </span>
      </div>

      {/* 3D Canvas */}
      <Manifold3DCanvas
        valves={valves}
        isOnline={isOnline}
        onValveClick={onValveClick}
        autoRotate={autoRotate}
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
        <p className="text-white/80 text-xs font-medium mb-2">Valve Status</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-white/60 text-xs">ON</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-white/60 text-xs">OFF</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-white/60 text-xs">FAULT</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/40 text-xs">
        Drag to rotate • Scroll to zoom • Click valve for details
      </div>
    </div>
  );
};

export default Manifold3DViewer;

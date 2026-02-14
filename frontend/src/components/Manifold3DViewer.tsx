'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { getPressureColor } from '@/hooks/useManifoldSimulation';
import type { ValveState, PressureReadings } from '@/hooks/useManifoldSimulation';

export interface Manifold3DViewerProps {
  valves: ValveState[];
  ptfcOn: boolean;
  sasfOn: boolean;
  pressures: PressureReadings;
  flowRates: number[];
  maxPressure: number;
  isOnline: boolean;
  onValveClick: (index: number) => void;
  onPTFCClick: () => void;
  onSASFClick: () => void;
}

const COLORS = {
  copper: '#B87333',
  copperDark: '#8B5A2B',
  steelLight: '#718096',
  steelDark: '#2D3748',
  pipe: '#1F2937',
  green: '#10B981',
  greenDark: '#059669',
  blueLight: '#60A5FA',
  filter: '#6B7280',
  filterDark: '#4B5563',
  valveOn: '#10B981',
  valveOff: '#64748B',
  actuatorBlue: '#2563EB',
  actuatorBlueDark: '#1E40AF',
  flow: '#60A5FA',
  pressureGreen: '#22c55e',
  pressureYellow: '#eab308',
  pressureRed: '#ef4444',
};

function getPressureHex(pressure: number): string {
  const c = getPressureColor(pressure);
  return c === 'green' ? COLORS.pressureGreen : c === 'yellow' ? COLORS.pressureYellow : COLORS.pressureRed;
}

// ===== Pipe =====
const Pipe: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color?: string;
}> = ({ start, end, radius, color = COLORS.pipe }) => {
  const geo = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = e.clone().sub(s);
    const len = dir.length();
    const mid = s.clone().add(dir.clone().multiplyScalar(0.5));
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { mid, q, len };
  }, [start, end]);

  return (
    <mesh position={geo.mid} quaternion={geo.q}>
      <cylinderGeometry args={[radius, radius, geo.len, 32]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
    </mesh>
  );
};

// ===== Pressure LED =====
const PressureLED: React.FC<{
  position: [number, number, number];
  pressure: number;
  size?: number;
}> = ({ position, pressure, size = 0.02 }) => {
  const hex = getPressureHex(pressure);
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={hex} emissive={hex} emissiveIntensity={1.5} />
    </mesh>
  );
};

// ===== Pressure Transmitter =====
const PressureTransmitter: React.FC<{
  position: [number, number, number];
  pressure: number;
}> = ({ position, pressure }) => (
  <group position={position}>
    <mesh>
      <cylinderGeometry args={[0.025, 0.03, 0.06, 16]} />
      <meshStandardMaterial color={COLORS.steelLight} metalness={0.7} roughness={0.3} />
    </mesh>
    <mesh position={[0, -0.04, 0]}>
      <cylinderGeometry args={[0.01, 0.01, 0.04, 8]} />
      <meshStandardMaterial color={COLORS.steelDark} metalness={0.8} roughness={0.2} />
    </mesh>
    <PressureLED position={[0, 0.04, 0]} pressure={pressure} size={0.012} />
  </group>
);

// ===== Butterfly Valve =====
const ButterflyValve: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1 }) => (
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

// ===== ARV =====
const ARV: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[0.05, 0.06, 0.25, 32]} />
      <meshStandardMaterial color={COLORS.copper} metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={COLORS.copperDark} metalness={0.6} roughness={0.3} />
    </mesh>
    <mesh>
      <cylinderGeometry args={[0.04, 0.04, 0.06, 32]} />
      <meshStandardMaterial color={COLORS.pipe} metalness={0.7} roughness={0.2} />
    </mesh>
  </group>
);

// ===== Ball Valve =====
const BallValve: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 1 }) => (
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

// ===== SASF Filter =====
const SASFFilter: React.FC<{
  position: [number, number, number];
  scale?: number;
  isActive: boolean;
  pressure: number;
  onClick?: () => void;
}> = ({ position, scale = 1, isActive, pressure, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      scale={scale}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 32]} />
        <meshStandardMaterial
          color={hovered ? '#7B8290' : COLORS.filter}
          metalness={0.5} roughness={0.4}
          emissive={isActive ? COLORS.green : '#000'}
          emissiveIntensity={isActive ? 0.15 : 0}
        />
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
      <PressureLED position={[0.13, 0.0, 0]} pressure={pressure} size={0.015} />
    </group>
  );
};

// ===== Grooved Coupling =====
const GroovedCoupling: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
}> = ({ position, rotation = [0, 0, 0], radius }) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <torusGeometry args={[radius * 1.2, radius * 0.3, 16, 32]} />
      <meshStandardMaterial color={COLORS.steelLight} metalness={0.7} roughness={0.3} />
    </mesh>
  </group>
);

// ===== Reducer =====
const Reducer: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
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

// ===== Grooved Elbow =====
const GroovedElbow: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
}> = ({ position, rotation = [0, 0, 0], radius }) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <torusGeometry args={[radius * 2, radius, 16, 16, Math.PI / 2]} />
      <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
    </mesh>
  </group>
);

// ===== PTFC Valve =====
const PTFCValve: React.FC<{
  position: [number, number, number];
  isOn: boolean;
  pressure: number;
  onClick?: () => void;
}> = ({ position, isOn, pressure, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <group
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.08, 0.08, 0.06]} />
        <meshStandardMaterial
          color={hovered ? COLORS.blueLight : COLORS.actuatorBlue}
          metalness={0.4} roughness={0.5}
          emissive={isOn ? COLORS.valveOn : '#000'}
          emissiveIntensity={isOn ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.04, 0.02, 0.03]} />
        <meshStandardMaterial color={COLORS.actuatorBlueDark} metalness={0.5} roughness={0.4} />
      </mesh>
      <PressureLED position={[0.045, 0.06, 0]} pressure={pressure} size={0.01} />
    </group>
  );
};

// ===== Flow Particles =====
const FlowParticles: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  active: boolean;
  flowRate: number;
}> = ({ start, end, active, flowRate }) => {
  const count = 8;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useRef(Array.from({ length: count }, (_, i) => i / count));

  useFrame((_, delta) => {
    if (!active) return;
    const speed = 0.3 + flowRate * 0.3;
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    offsets.current = offsets.current.map(o => (o + delta * speed) % 1);
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.lerpVectors(s, e, offsets.current[i]);
    });
  });

  if (!active) return null;

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={el => { refs.current[i] = el; }}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color={COLORS.flow} emissive={COLORS.flow} emissiveIntensity={2} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// ===== Electric Valve =====
const ElectricValve: React.FC<{
  position: [number, number, number];
  isOpen: boolean;
  pressure: number;
  isOnline: boolean;
  onClick?: () => void;
  scale?: number;
}> = ({ position, isOpen, pressure, isOnline, onClick, scale = 1 }) => {
  const [hovered, setHovered] = useState(false);
  const statusColor = isOpen ? COLORS.valveOn : COLORS.valveOff;

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.();
  }, [onClick]);

  return (
    <group position={position} scale={scale} onClick={handleClick}
      onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.pipe} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.08]} />
        <meshStandardMaterial
          color={hovered ? COLORS.blueLight : COLORS.actuatorBlue}
          metalness={0.4} roughness={0.5}
          emissive={isOpen ? COLORS.valveOn : '#000000'}
          emissiveIntensity={isOpen ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.06]} />
        <meshStandardMaterial color={COLORS.actuatorBlueDark} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.055, 0.12, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={isOnline ? 1 : 0.2} />
      </mesh>
      <PressureLED position={[-0.055, 0.12, 0]} pressure={pressure} size={0.01} />
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

// ===== Main Manifold Assembly =====
const ManifoldAssembly: React.FC<{
  valves: ValveState[];
  ptfcOn: boolean;
  sasfOn: boolean;
  pressures: PressureReadings;
  flowRates: number[];
  isOnline: boolean;
  onValveClick: (id: number) => void;
  onPTFCClick: () => void;
  onSASFClick: () => void;
}> = ({ valves, ptfcOn, sasfOn, pressures, flowRates, isOnline, onValveClick, onPTFCClick, onSASFClick }) => {
  const anyFlowing = flowRates.some(f => f > 0.01);
  const totalFlow = flowRates.reduce((s, f) => s + f, 0);

  return (
    <group>
      {/* INLET */}
      <Pipe start={[0, -1.5, 0]} end={[0, 0.8, 0]} radius={0.08} />
      <ButterflyValve position={[0, -1.2, 0]} scale={1.2} />
      <PressureTransmitter position={[-0.15, -0.5, 0]} pressure={pressures.inlet} />
      <FlowParticles start={[0, -1.5, 0]} end={[0, 0, 0]} active={anyFlowing} flowRate={totalFlow} />

      {/* 4" Tee */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.15, 32]} />
        <meshStandardMaterial color={COLORS.steelDark} metalness={0.6} roughness={0.3}
          emissive={anyFlowing ? COLORS.flow : '#000'} emissiveIntensity={anyFlowing ? 0.15 : 0}
        />
      </mesh>

      {/* ARV branch */}
      <Pipe start={[0, 0.1, 0]} end={[0, 0.5, 0]} radius={0.04} />
      <BallValve position={[0, 0.55, 0]} />
      <ARV position={[0, 0.75, 0]} scale={0.8} />

      {/* Horizontal to filter */}
      <Reducer position={[0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={1.2} />
      <Pipe start={[0.25, 0, 0]} end={[0.6, 0, 0]} radius={0.04} />
      <FlowParticles start={[0.15, 0, 0]} end={[0.6, 0, 0]} active={anyFlowing} flowRate={totalFlow} />

      {/* SASF Filter */}
      <SASFFilter position={[0.6, 0.2, 0]} scale={0.8} isActive={sasfOn}
        pressure={pressures.postFilter} onClick={onSASFClick}
      />
      <PressureTransmitter position={[0.85, 0.2, 0]} pressure={pressures.postFilter} />

      {/* Horizontal to PTFC */}
      <Pipe start={[0.6, 0.35, 0]} end={[0.6, 0.5, 0]} radius={0.04} />
      <GroovedElbow position={[0.6, 0.5, 0]} rotation={[0, Math.PI, -Math.PI / 2]} radius={0.04} />
      <Pipe start={[0.68, 0.5, 0]} end={[1.0, 0.5, 0]} radius={0.04} />

      {/* PTFC Valve */}
      <PTFCValve position={[1.1, 0.5, 0]} isOn={ptfcOn} pressure={pressures.distribution} onClick={onPTFCClick} />
      <PressureTransmitter position={[1.3, 0.7, 0]} pressure={pressures.distribution} />

      {/* Distribution manifold */}
      <Pipe start={[1.2, 0.5, 0]} end={[3.2, 0.5, 0]} radius={0.05} />
      <FlowParticles start={[1.2, 0.5, 0]} end={[3.2, 0.5, 0]} active={anyFlowing} flowRate={totalFlow} />

      <GroovedCoupling position={[1.4, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />
      <GroovedCoupling position={[2.0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />
      <GroovedCoupling position={[2.6, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />

      {/* End elbow */}
      <GroovedElbow position={[3.2, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.05} />
      <Pipe start={[3.2, 0.5, 0.1]} end={[3.2, 0.5, 0.4]} radius={0.05} />

      {/* 4 Valve outlets */}
      {valves.map((valve, index) => {
        const xPos = 1.5 + index * 0.5;
        const yPos = 0.5;
        return (
          <group key={valve.id}>
            <mesh position={[xPos, yPos, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.02, 32]} />
              <meshStandardMaterial color={COLORS.steelLight} metalness={0.7} roughness={0.2} />
            </mesh>
            <Pipe start={[xPos, yPos, 0]} end={[xPos, yPos - 0.25, 0]} radius={0.03} />
            <FlowParticles start={[xPos, yPos, 0]} end={[xPos, yPos - 0.7, 0]}
              active={valve.isOpen && valve.flowRate > 0.01} flowRate={valve.flowRate}
            />
            <ElectricValve
              position={[xPos, yPos - 0.35, 0]}
              isOpen={valve.isOpen}
              pressure={valve.pressure}
              isOnline={isOnline}
              onClick={() => onValveClick(valve.id)}
              scale={0.9}
            />
            <Pipe start={[xPos, yPos - 0.5, 0]} end={[xPos, yPos - 0.7, 0]} radius={0.03} />
            <mesh position={[xPos, yPos - 0.72, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.03, 32]} />
              <meshStandardMaterial
                color={valve.isOpen ? COLORS.valveOn : COLORS.steelDark}
                metalness={0.6} roughness={0.3}
                emissive={valve.isOpen ? COLORS.valveOn : '#000000'}
                emissiveIntensity={valve.isOpen && isOnline ? 0.3 : 0}
              />
            </mesh>
          </group>
        );
      })}

      {/* Ground plate */}
      <mesh position={[1.5, -1.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 2]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.2} roughness={0.8} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

// ===== Scene =====
const Scene: React.FC<{
  valves: ValveState[];
  ptfcOn: boolean;
  sasfOn: boolean;
  pressures: PressureReadings;
  flowRates: number[];
  isOnline: boolean;
  onValveClick: (id: number) => void;
  onPTFCClick: () => void;
  onSASFClick: () => void;
  autoRotate: boolean;
}> = ({ autoRotate, ...assemblyProps }) => (
  <>
    <PerspectiveCamera makeDefault position={[3, 2, 4]} fov={45} />
    <ambientLight intensity={0.6} />
    <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
    <directionalLight position={[-5, 5, -5]} intensity={0.4} />
    <directionalLight position={[0, -3, 5]} intensity={0.3} />
    <pointLight position={[0, 3, 0]} intensity={0.5} color="#60a5fa" />
    <pointLight position={[3, 1, 2]} intensity={0.3} />
    <ManifoldAssembly {...assemblyProps} />
    <OrbitControls
      autoRotate={autoRotate} autoRotateSpeed={1}
      enablePan enableZoom enableRotate
      minDistance={2} maxDistance={10}
      target={[1.5, 0, 0]}
    />
  </>
);

// ===== Main Component =====
export const Manifold3DViewer: React.FC<Manifold3DViewerProps> = (props) => {
  const [autoRotate, setAutoRotate] = useState(false);

  const valves = props.valves ?? [];
  const pressures = props.pressures ?? { inlet: 0, postFilter: 0, distribution: 0, outlets: [0, 0, 0, 0] };
  const flowRates = props.flowRates ?? [0, 0, 0, 0];
  const activeCount = valves.filter(v => v.isOpen).length;

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Overlays */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${autoRotate ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
        >
          {autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
        </button>
      </div>
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-white font-semibold text-lg">MANIFOLD-27</h3>
        <p className="text-white/60 text-xs">4&quot; Inlet → SASF → PTFC → 4 Valves</p>
      </div>
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">ONLINE</span>
        <span className="px-2 py-1 rounded text-xs font-medium bg-white/10 text-white/70">Active: {activeCount}/{valves.length}</span>
        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">{pressures.inlet.toFixed(0)} PSI</span>
      </div>
      <div className="absolute bottom-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
        <p className="text-white/80 text-xs font-medium mb-2">Pressure</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-white/60 text-xs">&lt; 40 PSI</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span className="text-white/60 text-xs">40-70 PSI</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-white/60 text-xs">&gt; 70 PSI</span></div>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/40 text-xs">
        Click components to toggle • Drag to rotate • Scroll to zoom
      </div>

      {/* 3D Canvas - absolute fill */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <color attach="background" args={['#0f172a']} />
          <Scene
            valves={valves}
            ptfcOn={props.ptfcOn ?? false}
            sasfOn={props.sasfOn ?? false}
            pressures={pressures}
            flowRates={flowRates}
            isOnline={props.isOnline ?? true}
            onValveClick={props.onValveClick ?? (() => {})}
            onPTFCClick={props.onPTFCClick ?? (() => {})}
            onSASFClick={props.onSASFClick ?? (() => {})}
            autoRotate={autoRotate}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default Manifold3DViewer;

'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface GlowOrbProps {
  position?: [number, number, number]
  color?: string
  secondaryColor?: string
  size?: number
  pulseSpeed?: number
  opacity?: number
}

export function GlowOrb({
  position = [0, 0, 0],
  color = '#5EEAD4',
  secondaryColor = '#8B5CF6',
  size = 2,
  pulseSpeed = 0.3,
  opacity = 0.15,
}: GlowOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Custom shader for soft glow effect
  const shaderData = useMemo(() => {
    return {
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(color) },
        uColor2: { value: new THREE.Color(secondaryColor) },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uOpacity;

        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Distance from center
          float dist = length(vUv - vec2(0.5));

          // Soft radial gradient
          float alpha = smoothstep(0.5, 0.0, dist);

          // Breathing animation
          float breath = sin(uTime * 0.3) * 0.5 + 0.5;

          // Color mixing based on time
          float colorMix = sin(uTime * 0.2) * 0.5 + 0.5;
          vec3 color = mix(uColor1, uColor2, colorMix * 0.3);

          // Apply breathing to opacity
          float finalOpacity = alpha * uOpacity * (0.8 + breath * 0.2);

          gl_FragColor = vec4(color, finalOpacity);
        }
      `,
    }
  }, [color, secondaryColor, opacity])

  // Animation
  useFrame((state) => {
    if (!materialRef.current) return

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * pulseSpeed

    // Subtle scale breathing
    if (meshRef.current) {
      const breath = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.05 + 1
      meshRef.current.scale.setScalar(breath)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[size, size, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        {...shaderData}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// Multiple orb composition for layered effect
export function GlowOrbCluster({
  position = [0, 0, 0] as [number, number, number],
}: {
  position?: [number, number, number]
}) {
  return (
    <group position={position}>
      {/* Main orb */}
      <GlowOrb
        position={[0, 0, 0]}
        color="#5EEAD4"
        secondaryColor="#8B5CF6"
        size={3}
        opacity={0.12}
        pulseSpeed={0.3}
      />
      {/* Secondary orb - slightly offset */}
      <GlowOrb
        position={[0.5, 0.3, -0.5]}
        color="#8B5CF6"
        secondaryColor="#5EEAD4"
        size={2}
        opacity={0.08}
        pulseSpeed={0.25}
      />
      {/* Tertiary orb - smaller accent */}
      <GlowOrb
        position={[-0.3, -0.2, 0.3]}
        color="#5EEAD4"
        secondaryColor="#8B5CF6"
        size={1.5}
        opacity={0.06}
        pulseSpeed={0.35}
      />
    </group>
  )
}

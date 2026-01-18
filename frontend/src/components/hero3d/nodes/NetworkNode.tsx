'use client'

import { useRef, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface NetworkNodeProps {
  position: THREE.Vector3
  color?: string
  size?: number
  glowIntensity?: number
  id: string
  label: string
  type: string
  onHover?: (event: ThreeEvent<PointerEvent>, data: { id: string; label: string; type: string }) => void
  onHoverEnd?: () => void
  onClick?: (event: ThreeEvent<MouseEvent>, data: { id: string; label: string; type: string }) => void
}

export function NetworkNode({
  position,
  color = '#00D9FF',
  size = 0.15,
  glowIntensity = 0.8,
  id,
  label,
  type,
  onHover,
  onHoverEnd,
  onClick
}: NetworkNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const targetScale = useRef(1)
  const currentScale = useRef(1)

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return

    // Update target scale based on hover
    targetScale.current = hovered ? 1.3 : 1

    // Smooth scale transition
    currentScale.current = THREE.MathUtils.lerp(
      currentScale.current,
      targetScale.current,
      0.1
    )

    meshRef.current.scale.setScalar(currentScale.current)
    glowRef.current.scale.setScalar(currentScale.current)

    // Subtle pulse animation
    const pulse = Math.sin(state.clock.elapsedTime * 2 + position.x) * 0.05
    meshRef.current.scale.multiplyScalar(1 + pulse)

    // Glow pulsing
    const glowPulse = Math.sin(state.clock.elapsedTime * 3 + position.y) * 0.1 + 0.9
    if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
      glowRef.current.material.opacity = glowIntensity * glowPulse * (hovered ? 1.5 : 1)
    }
  })

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    setHovered(true)
    document.body.style.cursor = 'pointer'
    onHover?.(event, { id, label, type })
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'default'
    onHoverEnd?.()
  }

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    onClick?.(event, { id, label, type })
  }

  return (
    <group position={position}>
      {/* Outer glow shell */}
      <Sphere ref={glowRef} args={[size * 2, 16, 16]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={glowIntensity * 0.3}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </Sphere>

      {/* Inner core with emissive material */}
      <Sphere
        ref={meshRef}
        args={[size, 32, 32]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2 : 1}
          metalness={0.5}
          roughness={0.2}
          toneMapped={false}
        />
      </Sphere>

      {/* Small bright center */}
      <Sphere args={[size * 0.3, 16, 16]}>
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </Sphere>
    </group>
  )
}

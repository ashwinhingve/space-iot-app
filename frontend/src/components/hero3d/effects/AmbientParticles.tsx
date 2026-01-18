'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AmbientParticlesProps {
  count?: number
  radius?: number
  color?: string
  size?: number
  speed?: number
}

export function AmbientParticles({
  count = 200,
  radius = 10,
  color = '#00D9FF',
  size = 0.03,
  speed = 0.2
}: AmbientParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)

  // Generate particle positions and velocities
  const { positions, velocities, initialPositions } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities: THREE.Vector3[] = []
    const initialPositions: THREE.Vector3[] = []

    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const r = Math.cbrt(Math.random()) * radius

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      initialPositions.push(new THREE.Vector3(x, y, z))

      // Random velocity
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed
        )
      )
    }

    return { positions, velocities, initialPositions }
  }, [count, radius, speed])

  // Animation
  useFrame((state) => {
    if (!pointsRef.current) return

    const positionAttribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const time = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const initial = initialPositions[i]
      const velocity = velocities[i]

      // Subtle drift motion
      const x = initial.x + Math.sin(time * velocity.x + i) * 0.5
      const y = initial.y + Math.sin(time * velocity.y + i * 0.7) * 0.5
      const z = initial.z + Math.sin(time * velocity.z + i * 0.3) * 0.5

      positionAttribute.setXYZ(i, x, y, z)
    }

    positionAttribute.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.6}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

// Sparkle effect - brighter, faster particles
export function SparkleParticles({
  count = 50,
  radius = 6,
  color = '#00FFF0',
  size = 0.05
}: {
  count?: number
  radius?: number
  color?: string
  size?: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions } = useMemo(() => {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const r = Math.cbrt(Math.random()) * radius

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }

    return { positions }
  }, [count, radius])

  useFrame((state) => {
    if (!pointsRef.current) return

    const material = pointsRef.current.material as THREE.PointsMaterial
    const time = state.clock.elapsedTime

    // Twinkling effect
    const twinkle = (Math.sin(time * 3) * 0.5 + 0.5) * 0.5 + 0.5
    material.opacity = twinkle * 0.8
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.8}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

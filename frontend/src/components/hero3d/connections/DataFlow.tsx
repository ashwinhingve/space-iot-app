'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DataFlowProps {
  start: THREE.Vector3
  end: THREE.Vector3
  color?: string
  speed?: number
  particleCount?: number
}

export function DataFlow({
  start,
  end,
  color = '#5EEAD4',
  speed = 0.15,
  particleCount = 3
}: DataFlowProps) {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Mesh[]>([])

  // Create curve for particles to follow
  const curve = useMemo(() => {
    const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5)
    const direction = new THREE.Vector3().subVectors(end, start)
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z * 0.3)
    perpendicular.normalize()

    const distance = start.distanceTo(end)
    midPoint.add(perpendicular.multiplyScalar(distance * 0.15))

    return new THREE.QuadraticBezierCurve3(start, midPoint, end)
  }, [start, end])

  // Animation
  useFrame((state) => {
    const time = state.clock.elapsedTime

    particlesRef.current.forEach((particle, index) => {
      if (!particle) return

      // Calculate position along curve
      const offset = index / particleCount
      const t = ((time * speed) + offset) % 1

      // Get point on curve
      const point = curve.getPoint(t)
      particle.position.copy(point)

      // Fade in/out at ends
      const fadeZone = 0.15
      let opacity = 1
      if (t < fadeZone) {
        opacity = t / fadeZone
      } else if (t > 1 - fadeZone) {
        opacity = (1 - t) / fadeZone
      }

      // Scale based on position
      const scale = Math.sin(t * Math.PI) * 0.5 + 0.5
      particle.scale.setScalar(scale * 0.05)

      if (particle.material instanceof THREE.MeshBasicMaterial) {
        particle.material.opacity = opacity * 0.8
      }
    })
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: particleCount }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) particlesRef.current[i] = el
          }}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.8}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// Batch data flow for multiple connections
export function DataFlowBatch({
  connections,
  color = '#5EEAD4',
  speed = 0.15
}: {
  connections: { start: THREE.Vector3; end: THREE.Vector3 }[]
  color?: string
  speed?: number
}) {
  const pointsRef = useRef<THREE.Points>(null)

  // Create particle positions
  const particleData = useMemo(() => {
    const positions: number[] = []
    const offsets: number[] = []

    connections.forEach((conn, connIndex) => {
      // 2 particles per connection
      for (let i = 0; i < 2; i++) {
        positions.push(conn.start.x, conn.start.y, conn.start.z)
        offsets.push(connIndex, i / 2)
      }
    })

    return {
      positions: new Float32Array(positions),
      offsets: new Float32Array(offsets),
      count: connections.length * 2
    }
  }, [connections])

  // Create curves for each connection
  const curves = useMemo(() => {
    return connections.map(conn => {
      const midPoint = new THREE.Vector3().lerpVectors(conn.start, conn.end, 0.5)
      const direction = new THREE.Vector3().subVectors(conn.end, conn.start)
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z * 0.3)
      perpendicular.normalize()
      const distance = conn.start.distanceTo(conn.end)
      midPoint.add(perpendicular.multiplyScalar(distance * 0.15))
      return new THREE.QuadraticBezierCurve3(conn.start, midPoint, conn.end)
    })
  }, [connections])

  useFrame((state) => {
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const time = state.clock.elapsedTime

    let idx = 0
    connections.forEach((conn, connIndex) => {
      const curve = curves[connIndex]

      for (let i = 0; i < 2; i++) {
        const offset = i / 2
        const t = ((time * speed) + offset) % 1
        const point = curve.getPoint(t)

        positions.setXYZ(idx, point.x, point.y, point.z)
        idx++
      }
    })

    positions.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleData.count}
          array={particleData.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.08}
        transparent
        opacity={0.9}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

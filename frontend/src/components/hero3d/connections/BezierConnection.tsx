'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

interface BezierConnectionProps {
  start: THREE.Vector3
  end: THREE.Vector3
  color?: string
  opacity?: number
  lineWidth?: number
  animated?: boolean
}

export function BezierConnection({
  start,
  end,
  color = '#8b5cf6',
  opacity = 0.4,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lineWidth = 1,
  animated = true
}: BezierConnectionProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  // Create bezier curve
  const { geometry } = useMemo(() => {
    const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5)

    // Add some curvature by offsetting the midpoint
    const direction = new THREE.Vector3().subVectors(end, start)
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z * 0.5)
    perpendicular.normalize()

    const distance = start.distanceTo(end)
    const curvature = distance * 0.2

    midPoint.add(perpendicular.multiplyScalar(curvature))

    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end)

    // Create tube geometry for the connection
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      20, // tubular segments
      0.02, // radius
      8, // radial segments
      false // closed
    )

    return { geometry: tubeGeometry }
  }, [start, end])

  // Animation for pulsing effect
  useFrame((state) => {
    if (!animated || !materialRef.current) return

    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.15 + 0.85
    materialRef.current.opacity = opacity * pulse
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// Simplified line-based connection for better performance
export function LineConnection({
  start,
  end,
  color = '#8b5cf6',
  opacity = 0.3
}: {
  start: THREE.Vector3
  end: THREE.Vector3
  color?: string
  opacity?: number
}) {
  const points = useMemo(() => {
    return [start.toArray(), end.toArray()] as [number, number, number][]
  }, [start, end])

  return (
    <Line
      points={points}
      color={color}
      transparent
      opacity={opacity}
      lineWidth={1}
    />
  )
}

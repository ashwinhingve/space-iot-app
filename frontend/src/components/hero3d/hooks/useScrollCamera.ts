'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface UseScrollCameraOptions {
  scrollProgress: number
  basePosition?: [number, number, number]
  targetPosition?: [number, number, number]
  baseRotation?: number
  targetRotation?: number
  lerpFactor?: number
}

export function useScrollCamera({
  scrollProgress,
  basePosition = [0, 0, 8],
  targetPosition = [0, 2, 12],
  baseRotation = 0,
  targetRotation = Math.PI * 0.1,
  lerpFactor = 0.1
}: UseScrollCameraOptions) {
  const { camera } = useThree()
  const targetRef = useRef({
    position: new THREE.Vector3(...basePosition),
    rotation: baseRotation
  })

  useEffect(() => {
    // Update target based on scroll
    const progress = Math.min(1, Math.max(0, scrollProgress))

    targetRef.current.position.set(
      THREE.MathUtils.lerp(basePosition[0], targetPosition[0], progress),
      THREE.MathUtils.lerp(basePosition[1], targetPosition[1], progress),
      THREE.MathUtils.lerp(basePosition[2], targetPosition[2], progress)
    )

    targetRef.current.rotation = THREE.MathUtils.lerp(
      baseRotation,
      targetRotation,
      progress
    )
  }, [scrollProgress, basePosition, targetPosition, baseRotation, targetRotation])

  useFrame(() => {
    // Smoothly lerp camera to target
    camera.position.lerp(targetRef.current.position, lerpFactor)

    // Look at center
    camera.lookAt(0, 0, 0)
  })

  return null
}

// Orbit camera based on scroll
export function useOrbitScroll({
  scrollProgress,
  radius = 8,
  height = 2,
  startAngle = 0,
  endAngle = Math.PI * 0.5,
  lerpFactor = 0.08
}: {
  scrollProgress: number
  radius?: number
  height?: number
  startAngle?: number
  endAngle?: number
  lerpFactor?: number
}) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3())

  useFrame(() => {
    const progress = Math.min(1, Math.max(0, scrollProgress))
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, progress)
    const currentHeight = THREE.MathUtils.lerp(height, height * 1.5, progress)
    const currentRadius = THREE.MathUtils.lerp(radius, radius * 1.2, progress)

    targetRef.current.set(
      Math.sin(angle) * currentRadius,
      currentHeight,
      Math.cos(angle) * currentRadius
    )

    camera.position.lerp(targetRef.current, lerpFactor)
    camera.lookAt(0, 0, 0)
  })
}

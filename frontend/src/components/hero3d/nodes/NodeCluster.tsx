'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { NetworkNode as NetworkNodeData, getNodeColor, getNodeSize } from '../utils/networkGenerator'

interface NodeClusterProps {
  nodes: NetworkNodeData[]
  onNodeHover?: (event: ThreeEvent<PointerEvent>, data: { id: string; label: string; type: string }) => void
  onNodeHoverEnd?: () => void
  onNodeClick?: (event: ThreeEvent<MouseEvent>, data: { id: string; label: string; type: string }) => void
}

export function NodeCluster({
  nodes,
  onNodeHover,
  onNodeHoverEnd,
  onNodeClick
}: NodeClusterProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const glowMeshRef = useRef<THREE.InstancedMesh>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const dummyRef = useRef(new THREE.Object3D())
  const colorRef = useRef(new THREE.Color())
  const scalesRef = useRef<number[]>([])
  const targetScalesRef = useRef<number[]>([])

  // Initialize scales
  useMemo(() => {
    scalesRef.current = nodes.map(() => 1)
    targetScalesRef.current = nodes.map(() => 1)
  }, [nodes])

  // Setup instanced meshes
  useMemo(() => {
    if (!meshRef.current || !glowMeshRef.current) return

    nodes.forEach((node, i) => {
      const size = getNodeSize(node.type)

      // Main node
      dummyRef.current.position.copy(node.position)
      dummyRef.current.scale.setScalar(size)
      dummyRef.current.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummyRef.current.matrix)

      // Set color
      const color = getNodeColor(node.type)
      colorRef.current.set(color)
      meshRef.current!.setColorAt(i, colorRef.current)

      // Glow sphere
      dummyRef.current.scale.setScalar(size * 2)
      dummyRef.current.updateMatrix()
      glowMeshRef.current!.setMatrixAt(i, dummyRef.current.matrix)
      glowMeshRef.current!.setColorAt(i, colorRef.current)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.instanceColor!.needsUpdate = true
    glowMeshRef.current.instanceMatrix.needsUpdate = true
    glowMeshRef.current.instanceColor!.needsUpdate = true
  }, [nodes])

  // Animation loop
  useFrame((state) => {
    if (!meshRef.current || !glowMeshRef.current) return

    const time = state.clock.elapsedTime

    nodes.forEach((node, i) => {
      // Update target scale based on hover
      targetScalesRef.current[i] = i === hoveredIndex ? 1.4 : 1

      // Lerp to target
      scalesRef.current[i] = THREE.MathUtils.lerp(
        scalesRef.current[i],
        targetScalesRef.current[i],
        0.1
      )

      const baseSize = getNodeSize(node.type)
      const pulse = Math.sin(time * 2 + i * 0.5) * 0.05
      const scale = scalesRef.current[i] * (1 + pulse)

      // Update main node
      dummyRef.current.position.copy(node.position)
      dummyRef.current.scale.setScalar(baseSize * scale)
      dummyRef.current.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummyRef.current.matrix)

      // Update glow
      dummyRef.current.scale.setScalar(baseSize * scale * 2)
      dummyRef.current.updateMatrix()
      glowMeshRef.current!.setMatrixAt(i, dummyRef.current.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    glowMeshRef.current.instanceMatrix.needsUpdate = true
  })

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.instanceId !== undefined && event.instanceId !== hoveredIndex) {
      setHoveredIndex(event.instanceId)
      document.body.style.cursor = 'pointer'
      const node = nodes[event.instanceId]
      if (node) {
        onNodeHover?.(event, { id: node.id, label: node.label, type: node.type })
      }
    }
  }, [nodes, hoveredIndex, onNodeHover])

  const handlePointerOut = useCallback(() => {
    setHoveredIndex(null)
    document.body.style.cursor = 'default'
    onNodeHoverEnd?.()
  }, [onNodeHoverEnd])

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (event.instanceId !== undefined) {
      const node = nodes[event.instanceId]
      if (node) {
        onNodeClick?.(event, { id: node.id, label: node.label, type: node.type })
      }
    }
  }, [nodes, onNodeClick])

  return (
    <group>
      {/* Glow spheres */}
      <instancedMesh
        ref={glowMeshRef}
        args={[undefined, undefined, nodes.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Main nodes */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, nodes.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          metalness={0.5}
          roughness={0.2}
          emissive="#00D9FF"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

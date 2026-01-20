'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NodeCluster } from './nodes/NodeCluster'
import { BezierConnection, LineConnection } from './connections/BezierConnection'
import { DataFlowBatch } from './connections/DataFlow'
import { AmbientParticles, SparkleParticles } from './effects/AmbientParticles'
import { generateNetwork, NetworkData } from './utils/networkGenerator'
import { useOrbitScroll } from './hooks/useScrollCamera'
import { ThreeEvent } from '@react-three/fiber'

interface NetworkVisualizationProps {
  scrollProgress?: number
  nodeCount?: number
  quality?: 'high' | 'medium' | 'low'
  onNodeHover?: (event: ThreeEvent<PointerEvent>, data: { id: string; label: string; type: string }) => void
  onNodeHoverEnd?: () => void
  onNodeClick?: (event: ThreeEvent<MouseEvent>, data: { id: string; label: string; type: string }) => void
}

export function NetworkVisualization({
  scrollProgress = 0,
  nodeCount = 25,
  quality = 'high',
  onNodeHover,
  onNodeHoverEnd,
  onNodeClick
}: NetworkVisualizationProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Generate network data
  const networkData: NetworkData = useMemo(() => {
    return generateNetwork({
      nodeCount: quality === 'low' ? 15 : quality === 'medium' ? 20 : nodeCount,
      radius: 4,
      hubCount: 2,
      gatewayCount: 2,
      connectionDistance: 3
    })
  }, [nodeCount, quality])

  // Get connection pairs for rendering
  const connectionPairs = useMemo(() => {
    return networkData.connections.map(conn => {
      const fromNode = networkData.nodes.find(n => n.id === conn.from)
      const toNode = networkData.nodes.find(n => n.id === conn.to)
      if (!fromNode || !toNode) return null
      return {
        start: fromNode.position,
        end: toNode.position,
        strength: conn.strength
      }
    }).filter(Boolean) as { start: THREE.Vector3; end: THREE.Vector3; strength: number }[]
  }, [networkData])

  // Only show data flow on strong connections
  const strongConnections = useMemo(() => {
    return connectionPairs.filter(c => c.strength > 0.6)
  }, [connectionPairs])

  // Scroll-driven camera orbit
  useOrbitScroll({
    scrollProgress,
    radius: 8,
    height: 1.5,
    startAngle: 0,
    endAngle: Math.PI * 0.4,
    lerpFactor: 0.05
  })

  // Subtle rotation - slow cinematic movement
  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.015
  })

  const particleCount = quality === 'low' ? 50 : quality === 'medium' ? 100 : 150
  const showDataFlow = quality !== 'low'

  return (
    <group ref={groupRef}>
      {/* Ambient lighting - cinematic teal and purple */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#5EEAD4" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8B5CF6" />

      {/* Nodes using instanced mesh for performance */}
      <NodeCluster
        nodes={networkData.nodes}
        onNodeHover={onNodeHover}
        onNodeHoverEnd={onNodeHoverEnd}
        onNodeClick={onNodeClick}
      />

      {/* Connections */}
      {connectionPairs.map((conn, i) => (
        quality === 'high' ? (
          <BezierConnection
            key={i}
            start={conn.start}
            end={conn.end}
            color="#8b5cf6"
            opacity={conn.strength * 0.4}
          />
        ) : (
          <LineConnection
            key={i}
            start={conn.start}
            end={conn.end}
            color="#8b5cf6"
            opacity={conn.strength * 0.3}
          />
        )
      ))}

      {/* Data flow particles on strong connections - slow cinematic flow */}
      {showDataFlow && (
        <DataFlowBatch
          connections={strongConnections}
          color="#5EEAD4"
          speed={0.15}
        />
      )}

      {/* Ambient particles - slow cinematic drift */}
      <AmbientParticles
        count={particleCount}
        radius={8}
        color="#5EEAD4"
        size={0.02}
        speed={0.06}
      />

      {/* Sparkle particles */}
      {quality === 'high' && (
        <SparkleParticles
          count={30}
          radius={6}
          color="#5EEAD4"
          size={0.04}
        />
      )}
    </group>
  )
}

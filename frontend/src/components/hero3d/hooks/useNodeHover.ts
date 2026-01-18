'use client'

import { useState, useCallback, useRef } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

export interface HoveredNode {
  id: string
  position: THREE.Vector3
  screenPosition: { x: number; y: number }
  label: string
  type: string
}

export function useNodeHover() {
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()

  const handlePointerOver = useCallback((
    event: ThreeEvent<PointerEvent>,
    nodeData: { id: string; label: string; type: string }
  ) => {
    event.stopPropagation()

    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const position = event.object.position.clone()

    // Convert 3D position to screen coordinates
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const vector = position.clone().project(event.camera)
      const screenPosition = {
        x: (vector.x * 0.5 + 0.5) * canvas.clientWidth,
        y: (-vector.y * 0.5 + 0.5) * canvas.clientHeight
      }

      setHoveredNode({
        id: nodeData.id,
        position,
        screenPosition,
        label: nodeData.label,
        type: nodeData.type
      })
      setIsHovering(true)
    }
  }, [])

  const handlePointerOut = useCallback(() => {
    // Small delay before hiding to prevent flicker
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false)
      setHoveredNode(null)
    }, 100)
  }, [])

  const handleClick = useCallback((
    event: ThreeEvent<MouseEvent>,
    nodeData: { id: string; label: string; type: string }
  ) => {
    event.stopPropagation()
    // Could emit click event for further interaction
    console.log('Node clicked:', nodeData)
  }, [])

  return {
    hoveredNode,
    isHovering,
    handlers: {
      onPointerOver: handlePointerOver,
      onPointerOut: handlePointerOut,
      onClick: handleClick
    }
  }
}

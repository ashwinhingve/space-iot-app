'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import { useScroll, useSpring } from 'framer-motion'
import { ThreeEvent } from '@react-three/fiber'
import { NetworkVisualization } from './NetworkVisualization'
import { BloomEffect } from './effects/BloomEffect'
import { GlowOrbCluster } from './effects/GlowOrb'
import { CinematicParticles } from './effects/CinematicParticles'
import { NodeTooltip } from './ui/NodeTooltip'
import { useDeviceCapabilities } from './hooks/useAdaptiveQuality'
import { ParticleBackground, FloatingOrbs } from '@/components/ParticleBackground'

interface Hero3DSceneProps {
  className?: string
  fallback?: React.ReactNode
}

// WebGL detection hook
function useWebGLSupport() {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      setHasWebGL(!!gl)
    } catch {
      setHasWebGL(false)
    }
  }, [])

  return hasWebGL
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0a0a0f]">
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute w-96 h-96 rounded-full blur-[100px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(0, 217, 255, 0.3) 0%, transparent 70%)',
            top: '20%',
            left: '30%'
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full blur-[80px] animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            bottom: '20%',
            right: '30%',
            animationDelay: '0.5s'
          }}
        />
      </div>
    </div>
  )
}

// Static fallback for no WebGL or reduced motion
function StaticFallback() {
  return (
    <div className="absolute inset-0">
      <ParticleBackground
        particleCount={80}
        connectionDistance={120}
        speed={0.3}
        className="opacity-60"
      />
      <FloatingOrbs />
    </div>
  )
}

// Mobile configuration helper
function getMobileConfig(isMobile: boolean, gpuTier: string) {
  return {
    particleCount: isMobile ? 40 : gpuTier === 'low' ? 60 : 120,
    nodeCount: isMobile ? 10 : gpuTier === 'low' ? 15 : 25,
    showDataFlow: !isMobile && gpuTier !== 'low',
    showCursorInteraction: !isMobile,
    dpr: isMobile ? 1 : Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio : 1)
  }
}

// Inner 3D scene component
function Scene({
  scrollProgress,
  quality,
  isMobile,
  onHover,
  onHoverEnd,
  onClick
}: {
  scrollProgress: number
  quality: 'high' | 'medium' | 'low'
  isMobile: boolean
  onHover: (event: ThreeEvent<PointerEvent>, data: { id: string; label: string; type: string }) => void
  onHoverEnd: () => void
  onClick: (event: ThreeEvent<MouseEvent>, data: { id: string; label: string; type: string }) => void
}) {
  const config = getMobileConfig(isMobile, quality)

  return (
    <>
      {/* Central ambient glow orb */}
      {quality !== 'low' && <GlowOrbCluster position={[0, 0, -2]} />}

      {/* Cinematic particles with cursor interaction */}
      <CinematicParticles
        count={config.particleCount}
        radius={8}
        color="#5EEAD4"
        size={0.025}
        speed={0.08}
        cursorInteraction={config.showCursorInteraction}
        attractStrength={0.02}
        brightenOnHover={true}
      />

      <NetworkVisualization
        scrollProgress={scrollProgress}
        quality={quality}
        onNodeHover={onHover}
        onNodeHoverEnd={onHoverEnd}
        onNodeClick={onClick}
      />
      {quality !== 'low' && (
        <BloomEffect
          intensity={quality === 'high' ? 1.5 : 1}
          luminanceThreshold={0.3}
          enabled={true}
        />
      )}
    </>
  )
}

export function Hero3DScene({ className = '', fallback }: Hero3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasWebGL = useWebGLSupport()
  const prefersReducedMotion = useReducedMotion()
  const { isMobile, gpuTier } = useDeviceCapabilities()
  const [isVisible, setIsVisible] = useState(true)
  const [scrollValue, setScrollValue] = useState(0)

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean
    x: number
    y: number
    label: string
    type: string
  }>({ visible: false, x: 0, y: 0, label: '', type: '' })

  // Determine quality
  const quality = isMobile ? 'low' : gpuTier === 'low' ? 'low' : gpuTier === 'medium' ? 'medium' : 'high'

  // Scroll progress tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30
  })

  // Update scroll value for R3F
  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (v) => {
      setScrollValue(v)
    })
    return unsubscribe
  }, [smoothProgress])

  // Visibility observer
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Node hover handlers
  const handleNodeHover = useCallback((
    event: ThreeEvent<PointerEvent>,
    data: { id: string; label: string; type: string }
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    // Get screen position from event
    const vector = event.object.position.clone().project(event.camera)
    const x = (vector.x * 0.5 + 0.5) * rect.width
    const y = (-vector.y * 0.5 + 0.5) * rect.height

    setTooltipData({
      visible: true,
      x,
      y,
      label: data.label,
      type: data.type
    })
  }, [])

  const handleNodeHoverEnd = useCallback(() => {
    setTooltipData(prev => ({ ...prev, visible: false }))
  }, [])

  const handleNodeClick = useCallback((
    event: ThreeEvent<MouseEvent>,
    data: { id: string; label: string; type: string }
  ) => {
    console.log('Node clicked:', data)
  }, [])

  // Show loading state while checking WebGL
  if (hasWebGL === null) {
    return (
      <div ref={containerRef} className={`absolute inset-0 ${className}`}>
        <LoadingFallback />
      </div>
    )
  }

  // Use fallback if no WebGL or reduced motion preferred
  if (!hasWebGL || prefersReducedMotion) {
    return (
      <div ref={containerRef} className={`absolute inset-0 ${className}`}>
        {fallback || <StaticFallback />}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 ${className}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f] to-[#1a1f3a] opacity-95" />

      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [0, 1.5, 8],
          fov: 50,
          near: 0.1,
          far: 100
        }}
        dpr={quality === 'low' ? 1 : quality === 'medium' ? 1.5 : Math.min(2, window.devicePixelRatio)}
        frameloop={isVisible ? 'always' : 'demand'}
        gl={{
          antialias: quality !== 'low',
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene
            scrollProgress={scrollValue}
            quality={quality}
            isMobile={isMobile}
            onHover={handleNodeHover}
            onHoverEnd={handleNodeHoverEnd}
            onClick={handleNodeClick}
          />
        </Suspense>
      </Canvas>

      {/* HTML Tooltip overlay */}
      <NodeTooltip
        visible={tooltipData.visible}
        x={tooltipData.x}
        y={tooltipData.y}
        label={tooltipData.label}
        type={tooltipData.type}
        containerRef={containerRef}
      />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />

      {/* Accessibility label */}
      <span className="sr-only">
        Interactive 3D visualization of IoT network with connected nodes and data flow
      </span>
    </div>
  )
}

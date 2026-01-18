'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'

export interface QualitySettings {
  particleCount: number
  nodeCount: number
  bloomEnabled: boolean
  dpr: number
  connectionDetail: number // 0-1
  shadows: boolean
}

const QUALITY_PRESETS: Record<'high' | 'medium' | 'low', QualitySettings> = {
  high: {
    particleCount: 200,
    nodeCount: 30,
    bloomEnabled: true,
    dpr: Math.min(2, window?.devicePixelRatio || 1),
    connectionDetail: 1,
    shadows: true
  },
  medium: {
    particleCount: 100,
    nodeCount: 20,
    bloomEnabled: true,
    dpr: 1.5,
    connectionDetail: 0.7,
    shadows: false
  },
  low: {
    particleCount: 50,
    nodeCount: 15,
    bloomEnabled: false,
    dpr: 1,
    connectionDetail: 0.5,
    shadows: false
  }
}

export function useAdaptiveQuality(targetFPS: number = 45) {
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')
  const [settings, setSettings] = useState<QualitySettings>(QUALITY_PRESETS.high)
  const frameTimesRef = useRef<number[]>([])
  const lastTimeRef = useRef(performance.now())
  const checkIntervalRef = useRef(0)
  const stabilityCountRef = useRef(0)

  const updateQuality = useCallback((newQuality: 'high' | 'medium' | 'low') => {
    setQuality(newQuality)
    setSettings(QUALITY_PRESETS[newQuality])
  }, [])

  useFrame(() => {
    const now = performance.now()
    const frameTime = now - lastTimeRef.current
    lastTimeRef.current = now

    // Store frame times (keep last 30 frames)
    frameTimesRef.current.push(frameTime)
    if (frameTimesRef.current.length > 30) {
      frameTimesRef.current.shift()
    }

    // Check quality every 60 frames
    checkIntervalRef.current++
    if (checkIntervalRef.current >= 60) {
      checkIntervalRef.current = 0

      // Calculate average FPS
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const avgFPS = 1000 / avgFrameTime

      // Adjust quality based on FPS
      if (avgFPS < targetFPS - 10) {
        // Performance is poor, reduce quality
        stabilityCountRef.current = 0
        if (quality === 'high') {
          updateQuality('medium')
        } else if (quality === 'medium') {
          updateQuality('low')
        }
      } else if (avgFPS >= targetFPS + 15) {
        // Performance is good, can try increasing quality
        stabilityCountRef.current++
        if (stabilityCountRef.current >= 3) {
          stabilityCountRef.current = 0
          if (quality === 'low') {
            updateQuality('medium')
          } else if (quality === 'medium') {
            updateQuality('high')
          }
        }
      } else {
        // Performance is acceptable, maintain current quality
        stabilityCountRef.current = 0
      }
    }
  })

  return { quality, settings }
}

// Hook for detecting device capabilities
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    isMobile: false,
    hasTouch: false,
    prefersReducedMotion: false,
    gpuTier: 'high' as 'high' | 'medium' | 'low'
  })

  useEffect(() => {
    // Detect mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768

    // Detect touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Simple GPU tier detection based on device pixel ratio and mobile status
    let gpuTier: 'high' | 'medium' | 'low' = 'high'
    if (isMobile) {
      gpuTier = 'medium'
      // Further reduce for older mobile devices
      if (window.devicePixelRatio < 2) {
        gpuTier = 'low'
      }
    }

    setCapabilities({
      isMobile,
      hasTouch,
      prefersReducedMotion,
      gpuTier
    })
  }, [])

  return capabilities
}

// Get initial quality based on device
export function getInitialQuality(): 'high' | 'medium' | 'low' {
  if (typeof window === 'undefined') return 'medium'

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isLowEnd = window.devicePixelRatio < 2

  if (isMobile && isLowEnd) return 'low'
  if (isMobile) return 'medium'
  return 'high'
}

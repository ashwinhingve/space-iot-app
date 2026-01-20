'use client'

import { useEffect, useRef } from 'react'
import Lenis from '@studio-freight/lenis'

// Lenis configuration for cinematic smooth scrolling
export const lenisConfig = {
  duration: 1.2,
  lerp: 0.1,
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
  infinite: false,
}

// Global Lenis instance
let lenisInstance: Lenis | null = null

export function getLenis(): Lenis | null {
  return lenisInstance
}

// Hook for initializing Lenis smooth scroll
export function useLenisScroll() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // Only initialize on client
    if (typeof window === 'undefined') return

    // Create Lenis instance
    const lenis = new Lenis({
      ...lenisConfig,
    })

    lenisRef.current = lenis
    lenisInstance = lenis

    // Animation frame loop
    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Cleanup
    return () => {
      lenis.destroy()
      lenisInstance = null
    }
  }, [])

  return lenisRef
}

// Hook for scrolling to a specific element
export function useScrollTo() {
  return (target: string | HTMLElement, options?: { offset?: number; duration?: number }) => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(target, {
        offset: options?.offset ?? 0,
        duration: options?.duration ?? 1.2,
      })
    }
  }
}

// Hook for listening to scroll events
export function useScrollProgress(callback: (progress: number) => void) {
  useEffect(() => {
    const lenis = getLenis()
    if (!lenis) return

    const handleScroll = (e: Lenis) => {
      callback(e.progress)
    }

    lenis.on('scroll', handleScroll)

    return () => {
      lenis.off('scroll', handleScroll)
    }
  }, [callback])
}

// Provider component for Lenis
export function LenisProvider({ children }: { children: React.ReactNode }) {
  useLenisScroll()
  return <>{children}</>
}

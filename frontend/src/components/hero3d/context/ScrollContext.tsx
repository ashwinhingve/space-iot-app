'use client'

import React, { createContext, useContext, useRef, useEffect, useState } from 'react'
import { useScroll, useSpring, MotionValue } from 'framer-motion'

interface ScrollContextValue {
  scrollProgress: MotionValue<number>
  smoothProgress: MotionValue<number>
  scrollY: MotionValue<number>
  isScrolling: boolean
}

const ScrollContext = createContext<ScrollContextValue | null>(null)

export function ScrollProvider({
  children,
  containerRef
}: {
  children: React.ReactNode
  containerRef?: React.RefObject<HTMLElement>
}) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  const { scrollYProgress, scrollY } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  useEffect(() => {
    const unsubscribe = scrollY.on('change', () => {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
    })

    return () => {
      unsubscribe()
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [scrollY])

  return (
    <ScrollContext.Provider value={{
      scrollProgress: scrollYProgress,
      smoothProgress,
      scrollY,
      isScrolling
    }}>
      {children}
    </ScrollContext.Provider>
  )
}

export function useScrollContext() {
  const context = useContext(ScrollContext)
  if (!context) {
    throw new Error('useScrollContext must be used within a ScrollProvider')
  }
  return context
}

// Hook for R3F components to access scroll value as number
export function useScrollValue() {
  const { smoothProgress } = useScrollContext()
  const [value, setValue] = useState(0)

  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (latest) => {
      setValue(latest)
    })
    return unsubscribe
  }, [smoothProgress])

  return value
}

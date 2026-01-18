'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useScroll, useTransform, useSpring } from 'framer-motion'

// Hook to detect when element is in viewport
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (!hasAnimated) setHasAnimated(true)
        } else {
          setIsInView(false)
        }
      },
      { threshold: 0.1, rootMargin: '-50px', ...options }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasAnimated, options])

  return { ref, isInView, hasAnimated }
}

// Hook for parallax scrolling effect
export function useParallax(distance: number = 100) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  })

  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance])
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 })

  return { ref, y: smoothY, progress: scrollYProgress }
}

// Hook for scroll-triggered animations with different effects
export function useScrollReveal(
  effect: 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'scale' | 'rotate' = 'fadeUp',
  delay: number = 0
) {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.unobserve(element)
        }
      },
      { threshold: 0.1, rootMargin: '-20px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [delay])

  const variants = useMemo(() => {
    const effects = {
      fadeUp: { hidden: { opacity: 0, y: 60 }, visible: { opacity: 1, y: 0 } },
      fadeDown: { hidden: { opacity: 0, y: -60 }, visible: { opacity: 1, y: 0 } },
      fadeLeft: { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0 } },
      fadeRight: { hidden: { opacity: 0, x: 60 }, visible: { opacity: 1, x: 0 } },
      scale: { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } },
      rotate: { hidden: { opacity: 0, rotate: -10, scale: 0.9 }, visible: { opacity: 1, rotate: 0, scale: 1 } },
    }
    return effects[effect]
  }, [effect])

  return { ref, isVisible, variants }
}

// Hook for smooth scroll progress
export function useScrollProgress() {
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  return smoothProgress
}

// Hook for element scroll progress (0 to 1 as element moves through viewport)
export function useElementScrollProgress(offset: ['start end' | 'center center' | 'end start', 'start end' | 'center center' | 'end start'] = ['start end', 'end start']) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset
  })
  return { ref, progress: scrollYProgress }
}

// Hook for mouse parallax effect
export function useMouseParallax(sensitivity: number = 0.05) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) * sensitivity
      const y = (e.clientY - window.innerHeight / 2) * sensitivity
      setPosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [sensitivity])

  return position
}

// Hook for tilt effect on hover
export function useTilt(maxTilt: number = 15) {
  const ref = useRef<HTMLElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      setTilt({
        x: (y - 0.5) * maxTilt * 2,
        y: (x - 0.5) * -maxTilt * 2
      })
    }

    const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [maxTilt])

  return { ref, tilt }
}

// Stagger animation delay calculator
export function getStaggerDelay(index: number, baseDelay: number = 0.05): number {
  return index * baseDelay
}

// Framer Motion animation presets
const scrollEase = [0.16, 1, 0.3, 1] as const

export const scrollAnimationVariants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: scrollEase }
    }
  },
  fadeInDown: {
    hidden: { opacity: 0, y: -60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: scrollEase }
    }
  },
  fadeInLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: scrollEase }
    }
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: scrollEase }
    }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: scrollEase }
    }
  },
  rotateIn: {
    hidden: { opacity: 0, rotate: -10, scale: 0.9 },
    visible: {
      opacity: 1,
      rotate: 0,
      scale: 1,
      transition: { duration: 0.8, ease: scrollEase }
    }
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },
  staggerItem: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: scrollEase }
    }
  }
} as const

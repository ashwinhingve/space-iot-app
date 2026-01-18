'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  color: string
}

interface ParticleBackgroundProps {
  particleCount?: number
  connectionDistance?: number
  mouseRadius?: number
  speed?: number
  colors?: string[]
  className?: string
}

export function ParticleBackground({
  particleCount = 60,
  connectionDistance = 150,
  mouseRadius = 200,
  speed = 0.5,
  colors = ['rgba(99, 102, 241, 0.6)', 'rgba(139, 92, 246, 0.6)', 'rgba(59, 130, 246, 0.5)'],
  className = ''
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const prefersReducedMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(true)

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }
    return particles
  }, [particleCount, speed, colors])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const particles = particlesRef.current
    const mouse = mouseRef.current

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Update and draw particles
    particles.forEach((particle, i) => {
      // Mouse interaction
      const dx = mouse.x - particle.x
      const dy = mouse.y - particle.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < mouseRadius) {
        const force = (mouseRadius - dist) / mouseRadius
        particle.vx -= (dx / dist) * force * 0.02
        particle.vy -= (dy / dist) * force * 0.02
      }

      // Update position
      particle.x += particle.vx
      particle.y += particle.vy

      // Boundary bounce
      if (particle.x < 0 || particle.x > width) particle.vx *= -1
      if (particle.y < 0 || particle.y > height) particle.vy *= -1

      // Keep in bounds
      particle.x = Math.max(0, Math.min(width, particle.x))
      particle.y = Math.max(0, Math.min(height, particle.y))

      // Apply friction
      particle.vx *= 0.99
      particle.vy *= 0.99

      // Minimum velocity
      if (Math.abs(particle.vx) < speed * 0.1) particle.vx = (Math.random() - 0.5) * speed
      if (Math.abs(particle.vy) < speed * 0.1) particle.vy = (Math.random() - 0.5) * speed

      // Draw particle
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      ctx.fillStyle = particle.color
      ctx.fill()

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j]
        const cdx = particle.x - other.x
        const cdy = particle.y - other.y
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy)

        if (cdist < connectionDistance) {
          const opacity = (1 - cdist / connectionDistance) * 0.3
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(other.x, other.y)
          ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [connectionDistance, mouseRadius, speed])

  // Handle resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }

    // Reinitialize particles for new dimensions
    particlesRef.current = initParticles(rect.width, rect.height)
  }, [initParticles])

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 }
  }, [])

  // Visibility observer for performance
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    )

    if (canvasRef.current) {
      observer.observe(canvasRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Initialize canvas and start animation
  useEffect(() => {
    // Skip animation for users who prefer reduced motion
    if (prefersReducedMotion) return

    handleResize()

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [handleResize, handleMouseMove, handleMouseLeave, prefersReducedMotion])

  // Start/stop animation based on visibility
  useEffect(() => {
    if (prefersReducedMotion) return

    if (isVisible) {
      animationRef.current = requestAnimationFrame(animate)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, animate, prefersReducedMotion])

  // Return static gradient for reduced motion preference
  if (prefersReducedMotion) {
    return (
      <div
        className={`absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 ${className}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  )
}

// Floating orbs component with smooth animations
export function FloatingOrbs({ className = '' }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return null
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {/* Large primary orb */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-30 animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
          top: '-10%',
          right: '-10%',
        }}
      />

      {/* Secondary orb */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] opacity-25 animate-float-medium"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
          bottom: '-5%',
          left: '-5%',
        }}
      />

      {/* Accent orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[60px] opacity-20 animate-float-fast"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  )
}

'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CinematicParticlesProps {
  count?: number
  radius?: number
  color?: string
  size?: number
  speed?: number
  cursorInteraction?: boolean
  attractStrength?: number
  brightenOnHover?: boolean
}

export function CinematicParticles({
  count = 80,
  radius = 8,
  color = '#5EEAD4',
  size = 0.025,
  speed = 0.08,
  cursorInteraction = true,
  attractStrength = 0.02,
  brightenOnHover = true,
}: CinematicParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const { gl } = useThree()

  // Mouse position in NDC (-1 to 1)
  const [mouseNDC, setMouseNDC] = useState({ x: 0, y: 0 })

  // Track mouse position
  useEffect(() => {
    if (!cursorInteraction) return

    const handleMouseMove = (event: MouseEvent) => {
      const canvas = gl.domElement
      const rect = canvas.getBoundingClientRect()

      // Convert to NDC
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      setMouseNDC({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [gl.domElement, cursorInteraction])

  // Generate particle data
  const { positions, velocities, initialPositions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities: THREE.Vector3[] = []
    const initialPositions: THREE.Vector3[] = []

    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const r = Math.cbrt(Math.random()) * radius

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      initialPositions.push(new THREE.Vector3(x, y, z))

      // Very slow random velocity for ambient drift
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed,
          (Math.random() - 0.5) * speed
        )
      )

      // Varied sizes for depth
      sizes[i] = size * (0.5 + Math.random() * 1.5)
    }

    return { positions, velocities, initialPositions, sizes }
  }, [count, radius, speed, size])

  // Create shader material for better control
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uMouseX: { value: 0 },
        uMouseY: { value: 0 },
        uBrighten: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        varying float vDistance;

        uniform float uTime;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDistance = -mvPosition.z;

          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBrighten;

        varying float vDistance;

        void main() {
          // Circular point with soft edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.1, dist);

          // Apply brightening effect
          vec3 finalColor = uColor * (1.0 + uBrighten * 0.5);

          // Distance-based fade
          float distFade = clamp(1.0 - vDistance * 0.05, 0.3, 1.0);

          gl_FragColor = vec4(finalColor, alpha * 0.6 * distFade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [color])

  // Animation
  useFrame((state) => {
    if (!pointsRef.current) return

    const positionAttribute = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const time = state.clock.elapsedTime

    // Update uniforms
    shaderMaterial.uniforms.uTime.value = time
    shaderMaterial.uniforms.uMouseX.value = mouseNDC.x
    shaderMaterial.uniforms.uMouseY.value = mouseNDC.y

    // Calculate brightness based on mouse activity
    if (brightenOnHover && cursorInteraction) {
      const mouseActivity = Math.abs(mouseNDC.x) + Math.abs(mouseNDC.y)
      const targetBrighten = Math.min(mouseActivity * 0.3, 0.5)
      shaderMaterial.uniforms.uBrighten.value +=
        (targetBrighten - shaderMaterial.uniforms.uBrighten.value) * 0.05
    }

    for (let i = 0; i < count; i++) {
      const initial = initialPositions[i]
      const velocity = velocities[i]

      // Slow ambient drift
      let x = initial.x + Math.sin(time * velocity.x + i) * 0.3
      let y = initial.y + Math.sin(time * velocity.y + i * 0.7) * 0.3
      const z = initial.z + Math.sin(time * velocity.z + i * 0.3) * 0.3

      // Cursor interaction - subtle attract effect
      if (cursorInteraction) {
        // Project particle to screen space (approximate)
        const particleScreenX = x / 8 // Normalize to roughly -1 to 1
        const particleScreenY = y / 8

        // Calculate distance to cursor
        const dx = mouseNDC.x - particleScreenX
        const dy = mouseNDC.y - particleScreenY
        const distToCursor = Math.sqrt(dx * dx + dy * dy)

        // Apply subtle attraction within range
        const attractRange = 0.5
        if (distToCursor < attractRange) {
          const strength = (1 - distToCursor / attractRange) * attractStrength
          x += dx * strength
          y += dy * strength
        }
      }

      positionAttribute.setXYZ(i, x, y, z)
    }

    positionAttribute.needsUpdate = true
  })

  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  )
}

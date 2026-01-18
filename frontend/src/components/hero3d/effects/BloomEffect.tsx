'use client'

// Note: Using a simplified glow approach instead of @react-three/postprocessing
// due to Three.js version compatibility issues. The glow is achieved through
// emissive materials and transparent outer shells on nodes instead.

interface BloomEffectProps {
  intensity?: number
  luminanceThreshold?: number
  luminanceSmoothing?: number
  enabled?: boolean
}

// This component is now a no-op placeholder since bloom is handled
// through material properties (emissive + transparent shells)
export function BloomEffect(_props: BloomEffectProps) {
  // Bloom is now achieved through emissive materials on nodes
  // and transparent glow shells, rather than post-processing
  return null
}

export function EnhancedBloomEffect(_props: {
  bloomIntensity?: number
  enabled?: boolean
}) {
  return null
}

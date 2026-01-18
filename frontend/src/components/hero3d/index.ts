// Main component
export { Hero3DScene } from './Hero3DScene'

// Core visualization
export { NetworkVisualization } from './NetworkVisualization'

// Node components
export { NetworkNode } from './nodes/NetworkNode'
export { NodeCluster } from './nodes/NodeCluster'

// Connection components
export { BezierConnection, LineConnection } from './connections/BezierConnection'
export { DataFlow, DataFlowBatch } from './connections/DataFlow'

// Effects
export { BloomEffect, EnhancedBloomEffect } from './effects/BloomEffect'
export { AmbientParticles, SparkleParticles } from './effects/AmbientParticles'

// UI components
export { NodeTooltip } from './ui/NodeTooltip'

// Context
export { ScrollProvider, useScrollContext, useScrollValue } from './context/ScrollContext'

// Hooks
export { useScrollCamera, useOrbitScroll } from './hooks/useScrollCamera'
export { useNodeHover } from './hooks/useNodeHover'
export { useAdaptiveQuality, useDeviceCapabilities, getInitialQuality } from './hooks/useAdaptiveQuality'

// Utils
export { generateNetwork, getNodeColor, getNodeSize } from './utils/networkGenerator'
export type { NetworkNode as NetworkNodeData, NetworkConnection, NetworkData } from './utils/networkGenerator'

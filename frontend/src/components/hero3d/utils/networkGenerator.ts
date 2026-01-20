import * as THREE from 'three'

export interface NetworkNode {
  id: string
  position: THREE.Vector3
  type: 'hub' | 'sensor' | 'device' | 'gateway'
  label: string
  connections: string[]
}

export interface NetworkConnection {
  id: string
  from: string
  to: string
  strength: number // 0-1
}

export interface NetworkData {
  nodes: NetworkNode[]
  connections: NetworkConnection[]
}

// Device type labels for tooltips
const deviceLabels: Record<string, string[]> = {
  hub: ['Central Hub', 'Main Controller', 'Data Aggregator'],
  sensor: ['Temperature Sensor', 'Motion Detector', 'Pressure Monitor', 'Light Sensor'],
  device: ['Smart Actuator', 'Relay Module', 'Display Unit', 'Camera Node'],
  gateway: ['Gateway Alpha', 'Gateway Beta', 'Edge Router']
}

// Generate spherical distribution for node positions
function fibonacciSphere(samples: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = phi * i

    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY

    points.push(new THREE.Vector3(x * radius, y * radius, z * radius))
  }

  return points
}

// Generate clustered positions around sphere
function generateClusteredPositions(
  nodeCount: number,
  radius: number,
  clusterCount: number = 4
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  const clusterCenters = fibonacciSphere(clusterCount, radius * 0.7)
  const nodesPerCluster = Math.ceil(nodeCount / clusterCount)

  clusterCenters.forEach((center) => {
    const clusterNodeCount = Math.min(
      nodesPerCluster,
      nodeCount - positions.length
    )

    for (let i = 0; i < clusterNodeCount; i++) {
      // Random offset from cluster center
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * radius * 0.5,
        (Math.random() - 0.5) * radius * 0.5,
        (Math.random() - 0.5) * radius * 0.5
      )

      const position = center.clone().add(offset)
      // Ensure within sphere bounds
      if (position.length() > radius) {
        position.normalize().multiplyScalar(radius)
      }
      positions.push(position)
    }
  })

  return positions
}

// Calculate distance between two nodes
function distance(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b)
}

// Generate network connections based on proximity
function generateConnections(
  nodes: NetworkNode[],
  maxDistance: number,
  maxConnectionsPerNode: number = 4
): NetworkConnection[] {
  const connections: NetworkConnection[] = []
  const connectionCounts: Map<string, number> = new Map()

  // Sort node pairs by distance
  const pairs: { from: NetworkNode; to: NetworkNode; dist: number }[] = []

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = distance(nodes[i].position, nodes[j].position)
      if (dist <= maxDistance) {
        pairs.push({ from: nodes[i], to: nodes[j], dist })
      }
    }
  }

  pairs.sort((a, b) => a.dist - b.dist)

  // Create connections respecting max connections per node
  pairs.forEach(({ from, to, dist }) => {
    const fromCount = connectionCounts.get(from.id) || 0
    const toCount = connectionCounts.get(to.id) || 0

    // Hub nodes can have more connections
    const fromMax = from.type === 'hub' ? maxConnectionsPerNode * 2 : maxConnectionsPerNode
    const toMax = to.type === 'hub' ? maxConnectionsPerNode * 2 : maxConnectionsPerNode

    if (fromCount < fromMax && toCount < toMax) {
      const strength = 1 - (dist / maxDistance)
      connections.push({
        id: `${from.id}-${to.id}`,
        from: from.id,
        to: to.id,
        strength
      })

      connectionCounts.set(from.id, fromCount + 1)
      connectionCounts.set(to.id, toCount + 1)

      from.connections.push(to.id)
      to.connections.push(from.id)
    }
  })

  return connections
}

// Main generator function
export function generateNetwork(options: {
  nodeCount?: number
  radius?: number
  hubCount?: number
  gatewayCount?: number
  connectionDistance?: number
}): NetworkData {
  const {
    nodeCount = 25,
    radius = 4,
    hubCount = 2,
    gatewayCount = 2,
    connectionDistance = 3
  } = options

  const positions = generateClusteredPositions(nodeCount, radius)
  const nodes: NetworkNode[] = []

  // Create nodes with types
  positions.forEach((position, index) => {
    let type: NetworkNode['type']

    if (index < hubCount) {
      type = 'hub'
    } else if (index < hubCount + gatewayCount) {
      type = 'gateway'
    } else if (Math.random() > 0.6) {
      type = 'sensor'
    } else {
      type = 'device'
    }

    const labels = deviceLabels[type]
    const label = labels[Math.floor(Math.random() * labels.length)]

    nodes.push({
      id: `node-${index}`,
      position,
      type,
      label,
      connections: []
    })
  })

  // Generate connections
  const connections = generateConnections(nodes, connectionDistance)

  return { nodes, connections }
}

// Get color for node type - cinematic palette
export function getNodeColor(type: NetworkNode['type']): string {
  switch (type) {
    case 'hub':
      return '#5EEAD4' // Cinematic teal
    case 'gateway':
      return '#8B5CF6' // Purple
    case 'sensor':
      return '#5EEAD4' // Cinematic teal
    case 'device':
    default:
      return '#5EEAD4' // Cinematic teal
  }
}

// Get size for node type
export function getNodeSize(type: NetworkNode['type']): number {
  switch (type) {
    case 'hub':
      return 0.25
    case 'gateway':
      return 0.2
    case 'sensor':
      return 0.12
    case 'device':
    default:
      return 0.15
  }
}

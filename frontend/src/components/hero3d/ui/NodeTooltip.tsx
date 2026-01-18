'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Radio, Router, Server } from 'lucide-react'

interface NodeTooltipProps {
  visible: boolean
  x: number
  y: number
  label: string
  type: string
  containerRef?: React.RefObject<HTMLElement>
}

const typeIcons: Record<string, React.ElementType> = {
  hub: Server,
  gateway: Router,
  sensor: Radio,
  device: Cpu
}

const typeDescriptions: Record<string, string> = {
  hub: 'Central processing unit',
  gateway: 'Network bridge',
  sensor: 'Data collection point',
  device: 'Smart actuator'
}

export function NodeTooltip({
  visible,
  x,
  y,
  label,
  type,
  containerRef
}: NodeTooltipProps) {
  const Icon = typeIcons[type] || Cpu

  // Adjust position to keep tooltip in view
  const adjustedX = Math.min(x, (containerRef?.current?.clientWidth || window.innerWidth) - 200)
  const adjustedY = Math.max(y - 80, 10)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute z-50 pointer-events-none"
          style={{
            left: adjustedX,
            top: adjustedY,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="bg-[#0a0a0f]/90 backdrop-blur-md border border-[#00D9FF]/30 rounded-lg px-4 py-3 shadow-xl shadow-[#00D9FF]/10">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 255, 240, 0.1))',
                  border: '1px solid rgba(0, 217, 255, 0.3)'
                }}
              >
                <Icon className="w-5 h-5 text-[#00D9FF]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-[#00D9FF]/70">{typeDescriptions[type] || type}</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Online</span>
            </div>
          </div>

          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(0, 217, 255, 0.3)'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

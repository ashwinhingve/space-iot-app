import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { sliderTrackVariants } from "@/lib/animations"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { 
    noAnimation?: boolean,
    colorScheme?: 'default' | 'blue' | 'purple' | 'green' | 'cyan'
  }
>(({ className, noAnimation = false, colorScheme = 'default', ...props }, ref) => {
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Color schemes
  const trackColors = {
    default: 'bg-primary/20 dark:bg-primary/20',
    blue: 'bg-blue-200/30 dark:bg-blue-500/20',
    purple: 'bg-purple-200/30 dark:bg-purple-500/20',
    green: 'bg-green-200/30 dark:bg-green-500/20',
    cyan: 'bg-cyan-200/30 dark:bg-cyan-500/20',
  }
  
  const rangeColors = {
    default: 'bg-primary dark:bg-primary',
    blue: 'bg-blue-500 dark:bg-blue-400',
    purple: 'bg-purple-500 dark:bg-purple-400',
    green: 'bg-green-500 dark:bg-green-400',
    cyan: 'bg-cyan-500 dark:bg-cyan-400',
  }
  
  const gradients = {
    default: 'from-primary to-primary/80 dark:from-primary to-primary/90',
    blue: 'from-blue-500 to-blue-400/80 dark:from-blue-400 to-blue-500/80',
    purple: 'from-purple-500 to-purple-400/80 dark:from-purple-400 to-purple-500/80',
    green: 'from-green-500 to-green-400/80 dark:from-green-400 to-green-500/80',
    cyan: 'from-cyan-500 to-cyan-400/80 dark:from-cyan-400 to-cyan-500/80',
  }
  
  const glowColors = {
    default: 'bg-primary/5 dark:bg-primary/10',
    blue: 'bg-blue-500/5 dark:bg-blue-400/10',
    purple: 'bg-purple-500/5 dark:bg-purple-400/10',
    green: 'bg-green-500/5 dark:bg-green-400/10',
    cyan: 'bg-cyan-500/5 dark:bg-cyan-400/10',
  }
  
  const thumbBorderColors = {
    default: 'border-primary/50 dark:border-primary/60',
    blue: 'border-blue-500/50 dark:border-blue-400/60',
    purple: 'border-purple-500/50 dark:border-purple-400/60',
    green: 'border-green-500/50 dark:border-green-400/60',
    cyan: 'border-cyan-500/50 dark:border-cyan-400/60',
  }
  
  const thumbGlowColors = {
    default: 'bg-primary/20 dark:bg-primary/30',
    blue: 'bg-blue-500/20 dark:bg-blue-400/30',
    purple: 'bg-purple-500/20 dark:bg-purple-400/30',
    green: 'bg-green-500/20 dark:bg-green-400/30',
    cyan: 'bg-cyan-500/20 dark:bg-cyan-400/30',
  }
  
  if (noAnimation) {
    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className={cn("relative h-2 w-full grow overflow-hidden rounded-full", trackColors[colorScheme])}>
          <SliderPrimitive.Range className={cn("absolute h-full", rangeColors[colorScheme])} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className={cn("block h-5 w-5 rounded-full border bg-background shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", thumbBorderColors[colorScheme])} />
      </SliderPrimitive.Root>
    )
  }
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <motion.div
        className={cn("relative h-2 w-full grow overflow-hidden rounded-full", trackColors[colorScheme])}
        variants={sliderTrackVariants}
        animate={isHovered ? "hover" : "idle"}
      >
        <SliderPrimitive.Track className="relative h-full w-full">
          <motion.div 
            className={cn("absolute inset-0", glowColors[colorScheme])}
            style={{ filter: "blur(4px)" }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
          <SliderPrimitive.Range className={cn("absolute h-full bg-gradient-to-r", gradients[colorScheme])} />
        </SliderPrimitive.Track>
      </motion.div>
      <motion.div
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <SliderPrimitive.Thumb 
          className={cn("block h-5 w-5 rounded-full border bg-background shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", thumbBorderColors[colorScheme])}
        >
          {isHovered && (
            <motion.span
              className={cn("absolute -inset-1 rounded-full", thumbGlowColors[colorScheme])}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ filter: "blur(2px)" }}
            />
          )}
        </SliderPrimitive.Thumb>
      </motion.div>
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider } 
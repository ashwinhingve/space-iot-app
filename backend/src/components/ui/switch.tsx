import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { switchVariants, thumbVariants } from "@/lib/animations"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & { 
    noAnimation?: boolean,
    colorScheme?: 'default' | 'blue' | 'purple' | 'green' | 'cyan' | 'amber'
  }
>(({ className, noAnimation = false, colorScheme = 'default', ...props }, ref) => {
  const checked = props.checked || false;
  
  const colors = {
    default: {
      bg: "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
      glow: "bg-primary",
    },
    blue: {
      bg: "data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-muted",
      glow: "bg-blue-500 dark:bg-blue-600",
    },
    purple: {
      bg: "data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-muted",
      glow: "bg-purple-500 dark:bg-purple-600",
    },
    green: {
      bg: "data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-muted",
      glow: "bg-green-500 dark:bg-green-600",
    },
    cyan: {
      bg: "data-[state=checked]:bg-cyan-500 dark:data-[state=checked]:bg-cyan-600 data-[state=unchecked]:bg-muted",
      glow: "bg-cyan-500 dark:bg-cyan-600",
    },
    amber: {
      bg: "data-[state=checked]:bg-amber-500 dark:data-[state=checked]:bg-amber-600 data-[state=unchecked]:bg-muted",
      glow: "bg-amber-500 dark:bg-amber-600",
    },
  }
  
  if (noAnimation) {
    return (
      <SwitchPrimitives.Root
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          colors[colorScheme].bg,
          className
        )}
        {...props}
        ref={ref}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitives.Root>
    )
  }
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 relative overflow-hidden",
        colors[colorScheme].bg,
        className
      )}
      {...props}
      ref={ref}
    >
      <motion.div 
        className="absolute inset-0 rounded-full"
        animate={checked ? "checked" : "unchecked"} 
        variants={switchVariants}
      />
      <motion.div
        className="pointer-events-none z-10 block h-5 w-5 rounded-full bg-background shadow-lg ring-0"
        animate={checked ? "checked" : "unchecked"}
        variants={thumbVariants}
      />
      {/* Subtle glow effect */}
      <motion.div
        className={cn("absolute inset-0 rounded-full opacity-0", colors[colorScheme].glow)}
        initial={{ opacity: 0 }}
        animate={{ opacity: checked ? 0.15 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ filter: "blur(4px)" }}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch } 
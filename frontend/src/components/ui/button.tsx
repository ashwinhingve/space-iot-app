import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { buttonVariants as buttonAnimationVariants } from "@/lib/animations"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:shadow-xl hover:shadow-primary/20 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:shadow-xl hover:shadow-destructive/20 hover:bg-destructive/90",
        outline:
          "border border-input bg-background/50 shadow-sm backdrop-blur-sm hover:bg-accent/50 hover:text-accent-foreground hover:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:shadow-xl hover:shadow-secondary/20 hover:bg-secondary/80",
        ghost: "hover:bg-accent/50 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        glow: "relative bg-primary/90 text-primary-foreground before:absolute before:inset-0 before:-z-10 before:bg-primary/50 before:blur-xl before:opacity-0 hover:before:opacity-70 before:transition",
        gradient: "relative text-white bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600",
        neutral: "bg-muted text-foreground border border-border/50 hover:bg-muted/80 dark:border-muted dark:bg-muted/50 dark:hover:bg-muted/70",
        subtle: "bg-background hover:bg-muted text-foreground border border-border/30 hover:border-border/50 shadow-sm",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  noAnimation?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, noAnimation = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Using standard button/slot if animations are disabled or asChild is true
    if (noAnimation || asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      )
    }

    // For animated buttons
    return (
      <motion.div
        className="contents"
        initial="idle"
        whileHover="hover"
        whileTap="tap"
        variants={buttonAnimationVariants}
      >
        <button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      </motion.div>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants } 
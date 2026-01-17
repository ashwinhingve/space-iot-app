import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { buttonVariants as buttonAnimationVariants } from "@/lib/animations"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:shadow-primary/20 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:shadow-destructive/20 hover:bg-destructive/90",
        outline:
          "border border-border/50 bg-background/50 shadow-sm backdrop-blur-sm hover:bg-secondary/80 hover:border-border transition-colors",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-secondary/50 hover:text-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline",
        // Premium variants
        premium:
          "relative overflow-hidden bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 text-white shadow-md hover:shadow-glow transition-all duration-300",
        success:
          "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm hover:shadow-md hover:shadow-emerald-500/30 hover:from-emerald-600 hover:to-green-700",
        glow: "relative bg-primary/90 text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all duration-300",
        gradient: "relative text-white bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 shadow-sm hover:shadow-md",
        glass: "glass-morphism hover:bg-white/10 dark:hover:bg-white/5 backdrop-blur-md border border-white/20 shadow-sm",
        neutral: "bg-muted text-foreground border border-border/50 hover:bg-muted/80 dark:border-muted dark:bg-muted/50 dark:hover:bg-muted/70",
        subtle: "bg-background hover:bg-muted text-foreground border border-border/30 hover:border-border/50 shadow-sm",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
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
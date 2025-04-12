import * as React from "react"
import { cn } from "@/lib/utils"
 
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// New component for glowing gradients
const CardGlow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { colorScheme?: 'blue' | 'purple' | 'pink' | 'cyan' | 'green' }
>(({ className, colorScheme = 'blue', ...props }, ref) => {
  const gradients = {
    blue: "from-blue-500 via-indigo-500 to-blue-600 dark:from-blue-600 dark:via-indigo-600 dark:to-blue-700",
    purple: "from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600",
    pink: "from-pink-500 via-rose-500 to-pink-600 dark:from-pink-600 dark:via-rose-600 dark:to-pink-700",
    cyan: "from-cyan-500 via-blue-500 to-cyan-600 dark:from-cyan-600 dark:via-blue-600 dark:to-cyan-700",
    green: "from-green-500 via-emerald-500 to-green-600 dark:from-green-600 dark:via-emerald-600 dark:to-green-700",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 -z-10 bg-gradient-to-r opacity-20 blur-2xl rounded-[inherit] transition-opacity",
        gradients[colorScheme],
        className
      )}
      {...props}
    />
  )
})
CardGlow.displayName = "CardGlow"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardGlow
} 
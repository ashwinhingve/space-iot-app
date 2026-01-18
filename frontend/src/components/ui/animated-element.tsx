'use client'

import { ReactNode } from 'react'
import { motion, Variants, AnimatePresence } from 'framer-motion'
import { 
  fadeIn, 
  slideUp, 
  slideInLeft, 
  slideInRight, 
  scaleUp,
  tiltVariants
} from '@/lib/animations'
import { useTheme } from 'next-themes'

type AnimationType = 'fade' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'tilt' | 'bounce' | 'rotate' | 'flip'

interface AnimatedElementProps {
  children: ReactNode
  animation: AnimationType
  delay?: number
  className?: string
  duration?: number
  threshold?: number
  once?: boolean
  darkModeInvert?: boolean
}

// Define additional animation variants
const bounceAnimation: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 10,
      duration: 0.8 
    }
  }
};

const rotateAnimation: Variants = {
  hidden: { opacity: 0, rotateZ: -10 },
  visible: { 
    opacity: 1, 
    rotateZ: 0,
    transition: { 
      type: "spring",
      stiffness: 100,
      damping: 20,
      duration: 0.8
    }
  }
};

const flipAnimation: Variants = {
  hidden: { opacity: 0, rotateX: 90 },
  visible: { 
    opacity: 1, 
    rotateX: 0,
    transition: { 
      type: "spring",
      stiffness: 100,
      damping: 20,
      duration: 0.8
    }
  }
};

// Invert variants - useful for dark mode considerations
const invertVariants = (variants: Variants): Variants => {
  if (variants.hidden && 'y' in variants.hidden && typeof variants.hidden.y === 'number') {
    return {
      hidden: { ...variants.hidden, y: -variants.hidden.y },
      visible: variants.visible
    };
  }
  
  return variants;
};

export function AnimatedElement({ 
  children, 
  animation, 
  delay = 0, 
  className = '',
  duration,
  threshold = 0.3,
  once = true,
  darkModeInvert = false
}: AnimatedElementProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Select animation variant based on prop
  const getVariant = (): Variants => {
    let variant: Variants;
    
    switch (animation) {
      case 'fade': variant = fadeIn; break;
      case 'slideUp': variant = slideUp; break;
      case 'slideLeft': variant = slideInLeft; break;
      case 'slideRight': variant = slideInRight; break;
      case 'scale': variant = scaleUp; break;
      case 'tilt': variant = tiltVariants; break;
      case 'bounce': variant = bounceAnimation; break;
      case 'rotate': variant = rotateAnimation; break;
      case 'flip': variant = flipAnimation; break;
      default: variant = fadeIn;
    }
    
    // Apply inversion for dark mode if needed
    if (darkModeInvert && isDark) {
      variant = invertVariants(variant);
    }
    
    // If duration is provided, customize the transition
    if (duration && variant.visible && typeof variant.visible === 'object' && 'transition' in variant.visible) {
      return {
        ...variant,
        visible: {
          ...variant.visible,
          transition: {
            ...variant.visible.transition,
            duration
          }
        }
      };
    }
    
    return variant;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px", amount: threshold }}
      variants={getVariant()}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Container that animates children with staggered timing
export function AnimatedContainer({ 
  children, 
  className = '',
  delay = 0,
  staggerDelay = 0.1,
  threshold = 0.3,
  once = true
}: {
  children: ReactNode
  className?: string
  delay?: number
  staggerDelay?: number
  threshold?: number
  once?: boolean
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px", amount: threshold }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Element that appears and disappears with animation
export function FadePresence({
  show,
  children,
  className = '',
  mode = 'default'
}: {
  show: boolean
  children: ReactNode
  className?: string
  mode?: 'default' | 'slide' | 'scale' | 'fade'
}) {
  const animations = {
    default: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
      transition: { type: "spring" as const, stiffness: 300, damping: 30 }
    },
    slide: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
      transition: { type: "spring" as const, stiffness: 300, damping: 30 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.1 },
      transition: { type: "spring" as const, stiffness: 300, damping: 30 }
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 }
    }
  };
  
  const animation = animations[mode];

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={animation.initial}
          animate={animation.animate}
          exit={animation.exit}
          transition={animation.transition}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
} 
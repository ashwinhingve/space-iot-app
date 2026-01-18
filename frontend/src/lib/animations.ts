import { Variants } from 'framer-motion';

// Shared transition for performance - using as const for proper typing
const smoothTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const };
const springTransition = { type: "spring" as const, stiffness: 260, damping: 20 };

// Fade in animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: smoothTransition
  }
};

// Slide in from bottom
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition
  }
};

// Slide in from right
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition
  }
};

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothTransition
  }
};

// Staggered container animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// Scale animation
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: smoothTransition
  }
};

// Hover effects for interactive elements
export const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2 }
};

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: smoothTransition
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Button animations (lightweight)
export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// Card animations
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition
  },
  hover: {
    y: -4,
    transition: { duration: 0.2 }
  }
};

// Switch animations
export const switchVariants = {
  checked: {
    backgroundColor: "var(--primary)",
    transition: { duration: 0.2 }
  },
  unchecked: {
    backgroundColor: "var(--muted)",
    transition: { duration: 0.2 }
  }
};

// Thumb animations for switch and slider
export const thumbVariants = {
  checked: {
    x: 16,
    transition: springTransition
  },
  unchecked: {
    x: 0,
    transition: springTransition
  }
};

// Slider track animations
export const sliderTrackVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.01,
    transition: { duration: 0.2 }
  }
};

// Tilt animation variants
export const tiltVariants: Variants = {
  hidden: { opacity: 0, rotateY: -15 },
  visible: {
    opacity: 1,
    rotateY: 0,
    transition: smoothTransition
  }
}; 
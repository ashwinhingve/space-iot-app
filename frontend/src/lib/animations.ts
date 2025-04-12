import { Variants } from 'framer-motion';

// Fade in animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

// Slide in from bottom
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  }
};

// Slide in from right
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  }
};

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.6
    }
  }
};

// Staggered container animation
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Scale animation
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.5
    }
  }
};

// Hover effects for interactive elements
export const hoverScale = {
  scale: 1.05,
  transition: { 
    type: "spring",
    stiffness: 300,
    damping: 10,
    duration: 0.2
  }
};

// Page transition variants
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.4, ease: 'easeIn' }
  }
};

// Button animations
export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { 
    scale: 1.05,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.98,
    boxShadow: "0 5px 10px -3px rgba(0, 0, 0, 0.3)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 15
    }
  }
};

// Card animations
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    }
  },
  hover: {
    y: -10,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15
    }
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
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  unchecked: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  }
};

// Slider track animations
export const sliderTrackVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

// 3D tilt effect
export const tiltVariants = {
  rest: { 
    rotateX: 0, 
    rotateY: 0,
    rotateZ: 0,
    scale: 1
  },
  hover: { 
    rotateX: 10, 
    rotateY: -10, 
    rotateZ: 2,
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15
    }
  }
}; 
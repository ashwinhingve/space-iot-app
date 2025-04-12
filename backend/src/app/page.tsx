'use client'

import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { Button } from '@/components/ui/button'
import { 
  motion, 
  useScroll, 
  useTransform, 
  useSpring, 
  AnimatePresence,
} from 'framer-motion'
import { 
  Zap, 
  LineChart, 
  Shield, 
  Cloud, 
  Smartphone, 
  Settings, 
  Activity, 
  ArrowRight,
  ChevronDown,
  Globe,
  Cpu,
  BarChart
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
// import { 
//   fadeIn, 
//   slideUp, 
//   slideInLeft, 
//   slideInRight, 
//   staggerContainer, 
//   scaleUp 
// } from '@/lib/animations'
import { AnimatedElement, AnimatedContainer } from '@/components/ui/animated-element'
// import { useTheme } from 'next-themes'
import { AnimatedParticles } from '@/components/AnimatedParticles'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren",
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 100,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}

// // Enhanced animation variants
// const fadeInUp = {
//   hidden: { y: 40, opacity: 0 },
//   visible: {
//     y: 0,
//     opacity: 1,
//     transition: {
//       type: "spring",
//       damping: 25,
//       stiffness: 120,
//       duration: 0.8,
//       ease: [0.22, 1, 0.36, 1]
//     }
//   }
// }

// const scaleIn = {
//   hidden: { scale: 0.95, opacity: 0 },
//   visible: {
//     scale: 1,
//     opacity: 1,
//     transition: {
//       type: "spring",
//       stiffness: 100,
//       damping: 15,
//       delay: 0.2
//     }
//   }
// }

// // Staggered List for Cards
// const staggeredList = {
//   hidden: { opacity: 0 },
//   visible: {
//     opacity: 1,
//     transition: {
//       staggerChildren: 0.15,
//       delayChildren: 0.3,
//     }
//   }
// }

// // Card animation
// const cardAnimation = {
//   hidden: { y: 50, opacity: 0 },
//   visible: {
//     y: 0,
//     opacity: 1,
//     transition: {
//       type: "spring",
//       damping: 25,
//       stiffness: 100
//     }
//   },
//   hover: {
//     y: -10,
//     boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
//     transition: {
//       type: "spring",
//       damping: 25,
//       stiffness: 120
//     }
//   }
// }

// // Path animation for SVG elements
// const pathAnimation = {
//   hidden: { pathLength: 0, opacity: 0 },
//   visible: {
//     pathLength: 1,
//     opacity: 1,
//     transition: { duration: 1.5, ease: "easeInOut" }
//   }
// }

// // 3D Tilt effect values
// const tiltValues = {
//   rest: { rotateX: 0, rotateY: 0, scale: 1 },
//   hover: { rotateX: 10, rotateY: -10, scale: 1.05, z: 100 }
// }

// Features data
const features = [
  {
    title: 'Real-Time Monitoring',
    description: 'Monitor your IoT devices with real-time updates and instant alerts for critical events.',
    icon: <Zap className="h-8 w-8 text-blue-400" />,
    gradient: 'from-blue-500 to-cyan-400'
  },
  {
    title: 'Custom Dashboards',
    description: 'Create beautiful custom dashboards to visualize your data exactly how you need it.',
    icon: <LineChart className="h-8 w-8 text-purple-400" />,
    gradient: 'from-purple-500 to-pink-400'
  },
  {
    title: 'Secure Access',
    description: 'Enterprise-grade security with advanced user management and granular access controls.',
    icon: <Shield className="h-8 w-8 text-green-400" />,
    gradient: 'from-green-500 to-emerald-400'
  },
  {
    title: 'Cloud Connectivity',
    description: 'Connect your devices to the cloud for seamless data storage, analysis and retrieval.',
    icon: <Cloud className="h-8 w-8 text-cyan-400" />,
    gradient: 'from-cyan-500 to-blue-400'
  }
]

// Solutions data
const solutions = [
  {
    title: 'Smart Home',
    description: 'Create the perfect home automation system with easy device integration and intuitive control.',
    icon: <Smartphone className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-blue-400 to-cyan-500'
  },
  {
    title: 'Industrial IoT',
    description: 'Monitor industrial equipment, track assets, and optimize production processes with real-time insights.',
    icon: <Settings className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-purple-400 to-indigo-500'
  },
  {
    title: 'Smart Agriculture',
    description: 'Monitor soil conditions, automate irrigation systems, and dramatically improve crop yields with IoT.',
    icon: <Activity className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-green-400 to-emerald-500'
  },
  {
    title: 'Smart Cities',
    description: 'Build connected urban infrastructure with solutions for lighting, traffic, waste management and more.',
    icon: <Globe className="h-6 w-6" />,
    color: 'bg-gradient-to-br from-amber-400 to-orange-500'
  }
]

// Testimonial data
const testimonials = [
  {
    name: 'TechCorp Industries',
    role: 'Smart Manufacturing',
    initial: 'TC',
    quote: "IoT Space helped us reduce our equipment downtime by 35% with real-time monitoring and predictive maintenance alerts.",
    gradient: 'from-blue-500 to-cyan-600'
  },
  {
    name: 'GreenField Farms',
    role: 'Smart Agriculture',
    initial: 'GF',
    quote: "We've cut water usage by 40% and increased crop yields by 28% using IoT Space's automated irrigation system.",
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    name: 'SmartLife Homes',
    role: 'Home Automation',
    initial: 'SL',
    quote: "IoT Space's platform allowed us to integrate over 50 different smart home devices for our customers with minimal development time.",
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    name: 'CityTech Solutions',
    role: 'Smart City Applications',
    initial: 'CS',
    quote: "The IoT Space platform powers our city-wide infrastructure monitoring, reducing energy usage by 25% across all monitored systems.",
    gradient: 'from-amber-500 to-orange-600'
  }
]

// Stats
const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '50ms', label: 'Average Response Time' },
  { value: '10M+', label: 'Devices Connected' },
  { value: '120+', label: 'Countries Served' }
]

export default function HomePage() {
  // Refs for sections
  const heroRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const solutionsRef = useRef<HTMLElement>(null);
  const testimonialsRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  
  // Theme support
  // const { theme } = useTheme();
  // const isDark = theme === 'dark';
  
  // For parallax and scroll effects
  const { scrollY, scrollYProgress } = useScroll();
  const smoothScrollY = useSpring(scrollY, { damping: 50, stiffness: 400 });
  const smoothProgress = useSpring(scrollYProgress, { damping: 50, stiffness: 400 });
  
  // Transform values based on scroll
  const y = useTransform(smoothScrollY, [0, 500], [0, -100]);
  // const opacity = useTransform(smoothProgress, [0, 0.2], [1, 0.2]);
  const scale = useTransform(smoothProgress, [0, 0.2], [1, 0.95]);
  
  // Enhanced parallax effects
  const heroOpacity = useTransform(smoothProgress, [0, 0.25], [1, 0]);
  const parallax1 = useTransform(smoothScrollY, [0, 1000], [0, -300]);
  const parallax2 = useTransform(smoothScrollY, [0, 1000], [0, -150]);
  const rotation = useTransform(smoothScrollY, [0, 1000], [0, 10]);
  
  // Additional motion values for enhanced effects
  // const bgBlur = useTransform(smoothProgress, [0, 0.5], [0, 10]);
  const textGradientPos = useTransform(smoothScrollY, [0, 1000], [0, 100]);
  
  // Visibility state for animations
  const [isLoaded, setIsLoaded] = useState(false);

  // Detect visibility for each section
  useEffect(() => {
    setIsLoaded(true);
    
    const observer = new IntersectionObserver(() => {
      // We don't need to track the visible section since it's not used elsewhere
    }, { threshold: 0.3 });
    
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => observer.observe(section));
    
    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  return (
    <MainLayout>
      {/* Hero Section */}
      <motion.section 
        id="hero"
        ref={heroRef} 
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background dark:bg-[#0F172A] text-foreground dark:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Enhanced Background with multiple animated layers */}
        <div className="absolute inset-0 z-0">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-radial from-blue-100/30 via-background/80 to-background dark:from-blue-900/30 dark:via-[#0F172A]/80 dark:to-[#0F172A] opacity-80"></div>
          
          {/* Animated particles */}
          <AnimatedParticles count={20} className="absolute inset-0 opacity-30" />
          
          {/* Animated grid pattern */}
          <motion.div 
            className="absolute inset-0 z-10 opacity-10"
            style={{ y, rotateZ: rotation }}
          >
            <div className="absolute top-0 left-0 w-full h-full">
              <svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <motion.path 
                      d="M 40 0 L 0 0 0 40" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="0.5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </motion.div>
          
          {/* Enhanced animated colored orbs with glow */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-200/10 dark:bg-blue-500/10 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1], 
              x: [0, 20, 0], 
              y: [0, -20, 0],
              opacity: [0.5, 0.7, 0.5]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ x: parallax1 }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-200/10 dark:bg-purple-500/10 blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1], 
              x: [0, -30, 0], 
              y: [0, 20, 0],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            style={{ x: parallax2 }}
          />
          <motion.div 
            className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full bg-cyan-200/10 dark:bg-cyan-500/10 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1], 
              x: [0, -20, 0], 
              y: [0, -30, 0],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          
          {/* Second set of particles */}
          <div className="absolute inset-0">
            {typeof window !== 'undefined' && Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                }}
                animate={{
                  y: [0, Math.random() * -100 - 50],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: Math.random() * 5 + 10,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        </div>
        
        <AnimatePresence>
          {isLoaded && (
            <motion.div 
              style={{ opacity: heroOpacity, scale }}
              className="container relative z-10 px-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 1,
                  delay: 0.2,
                  type: "spring",
                  stiffness: 100,
                  damping: 20
                }}
              >
                <motion.h1 
                  className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500"
                  style={{
                    backgroundPosition: `${textGradientPos.get()}% center`,
                    backgroundSize: '200% auto'
                  }}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    ease: [0.22, 1, 0.36, 1],
                    type: "spring",
                    stiffness: 100,
                    damping: 20
                  }}
                >
                  <span className="inline-block">IoT Space</span>
                </motion.h1>
              </motion.div>
              
              <motion.p 
                className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-foreground/80 dark:text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.5, 
                  ease: [0.22, 1, 0.36, 1] 
                }}
              >
                The most advanced IoT platform to connect, monitor, and control your devices from anywhere.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    asChild 
                    size="lg" 
                    className="relative overflow-hidden group transition-all shadow-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 border-0 h-14 px-8"
                  >
                    <Link href="/register">
                      <motion.span 
                        className="relative z-10 flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        Get Started For Free
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </motion.span>
                      <span className="absolute inset-0 bg-white/10 dark:bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
                    </Link>
                  </Button>
                </motion.div>
                
                <motion.div 
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant="outline" 
                    size="lg" 
                    asChild 
                    className="transition-all border-border hover:bg-muted dark:border-white/20 dark:hover:bg-white/10 h-14 px-8"
                  >
                    <Link href="/dashboard">
                      <motion.span 
                        className="relative z-10 flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        View Live Demo
                      </motion.span>
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Enhanced Floating Device Mockups */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-6xl">
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              duration: 1, 
              delay: 0.8,
              type: "spring",
              stiffness: 50,
              damping: 15
            }}
            className="relative h-64 md:h-96"
          >
            <motion.div 
              className="absolute top-0 left-1/4 transform -translate-x-1/2 w-32 h-32 md:w-64 md:h-64 bg-blue-200/20 dark:bg-blue-500/20 rounded-2xl blur-xl"
              animate={{ 
                scale: [1, 1.1, 1], 
                opacity: [0.5, 0.7, 0.5],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute top-0 right-1/4 transform translate-x-1/2 w-32 h-32 md:w-64 md:h-64 bg-purple-200/20 dark:bg-purple-500/20 rounded-2xl blur-xl"
              animate={{ 
                scale: [1, 1.2, 1], 
                opacity: [0.5, 0.8, 0.5],
                rotate: [0, -5, 0]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            
            {/* Dashboard Mockup */}
            <motion.div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full backdrop-blur-md bg-white/10 dark:bg-gray-900/50 rounded-t-xl overflow-hidden border border-border dark:border-gray-800 border-b-0 shadow-2xl"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ 
                duration: 0.7, 
                delay: 0.8, 
                ease: [0.22, 1, 0.36, 1],
                type: "spring",
                stiffness: 50,
                damping: 15
              }}
              whileHover={{ 
                y: -10,
                transition: { 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 30 
                }
              }}
            >
              <div className="w-full h-6 bg-muted/80 dark:bg-gray-800/80 flex items-center px-4">
                <div className="flex space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="w-full aspect-[16/9] relative bg-card/80 dark:bg-[#0F172A]/80 flex items-center justify-center p-4">
                <div className="absolute inset-0 grid grid-cols-2 gap-2 p-4">
                  <div className="bg-muted/50 dark:bg-gray-800/50 rounded-lg p-2 flex flex-col">
                    <div className="h-2 w-16 bg-blue-300/40 dark:bg-blue-500/40 rounded mb-2"></div>
                    <div className="h-20 bg-blue-200/20 dark:bg-blue-500/20 rounded flex items-center justify-center">
                      <LineChart className="h-8 w-8 text-blue-400/40" />
                    </div>
                  </div>
                  <div className="bg-muted/50 dark:bg-gray-800/50 rounded-lg p-2 flex flex-col">
                    <div className="h-2 w-20 bg-purple-300/40 dark:bg-purple-500/40 rounded mb-2"></div>
                    <div className="h-20 bg-purple-200/20 dark:bg-purple-500/20 rounded flex items-center justify-center">
                      <BarChart className="h-8 w-8 text-purple-400/40" />
                    </div>
                  </div>
                  <div className="bg-muted/50 dark:bg-gray-800/50 rounded-lg p-2 flex flex-col">
                    <div className="h-2 w-14 bg-cyan-300/40 dark:bg-cyan-500/40 rounded mb-2"></div>
                    <div className="h-20 bg-cyan-200/20 dark:bg-cyan-500/20 rounded flex items-center justify-center">
                      <Cpu className="h-8 w-8 text-cyan-400/40" />
                    </div>
                  </div>
                  <div className="bg-muted/50 dark:bg-gray-800/50 rounded-lg p-2 flex flex-col">
                    <div className="h-2 w-16 bg-green-300/40 dark:bg-green-500/40 rounded mb-2"></div>
                    <div className="h-20 bg-green-200/20 dark:bg-green-500/20 rounded flex items-center justify-center">
                      <Activity className="h-8 w-8 text-green-400/40" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex flex-col items-center"
          >
            <span className="text-sm text-foreground/50 dark:text-gray-300 mb-2">Scroll to explore</span>
            <ChevronDown className="h-6 w-6 text-foreground dark:text-white" />
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section 
        id="features" 
        ref={featuresRef} 
        className="py-28 bg-muted/50 dark:bg-[#1E293B] relative overflow-hidden"
      >
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-200/5 dark:bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-purple-200/5 dark:bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <AnimatedContainer className="text-center mb-20">
            <AnimatedElement animation="slideUp" className="inline-block mb-4">
              <span className="inline-block py-1 px-3 bg-blue-500/10 rounded-full text-blue-400 text-sm font-medium border border-blue-500/20 mb-2">
                Powerful Features
              </span>
            </AnimatedElement>
            
            <AnimatedElement animation="slideUp" delay={0.1}>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500">
                Everything You Need for Your IoT Projects
              </h2>
            </AnimatedElement>
            
            <AnimatedElement animation="slideUp" delay={0.2} className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-300">
                Build powerful IoT applications without coding expertise. Connect, visualize, and control all your devices in minutes.
              </p>
            </AnimatedElement>
          </AnimatedContainer>
          
          {/* Stats */}
          <AnimatedContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-20">
            {stats.map((stat, index) => (
              <AnimatedElement 
                key={index} 
                animation="scale" 
                delay={index * 0.1}
                className="text-center"
              >
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <motion.div 
                    className="absolute inset-0 bg-blue-500/10 rounded-xl blur-sm"
                    animate={{ 
                      scale: [0.9, 1.02, 0.9],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut",
                      delay: index * 0.5
                    }}
                  />
                  <div className="bg-[#0F172A]/80 backdrop-blur-sm rounded-xl p-6 border border-gray-800/50 relative z-10">
                    <h3 className="text-3xl md:text-4xl font-bold mb-1 text-white">
                      {stat.value}
                    </h3>
                    <p className="text-gray-400">{stat.label}</p>
                  </div>
                </motion.div>
              </AnimatedElement>
            ))}
          </AnimatedContainer>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <AnimatedElement 
                key={index} 
                animation="slideUp" 
                delay={index * 0.1 + 0.2}
              >
                <motion.div 
                  className="bg-[#0F172A] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 h-full border border-gray-800/50 relative z-10"
                  whileHover={{ 
                    y: -10, 
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)", 
                    transition: { duration: 0.3 }
                  }}
                  initial="rest"
                  animate="rest"
                >
                  <div className={`h-2 w-full bg-gradient-to-r ${feature.gradient}`}></div>
                  <div className="p-6">
                    <motion.div 
                      className="mb-6 flex justify-center items-center w-16 h-16 rounded-lg bg-gray-800/80"
                      whileHover={{ 
                        rotate: 5, 
                        scale: 1.1,
                        transition: { 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 10 
                        }
                      }}
                    >
                      {feature.icon}
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3 text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section 
        id="solutions" 
        ref={solutionsRef} 
        className="py-28 bg-background dark:bg-[#0F172A] relative overflow-hidden"
      >
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute top-0 left-0 w-full opacity-5" viewBox="0 0 800 800">
            <motion.path 
              d="M 0,400 C 0,400 200,100 400,400 C 600,700 800,400 800,400 L 800,800 L 0,800 L 0,400 Z" 
              fill="none" 
              stroke="url(#gradient1)" 
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <AnimatedContainer className="text-center mb-20">
            <AnimatedElement animation="slideUp" className="inline-block mb-4">
              <span className="inline-block py-1 px-3 bg-purple-500/10 rounded-full text-purple-400 text-sm font-medium border border-purple-500/20 mb-2">
                Industry Solutions
              </span>
            </AnimatedElement>
            
            <AnimatedElement animation="slideUp" delay={0.1}>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500">
                Solutions for Every Industry
              </h2>
            </AnimatedElement>
            
            <AnimatedElement animation="slideUp" delay={0.2} className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-300">
                From smart homes to industrial automation, IoT Space provides tailored solutions for businesses of all sizes.
              </p>
            </AnimatedElement>
          </AnimatedContainer>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {solutions.map((solution, index) => (
              <AnimatedElement 
                key={index} 
                animation="scale" 
                delay={index * 0.1 + 0.3}
              >
                <motion.div 
                  className="backdrop-blur-md bg-[#1E293B]/30 p-6 rounded-xl border border-gray-800/50 h-full"
                  whileHover={{ scale: 1.03, transition: { duration: 0.3 } }}
                >
                  <motion.div 
                    className={`flex items-center justify-center w-16 h-16 rounded-full ${solution.color} text-white mb-6`}
                    whileHover={{ rotate: 5, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    {solution.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3 text-white">{solution.title}</h3>
                  <p className="text-gray-400 mb-4">{solution.description}</p>
                  <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 300, damping: 10 }}>
                    <Link 
                      href={`/solutions/${solution.title.toLowerCase().replace(' ', '-')}`} 
                      className="text-blue-400 hover:text-blue-300 flex items-center group"
                    >
                      Learn more
                      <motion.span
                        className="ml-1 inline-block"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ 
                          repeat: Infinity, 
                          repeatType: "loop",
                          duration: 1.5,
                          repeatDelay: 1
                        }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.span>
                    </Link>
                  </motion.div>
                </motion.div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section 
        id="testimonials" 
        ref={testimonialsRef} 
        className="py-28 bg-muted/50 dark:bg-[#1E293B] relative overflow-hidden"
      >
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          
          {/* Abstract svg background */}
          <div className="absolute inset-0 opacity-5">
            <svg 
              viewBox="0 0 1000 1000" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full opacity-50"
            >
              <motion.path 
                d="M0,500 C200,300 400,100 500,500 C600,900 800,700 1000,500 L1000,1000 L0,1000 Z"
                fill="url(#testimonial-gradient)"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="testimonial-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <AnimatedContainer className="text-center mb-20">
            <AnimatedElement animation="slideUp" className="inline-block mb-4">
              <span className="inline-block py-1 px-3 bg-cyan-500/10 rounded-full text-cyan-400 text-sm font-medium border border-cyan-500/20 mb-2">
                Success Stories
              </span>
            </AnimatedElement>
            
            <AnimatedElement animation="slideUp" delay={0.1}>
              <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                Trusted by Innovators Worldwide
              </h2>
            </AnimatedElement>
            
            <AnimatedElement animation="slideUp" delay={0.2} className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-300">
                See how companies are transforming their operations with IoT Space.
              </p>
            </AnimatedElement>
          </AnimatedContainer>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <AnimatedElement 
                key={index} 
                animation="scale" 
                delay={index * 0.1 + 0.3}
              >
                <motion.div 
                  className="bg-[#0F172A] p-6 rounded-xl border border-gray-800 h-full"
                  whileHover={{ 
                    y: -5, 
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", 
                    transition: { duration: 0.3 } 
                  }}
                >
                  <motion.div 
                    className="flex items-center mb-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                      {testimonial.initial}
                    </div>
                    <div className="ml-4">
                      <h4 className="font-bold text-white">{testimonial.name}</h4>
                      <p className="text-gray-400 text-sm">{testimonial.role}</p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="relative"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <div className="absolute -top-4 -left-2 text-5xl text-blue-500/20 font-serif">&quot;</div>
                    <p className="text-gray-300 relative z-10">
                      {testimonial.quote}
                    </p>
                    <div className="absolute -bottom-6 -right-2 text-5xl text-blue-500/20 font-serif rotate-180">&quot;</div>
                  </motion.div>
                </motion.div>
              </AnimatedElement>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section 
        id="cta" 
        ref={ctaRef} 
        className="py-28 relative overflow-hidden"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900">
          {/* Animated particles */}
          <AnimatedParticles count={40} className="absolute inset-0" color="bg-white" />
          
          {/* Animated pattern overlay */}
          <motion.div 
            className="absolute top-0 left-0 right-0 bottom-0 opacity-20"
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
              backgroundSize: '600px 600px'
            }}
          />
          
          {/* Glowing orbs */}
          <motion.div 
            className="absolute right-1/4 bottom-1/3 w-64 h-64 rounded-full bg-blue-500/30 blur-3xl"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute left-1/4 top-1/3 w-64 h-64 rounded-full bg-purple-500/30 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <AnimatedContainer className="bg-gradient-to-r from-blue-900/80 to-purple-900/80 backdrop-blur-md p-12 rounded-2xl border border-white/10 shadow-2xl">
              <AnimatedElement animation="slideUp">
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white text-center">
                  Start Building Your IoT Project Today
                </h2>
              </AnimatedElement>
              
              <AnimatedElement animation="slideUp" delay={0.1}>
                <p className="text-xl mb-10 text-white/90 text-center">
                  Join thousands of developers and businesses who are transforming their ideas into reality with IoT Space.
                </p>
              </AnimatedElement>
              
              <AnimatedElement animation="scale" delay={0.2}>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-md opacity-75"></div>
                    <Button 
                      asChild 
                      size="lg" 
                      className="relative bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 font-bold text-white h-14 px-8 rounded-lg border-0"
                    >
                      <Link href="/register">
                        <motion.span className="flex items-center">
                          Start Free Trial
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </motion.span>
                      </Link>
                    </Button>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant="outline" 
                      asChild 
                      size="lg" 
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10 h-14 px-8 rounded-lg"
                    >
                      <Link href="/pricing">
                        View Pricing
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </AnimatedElement>
              
              <AnimatedElement animation="fade" delay={0.3} className="mt-12">
                <div className="flex flex-wrap justify-center items-center gap-6 text-white/60 text-sm">
                  <span>No credit card required</span>
                  <span className="hidden md:inline">•</span>
                  <span>Free 14-day trial</span>
                  <span className="hidden md:inline">•</span>
                  <span>Cancel anytime</span>
                  <span className="hidden md:inline">•</span>
                  <span>24/7 support</span>
                </div>
              </AnimatedElement>
            </AnimatedContainer>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
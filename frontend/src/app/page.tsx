'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MainLayout } from '@/components/MainLayout'
import { ParticleBackground, FloatingOrbs } from '@/components/ParticleBackground'

// Dynamically import Hero3DScene with SSR disabled to avoid window reference errors
const Hero3DScene = dynamic(
  () => import('@/components/hero3d').then((mod) => mod.Hero3DScene),
  { ssr: false }
)
// GSAP scroll reveal components (available for use)
// import { ScrollReveal, ScrollRevealGroup } from '@/components/ui/ScrollReveal'
// import { TextReveal, AnimatedHeadline } from '@/components/ui/TextReveal'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Zap,
  LineChart,
  Shield,
  Cloud,
  Smartphone,
  Cpu,
  Wifi,
  ArrowRight,
  Globe,
  Sparkles,
  Play,
  Check,
  Star,
  Users,
  Activity,
  Lock,
} from 'lucide-react'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Animation variants - cinematic timing with blur transitions
const easeOut = [0.16, 1, 0.3, 1] as const

const fadeInUp = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeOut }
  }
} as const

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' as const }
  }
} as const

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
} as const

const slideInLeft = {
  hidden: { opacity: 0, x: -40, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeOut }
  }
} as const

const slideInRight = {
  hidden: { opacity: 0, x: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeOut }
  }
} as const

// Features data
const features = [
  {
    title: 'Real-Time Sync',
    description: 'Instant data synchronization across all connected devices with sub-millisecond latency.',
    icon: Zap,
  },
  {
    title: 'Visual Analytics',
    description: 'Beautiful dashboards that transform complex IoT data into actionable insights.',
    icon: LineChart,
  },
  {
    title: 'Enterprise Security',
    description: 'Bank-grade encryption and authentication protecting every data transmission.',
    icon: Shield,
  },
  {
    title: 'Cloud Native',
    description: 'Infinitely scalable infrastructure that grows with your device fleet.',
    icon: Cloud,
  },
  {
    title: 'Cross-Platform',
    description: 'Control your devices from any browser, mobile app, or API integration.',
    icon: Smartphone,
  },
  {
    title: 'Edge Computing',
    description: 'Process data at the edge for faster response times and reduced bandwidth.',
    icon: Cpu,
  },
]

// Stats
const stats = [
  { value: '99.99%', label: 'Uptime SLA', suffix: '' },
  { value: '50', label: 'Response Time', suffix: 'ms' },
  { value: '10M', label: 'Devices Connected', suffix: '+' },
  { value: '150', label: 'Countries', suffix: '+' },
]

// Use cases
const useCases = [
  {
    title: 'Smart Manufacturing',
    description: 'Optimize production lines with predictive maintenance and real-time monitoring.',
    icon: Cpu,
  },
  {
    title: 'Connected Agriculture',
    description: 'Maximize yields with automated irrigation and environmental sensing.',
    icon: Globe,
  },
  {
    title: 'Smart Buildings',
    description: 'Reduce energy costs and improve comfort with intelligent building automation.',
    icon: Activity,
  },
]

// Testimonials
const testimonials = [
  {
    quote: "IoT Space transformed how we monitor our manufacturing floor. The real-time insights have reduced our downtime by 40%.",
    author: "Sarah Chen",
    role: "VP of Operations",
    company: "TechCorp Industries",
  },
  {
    quote: "The platform's scalability is remarkable. We went from 100 to 50,000 sensors without any performance issues.",
    author: "Marcus Rodriguez",
    role: "CTO",
    company: "AgriFlow Systems",
  },
  {
    quote: "Finally, an IoT platform that doesn't require a PhD to configure. Our team was productive within hours.",
    author: "Emily Watson",
    role: "Engineering Lead",
    company: "BuildSmart Inc",
  },
]

// Trusted by logos
const trustedBy = [
  'TechCorp', 'InnovateLabs', 'FutureScale', 'DataFlow', 'CloudNine', 'SmartEdge'
]

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: string, suffix?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {value}
      <span className="text-brand-500">{suffix}</span>
    </motion.span>
  )
}

// Section wrapper with GSAP scroll animations
function AnimatedSection({
  children,
  className = '',
  delay = 0
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const section = sectionRef.current

    // Set initial state
    gsap.set(section, {
      opacity: 0,
    })

    // Create scroll-triggered animation
    const animation = gsap.to(section, {
      opacity: 1,
      duration: 0.6,
      delay,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    })

    return () => {
      animation.kill()
    }
  }, [delay])

  return (
    <section
      ref={sectionRef}
      className={className}
    >
      {children}
    </section>
  )
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })

  // Parallax transforms for hero
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9])
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 150])
  const heroBlur = useTransform(scrollYProgress, [0, 0.5], [0, 10])

  // Smooth springs
  const smoothHeroY = useSpring(heroY, { stiffness: 100, damping: 30 })
  const smoothHeroScale = useSpring(heroScale, { stiffness: 100, damping: 30 })

  // Page scroll progress for decorative elements
  const { scrollYProgress: pageProgress } = useScroll()
  const backgroundY = useTransform(pageProgress, [0, 1], [0, -200])

  return (
    <MainLayout padNavbar={false}>
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Cinematic background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F1A] via-[#1A1F2E] to-[#0B0F1A]" />

        {/* Central ambient orb blur effect */}
        <div className="hero-orb-blur" />

        {/* WebGL 3D IoT Network Visualization */}
        <Hero3DScene
          className="opacity-90"
          fallback={
            <>
              <ParticleBackground
                particleCount={80}
                connectionDistance={120}
                speed={0.3}
                className="opacity-60"
              />
              <FloatingOrbs />
            </>
          }
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        {/* Grid Pattern */}
        <motion.div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            y: backgroundY,
          }}
        />

        {/* Hero Content */}
        <motion.div
          className="container relative z-10 px-6 pt-24 md:pt-28 text-center max-w-6xl mx-auto"
          style={{
            opacity: heroOpacity,
            scale: smoothHeroScale,
            y: smoothHeroY,
            filter: useTransform(heroBlur, (v) => `blur(${v}px)`)
          }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div
              variants={fadeInUp}
              className="flex justify-center mb-8"
            >
              <motion.div
                className="floating-badge"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="h-4 w-4" />
                <span>The Future of Connected Devices</span>
              </motion.div>
            </motion.div>

            {/* Main Headline */}
            <motion.div variants={fadeInUp} className="mb-6">
              <h1 className="display-text text-foreground">
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  Connect
                </motion.span>
                <motion.span
                  className="block text-gradient-animated"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  Everything
                </motion.span>
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 font-light leading-relaxed"
            >
              The intelligent IoT platform that transforms how you monitor,
              control, and understand your connected world.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="/register" className="arrow-button">
                  <span>Start Building Free</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="/dashboard" className="ghost-button group">
                  <Play className="h-4 w-4" />
                  <span>Watch Demo</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={fadeIn}
              className="mt-16 pt-16 border-t border-border/30"
            >
              <p className="text-sm text-muted-foreground mb-6 tracking-wide uppercase">
                Trusted by industry leaders
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-50">
                {trustedBy.map((company, index) => (
                  <motion.span
                    key={company}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    whileHover={{ opacity: 0.8, scale: 1.05 }}
                    className="text-lg font-semibold text-muted-foreground cursor-default"
                  >
                    {company}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <span className="text-xs text-muted-foreground uppercase tracking-widest">Scroll</span>
          <motion.div
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div className="w-1 h-2 rounded-full bg-brand-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <AnimatedSection className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-5xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-2">
                  <span className="text-4xl md:text-5xl lg:text-6xl font-light text-foreground">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground tracking-wide uppercase">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Features Section */}
      <AnimatedSection className="py-24 md:py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

        {/* Decorative orb */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 bg-brand-500/30 top-0 right-0"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 20, repeat: Infinity }}
        />

        <div className="container mx-auto px-6 relative z-10">
          {/* Section Header */}
          <motion.div
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="floating-badge">
                <Zap className="h-4 w-4" />
                <span>Powerful Capabilities</span>
              </span>
            </motion.div>
            <motion.h2
              variants={fadeInUp}
              className="display-text-sm text-foreground mb-6"
            >
              Built for Scale
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light"
            >
              Everything you need to build, deploy, and manage IoT solutions at any scale.
            </motion.p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="premium-card p-8 md:p-10 group"
              >
                <motion.div
                  className="feature-icon mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <feature.icon className="h-7 w-7 text-brand-500" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-brand-500 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* How It Works Section */}
      <AnimatedSection className="py-24 md:py-40 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="floating-badge">
                <Activity className="h-4 w-4" />
                <span>Simple Process</span>
              </span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="display-text-sm text-foreground mb-6">
              Get Started in Minutes
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              Three simple steps to connect your devices and start gathering insights.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {[
              { step: '01', title: 'Connect Your Devices', description: 'Use our SDK or MQTT protocol to connect any device in seconds.', icon: Wifi },
              { step: '02', title: 'Configure Dashboards', description: 'Drag and drop widgets to visualize your data exactly how you need.', icon: LineChart },
              { step: '03', title: 'Monitor & Control', description: 'Get real-time alerts and control your devices from anywhere.', icon: Globe },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative text-center group"
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                >
                  <span className="text-6xl md:text-7xl font-extralight text-brand-500/20 group-hover:text-brand-500/40 transition-colors">
                    {item.step}
                  </span>
                </motion.div>
                <motion.div
                  className="feature-icon mx-auto mb-6"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <item.icon className="h-7 w-7 text-brand-500" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Use Cases Section */}
      <AnimatedSection className="py-24 md:py-40 relative overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-20 bg-purple-500/30 -bottom-48 -left-48"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="floating-badge">
                <Globe className="h-4 w-4" />
                <span>Industry Solutions</span>
              </span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="display-text-sm text-foreground mb-6">
              Built for Every Industry
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              From smart factories to connected farms, IoT Space powers innovation across sectors.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                variants={index === 0 ? slideInLeft : index === 2 ? slideInRight : fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="premium-card p-8 md:p-10 group cursor-pointer"
              >
                <motion.div
                  className="aspect-video bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-xl mb-6 flex items-center justify-center overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                >
                  <useCase.icon className="h-12 w-12 text-brand-500/50 group-hover:text-brand-500 group-hover:scale-110 transition-all duration-500" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-brand-500 transition-colors">
                  {useCase.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {useCase.description}
                </p>
                <motion.span
                  className="inline-flex items-center text-sm font-medium text-brand-500 gap-2"
                  whileHover={{ x: 5 }}
                >
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Testimonials Section */}
      <AnimatedSection className="py-24 md:py-40 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="floating-badge">
                <Users className="h-4 w-4" />
                <span>Customer Stories</span>
              </span>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="display-text-sm text-foreground mb-6">
              Loved by Teams
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              See why thousands of companies trust IoT Space for their connected devices.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -5, transition: { duration: 0.3 } }}
                className="testimonial-card group"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                    >
                      <Star className="h-4 w-4 fill-brand-500 text-brand-500" />
                    </motion.div>
                  ))}
                </div>
                <blockquote className="text-foreground leading-relaxed mb-6 relative z-10">
                  {testimonial.quote}
                </blockquote>
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-semibold"
                    whileHover={{ scale: 1.1 }}
                  >
                    {testimonial.author.charAt(0)}
                  </motion.div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                    <p className="text-muted-foreground text-sm">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Security Section */}
      <AnimatedSection className="py-24 md:py-40 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div variants={slideInLeft} className="mb-6">
                <span className="floating-badge">
                  <Lock className="h-4 w-4" />
                  <span>Enterprise Security</span>
                </span>
              </motion.div>
              <motion.h2 variants={slideInLeft} className="text-3xl md:text-4xl lg:text-5xl font-light text-foreground mb-6 leading-tight">
                Security You Can Trust
              </motion.h2>
              <motion.p variants={slideInLeft} className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Your data security is our top priority. IoT Space is built with enterprise-grade security features.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4">
                {[
                  'End-to-end encryption for all data transmissions',
                  'SOC 2 Type II certified infrastructure',
                  'Role-based access control and SSO support',
                  'Regular security audits and penetration testing',
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    variants={fadeInUp}
                    className="flex items-start gap-3"
                    whileHover={{ x: 5 }}
                  >
                    <motion.div
                      className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"
                      whileHover={{ scale: 1.2, backgroundColor: 'rgba(99, 102, 241, 0.3)' }}
                    >
                      <Check className="h-3 w-3 text-brand-500" />
                    </motion.div>
                    <span className="text-muted-foreground">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInRight}
              className="relative"
            >
              <motion.div
                className="aspect-square bg-gradient-to-br from-brand-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-8 border border-brand-500/10 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-16 border border-purple-500/10 rounded-full"
                />
                <Shield className="h-32 w-32 text-brand-500/30" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Final CTA Section */}
      <section className="py-24 md:py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600 via-purple-600 to-brand-700" />

        {/* Animated background elements */}
        <motion.div
          className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -50, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight"
            >
              Ready to Transform Your<br />
              <span className="font-semibold">IoT Experience?</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-white/80 mb-10 max-w-2xl mx-auto font-light">
              Join thousands of companies building the connected future with IoT Space.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-brand-600 font-semibold rounded-full hover:shadow-xl hover:shadow-white/20 transition-all duration-300"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/documentation"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition-all duration-300"
                >
                  View Documentation
                </Link>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeIn} className="flex flex-wrap justify-center items-center gap-6 text-white/60 text-sm">
              {['No credit card required', 'Free 14-day trial', 'Cancel anytime'].map((item, index) => (
                <motion.span
                  key={index}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {item}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  )
}

'use client'

import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import AnimatedBackground from '@/components/AnimatedBackground'
import {
  Zap,
  LineChart,
  Shield,
  Cloud,
  Smartphone,
  Settings,
  Activity,
  ArrowRight,
  Globe,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

// Simple animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

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

// Stats
const stats = [
  { value: '99.9%', label: 'Uptime' },
  { value: '50ms', label: 'Average Response Time' },
  { value: '10M+', label: 'Devices Connected' },
  { value: '120+', label: 'Countries Served' }
]

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground variant="hero" showParticles={true} showGradientOrbs={true} />

        {/* Additional decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 hero-animated-bg opacity-50" />

          {/* Floating decorative orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/10 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-500/10 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="container relative z-10 px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="relative"
          >
            {/* Glowing badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-brand-500/10 border border-brand-500/20 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">Next-Generation IoT Platform</span>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
                IoT Space
              </span>
            </motion.h1>

            <motion.p
              className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              The most advanced IoT platform to connect, monitor, and control your devices from anywhere.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-brand-600 via-purple-500 to-brand-500 hover:shadow-glow text-white border-0 group relative overflow-hidden"
              >
                <Link href="/register">
                  <span className="relative z-10 flex items-center">
                    Get Started For Free
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500 via-purple-600 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="group backdrop-blur-sm hover:bg-secondary/80 hover:border-brand-500/30 transition-all duration-300"
              >
                <Link href="/dashboard">
                  View Live Demo
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute -bottom-32 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <motion.div
                className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="text-center group"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-brand-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/10">
                  <h3 className="text-3xl md:text-4xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-purple-600">
                    {stat.value}
                  </h3>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-brand-500/10 border border-brand-500/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">Powerful Features</span>
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600">
              Everything You Need for Your IoT Projects
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Build powerful IoT applications without coding expertise. Connect, visualize, and control all your devices in minutes.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="group relative bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-brand-500/30 transition-all duration-500 overflow-hidden"
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Gradient top bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />

                {/* Glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                <div className="relative">
                  <div className="mb-5 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative p-3 bg-secondary/50 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-20" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-brand-500/10 border border-brand-500/20"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Globe className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">Industry Solutions</span>
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600">
              Solutions for Every Industry
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From smart homes to industrial automation, IoT Space provides tailored solutions for businesses of all sizes.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {solutions.map((solution, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="group relative bg-card/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 hover:border-brand-500/30 transition-all duration-500"
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <motion.div
                    className={`flex items-center justify-center w-16 h-16 rounded-2xl ${solution.color} text-white mb-6 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {solution.icon}
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{solution.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{solution.description}</p>
                  <Link
                    href={`/solutions/${solution.title.toLowerCase().replace(' ', '-')}`}
                    className="inline-flex items-center text-brand-500 hover:text-brand-600 font-medium group/link"
                  >
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-600 via-purple-600 to-brand-700" />
        <div className="absolute inset-0 hero-animated-bg opacity-30" />

        {/* Decorative elements */}
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-medium text-white/90">Get Started Today</span>
            </motion.div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Start Building Your IoT Project Today
            </h2>
            <p className="text-xl mb-10 text-white/80 max-w-2xl mx-auto">
              Join thousands of developers and businesses who are transforming their ideas into reality with IoT Space.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Button
                asChild
                size="lg"
                className="bg-white text-brand-600 hover:bg-white/95 hover:shadow-xl hover:shadow-white/20 transition-all duration-300 group"
              >
                <Link href="/register">
                  <span className="flex items-center">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:border-white/50 backdrop-blur-sm transition-all duration-300 group"
              >
                <Link href="/documentation">
                  View Documentation
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              className="flex flex-wrap justify-center items-center gap-6 text-white/60 text-sm mt-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                No credit card required
              </span>
              <span className="hidden sm:block">•</span>
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Free 14-day trial
              </span>
              <span className="hidden sm:block">•</span>
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Cancel anytime
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  )
}

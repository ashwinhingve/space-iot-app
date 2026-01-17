'use client'

import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import {
  Zap,
  LineChart,
  Shield,
  Cloud,
  Smartphone,
  Settings,
  Activity,
  ArrowRight,
  Globe
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="container relative z-10 px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600">
              IoT Space
            </h1>
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-muted-foreground">
              The most advanced IoT platform to connect, monitor, and control your devices from anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600"
              >
                <Link href="/register">
                  Get Started For Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
              >
                <Link href="/dashboard">
                  View Live Demo
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="text-center"
              >
                <div className="bg-card p-6 rounded-xl border">
                  <h3 className="text-3xl md:text-4xl font-bold mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600">
              Everything You Need for Your IoT Projects
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Build powerful IoT applications without coding expertise. Connect, visualize, and control all your devices in minutes.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="bg-card rounded-xl p-6 border hover:shadow-lg transition-shadow"
              >
                <div className={`h-2 w-full bg-gradient-to-r ${feature.gradient} rounded-t-xl -mt-6 -mx-6 mb-6`}></div>
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600">
              Solutions for Every Industry
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From smart homes to industrial automation, IoT Space provides tailored solutions for businesses of all sizes.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {solutions.map((solution, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                className="bg-card p-6 rounded-xl border hover:shadow-lg transition-shadow"
              >
                <div className={`flex items-center justify-center w-16 h-16 rounded-full ${solution.color} text-white mb-6`}>
                  {solution.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{solution.title}</h3>
                <p className="text-muted-foreground mb-4">{solution.description}</p>
                <Link
                  href={`/solutions/${solution.title.toLowerCase().replace(' ', '-')}`}
                  className="text-brand-500 hover:text-brand-600 flex items-center group"
                >
                  Learn more
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-600 to-purple-700">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Start Building Your IoT Project Today
            </h2>
            <p className="text-xl mb-10 text-white/90">
              Join thousands of developers and businesses who are transforming their ideas into reality with IoT Space.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button
                asChild
                size="lg"
                className="bg-white text-brand-600 hover:bg-white/90"
              >
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                size="lg"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/documentation">
                  View Documentation
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 text-white/60 text-sm mt-8">
              <span>No credit card required</span>
              <span>•</span>
              <span>Free 14-day trial</span>
              <span>•</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

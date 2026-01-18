'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Github, Mail, Twitter, Linkedin, ArrowUpRight, Zap, Heart } from 'lucide-react'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Devices', href: '/devices' },
      { name: 'Manifolds', href: '/manifolds' },
      { name: 'Documentation', href: '/documentation' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Getting Started', href: '/documentation' },
      { name: 'API Reference', href: '/documentation#api' },
      { name: 'MQTT Protocol', href: '/documentation#mqtt' },
      { name: 'ESP32 Guide', href: '/documentation#esp32' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Security', href: '/security' },
      { name: 'Status', href: '/status', external: true },
    ],
  },
]

const socialLinks = [
  { name: 'GitHub', href: 'https://github.com', icon: Github },
  { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
  { name: 'Email', href: 'mailto:hello@iotspace.io', icon: Mail },
]

const easeOut = [0.16, 1, 0.3, 1] as const

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
} as const

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-background overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-t from-muted/50 via-transparent to-transparent pointer-events-none" />

      {/* Decorative blur orbs */}
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative py-16 md:py-20 px-4 md:px-6">
        {/* Main Footer Content */}
        <motion.div
          className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          {/* Brand Section */}
          <motion.div
            className="col-span-2 md:col-span-3 lg:col-span-2 mb-8 lg:mb-0"
            variants={itemVariants}
          >
            <Link href="/" className="inline-block group">
              <motion.span
                className="font-bold text-2xl bg-gradient-to-r from-brand-500 via-purple-500 to-brand-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                IoT Space
              </motion.span>
            </Link>
            <p className="mt-4 text-muted-foreground max-w-xs leading-relaxed text-sm">
              The intelligent platform for monitoring and controlling your connected devices. Built for developers, designed for scale.
            </p>

            {/* Newsletter signup teaser */}
            <div className="mt-6 p-4 bg-muted/30 rounded-2xl border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-brand-500" />
                <span className="text-sm font-medium text-foreground">Stay Updated</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Get the latest updates on new features and IoT insights.
              </p>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex gap-2">
              {socialLinks.map((social, index) => (
                <motion.div
                  key={social.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                >
                  <Link
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-brand-500/30 hover:scale-110 transition-all duration-300"
                    aria-label={social.name}
                  >
                    <social.icon className="h-4 w-4" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Link Sections */}
          {footerLinks.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              variants={itemVariants}
              custom={groupIndex}
            >
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase mb-4">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link, linkIndex) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: linkIndex * 0.05 + groupIndex * 0.1 + 0.2 }}
                  >
                    <Link
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center gap-1 group"
                    >
                      <span className="relative">
                        {link.name}
                        <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-brand-500 group-hover:w-full transition-all duration-300" />
                      </span>
                      {link.external && (
                        <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
                      )}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div
          className="my-12 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Bottom Section */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>© {new Date().getFullYear()} IoT Space. All rights reserved.</p>
            <span className="hidden sm:block text-border">•</span>
            <p className="flex items-center gap-1 text-xs">
              Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> for IoT developers
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                All systems operational
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

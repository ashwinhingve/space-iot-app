'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Linkedin, ArrowUpRight } from 'lucide-react'

const footerLinks = [
  {
    title: 'Platform',
    links: [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'SCADA Control', href: '/scada' },
      { name: 'Operations (OMS)', href: '/oms' },
      { name: 'Devices', href: '/devices' },
    ],
  },
  {
    title: 'Management',
    links: [
      { name: 'Tickets', href: '/tickets' },
      { name: 'Reports', href: '/reports' },
      { name: 'Documents', href: '/documents' },
      { name: 'Admin Panel', href: '/admin' },
    ],
  },
  {
    title: 'Account',
    links: [
      { name: 'Sign In', href: '/login' },
      { name: 'Register', href: '/register' },
      { name: 'Documentation', href: '/documentation' },
    ],
  },
]

const socialLinks = [
  { name: 'Email', href: 'mailto:support@spaceautotech.com', icon: Mail },
  { name: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
]

const easeOut = [0.16, 1, 0.3, 1] as const

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
} as const

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-background overflow-hidden">

      {/* Circuit grid background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]">
          <defs>
            <pattern id="footer-circuit" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <line x1="0" y1="30" x2="22" y2="30" stroke="#00e5ff" strokeWidth="0.6" />
              <line x1="38" y1="30" x2="60" y2="30" stroke="#00e5ff" strokeWidth="0.6" />
              <line x1="30" y1="0" x2="30" y2="22" stroke="#00e5ff" strokeWidth="0.6" />
              <line x1="30" y1="38" x2="30" y2="60" stroke="#00e5ff" strokeWidth="0.6" />
              <circle cx="30" cy="30" r="3" fill="none" stroke="#00e5ff" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="1" fill="#00e5ff" />
              <circle cx="60" cy="0" r="1" fill="#00e5ff" />
              <circle cx="0" cy="60" r="1" fill="#00e5ff" />
              <circle cx="60" cy="60" r="1" fill="#00e5ff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#footer-circuit)" />
        </svg>
        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
        {/* Glow orbs */}
        <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-[#00e5ff]/3 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-40 bg-brand-500/4 rounded-full blur-[80px]" />
      </div>

      <div className="container relative py-16 md:py-20 px-4 md:px-6">
        {/* Main Footer Content */}
        <motion.div
          className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
        >
          {/* Brand Section */}
          <motion.div className="col-span-2 md:col-span-3 lg:col-span-2 mb-6 lg:mb-0" variants={itemVariants}>
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-5">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00e5ff]/25 rounded-lg blur-sm group-hover:bg-[#00e5ff]/40 transition-all duration-300" />
                <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_14px_rgba(0,229,255,0.3)]">
                  <img src="/icon.png" alt="SpaceIoT" className="w-full h-full object-contain" />
                </div>
              </div>
              <span className="font-display font-bold text-[1.3rem] leading-none tracking-wide">
                <span className="text-foreground">Space</span>
                <span className="text-[#00e5ff]">IoT</span>
              </span>
            </Link>

            <p className="text-muted-foreground max-w-xs leading-relaxed text-sm mb-6">
              Industrial IoT monitoring platform for water utilities. Real-time SCADA, field operations, and maintenance ticketing unified in one system.
            </p>

            {/* Contact card */}
            <div className="p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-md overflow-hidden">
                  <img src="/icon.png" alt="Space Autotech" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-semibold text-foreground font-display">Space Autotech</span>
              </div>
              <a
                href="mailto:support@spaceautotech.com"
                className="text-xs text-muted-foreground hover:text-[#00e5ff] transition-colors flex items-center gap-1 group"
              >
                support@spaceautotech.com
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
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
                    className="w-9 h-9 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-[#00e5ff] hover:border-[#00e5ff]/30 hover:bg-[#00e5ff]/5 hover:scale-110 transition-all duration-200"
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
            <motion.div key={group.title} variants={itemVariants} custom={groupIndex}>
              <h3 className="text-xs font-bold text-foreground/70 tracking-[2px] uppercase mb-4 font-display">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.links.map((link, linkIndex) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: linkIndex * 0.04 + groupIndex * 0.08 + 0.2 }}
                  >
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 inline-flex items-center gap-1.5 group"
                    >
                      <span className="relative">
                        {link.name}
                        <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#00e5ff]/60 group-hover:w-full transition-all duration-300" />
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider */}
        <motion.div
          className="my-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: easeOut }}
        />

        {/* Bottom Section */}
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5">
            <p className="text-xs">© {new Date().getFullYear()} Space Autotech. All rights reserved.</p>
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/40">
              <span className="w-1 h-1 rounded-full bg-border inline-block" />
              Industrial IoT Platform
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Uptime badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 bg-muted/20 text-[11px] text-muted-foreground/60 font-data">
              <span className="font-semibold text-[#00e5ff]/80">99.97%</span> uptime
            </div>

            {/* Status indicator */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20 rounded-full"
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-500 dark:text-emerald-400">
                All systems operational
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}

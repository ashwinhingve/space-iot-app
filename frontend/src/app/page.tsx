'use client'

import Link from 'next/link'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { MainLayout } from '@/components/MainLayout'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Cpu,
  Factory,
  Gauge,
  Globe,
  Home,
  Lock,
  Network,
  PlugZap,
  Radio,
  Server,
  Settings2,
  Shield,
  Sprout,
  Sun,
  Terminal,
  Thermometer,
  Train,
  Wifi,
  Zap,
  Database,
  LayoutDashboard,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ─── Static chart data ───────────────────────────────────────────────────────

const energyData = [
  { t: '00h', kw: 42 }, { t: '02h', kw: 38 }, { t: '04h', kw: 35 },
  { t: '06h', kw: 51 }, { t: '08h', kw: 68 }, { t: '10h', kw: 72 },
  { t: '12h', kw: 65 }, { t: '14h', kw: 78 }, { t: '16h', kw: 71 },
  { t: '18h', kw: 60 }, { t: '20h', kw: 55 }, { t: '22h', kw: 47 },
]

const tempData = [
  { day: 'Mon', z1: 72, z2: 68, z3: 75 },
  { day: 'Tue', z1: 74, z2: 70, z3: 71 },
  { day: 'Wed', z1: 71, z2: 72, z3: 73 },
  { day: 'Thu', z1: 78, z2: 69, z3: 77 },
  { day: 'Fri', z1: 76, z2: 74, z3: 79 },
  { day: 'Sat', z1: 69, z2: 71, z3: 74 },
  { day: 'Sun', z1: 73, z2: 68, z3: 72 },
]

const perfData = [
  { zone: 'α', eff: 94 }, { zone: 'β', eff: 87 },
  { zone: 'γ', eff: 91 }, { zone: 'δ', eff: 78 },
  { zone: 'ε', eff: 96 }, { zone: 'ζ', eff: 83 },
]

const SIDEBAR_ICONS = [LayoutDashboard, Activity, Radio, BarChart3, Bell, Settings2]

// Brand colors (kept consistent with rest of app)
const BRAND  = '#6366f1'   // brand-500
const BRAND4 = '#818cf8'   // brand-400
const PURPLE = '#8b5cf6'   // purple-500
const GREEN  = '#22c55e'
const AMBER  = '#f59e0b'
const RED    = '#ef4444'

// ─── Framer Motion variants ──────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
}

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09 } },
}

// ─── Shared components ───────────────────────────────────────────────────────

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 text-brand-400 text-xs font-semibold tracking-widest uppercase">
      {children}
    </span>
  )
}

function GlassCard({ children, className = '', hover = true }: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm
        ${hover ? 'transition-all duration-300 hover:border-brand-500/30 hover:shadow-glow hover:-translate-y-1' : ''}
        ${className}`}
    >
      {children}
    </div>
  )
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const spanRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(spanRef, { once: true })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    const dur = 2200
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(eased * value))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inView, value])

  return <span ref={spanRef}>{display.toLocaleString()}{suffix}</span>
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string; name: string }>
  label?: string
}

function IoTTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/60 rounded-xl px-3 py-2 shadow-xl min-w-[90px]">
      <p className="text-muted-foreground/60 text-[10px] mb-1.5 uppercase tracking-widest font-data">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-[13px] font-bold font-data">
          {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Hero Dashboard Mockup ───────────────────────────────────────────────────

function HeroDashboard() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2500)
    return () => clearInterval(id)
  }, [])

  const metrics = [
    { label: 'Devices Online', value: (247 + (tick % 4 === 0 ? 1 : 0)).toString(), color: BRAND4 },
    { label: 'Streams / sec',  value: (12400 + tick * 17).toLocaleString(),          color: PURPLE },
    { label: 'System Uptime',  value: '99.97 %',                                     color: GREEN },
  ]

  const devices = [
    { name: 'Pump Station Alpha',  value: '42.3 PSI',      status: 'online' },
    { name: 'Temp Sensor Node B7', value: '73.1 °C',       status: 'warn' },
    { name: 'LoRa Gateway East',   value: 'Reconnecting',  status: 'offline' },
    { name: 'Flow Meter M-04',     value: '8.7 m³/s',      status: 'online' },
  ]

  const statusColor: Record<string, string> = { online: GREEN, warn: AMBER, offline: '#374151' }

  // card bg
  const mockBg  = 'hsl(217.2 33% 10%)'
  const mockCard = 'hsl(217.2 33% 13%)'
  const mockBdr  = 'rgba(99,102,241,0.12)'

  return (
    <div style={{ background: mockBg, border: `1px solid ${mockBdr}`, borderRadius: 16, overflow: 'hidden', fontFamily: 'sans-serif' }}>
      {/* title bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57','#ffbd2e','#28ca41'].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>SpaceIoT SCADA — Industrial Monitor</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} className="iot-pulse-green" />
          <span style={{ color: GREEN, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2 }}>LIVE</span>
        </div>
      </div>

      {/* body */}
      <div style={{ display: 'flex', height: 340 }}>
        {/* sidebar */}
        <div style={{ width: 52, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14, gap: 14 }}>
          {SIDEBAR_ICONS.map((Icon, i) => (
            <div key={i} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: i === 0 ? `${BRAND}18` : 'transparent', border: i === 0 ? `1px solid ${BRAND}30` : '1px solid transparent' }}>
              <Icon size={16} color={i === 0 ? BRAND4 : '#374151'} />
            </div>
          ))}
        </div>

        {/* main content */}
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ background: mockCard, borderRadius: 10, padding: '9px 11px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#6b7280', fontSize: 9, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ color: m.color, fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: mockCard, borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)', flex: 1 }}>
            <div style={{ color: '#6b7280', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Energy Consumption — Live Feed</div>
            <svg viewBox="0 0 300 64" style={{ width: '100%', height: 64 }}>
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND4} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={BRAND4} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[16, 32, 48].map(y => (
                <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              ))}
              <path d="M0 52 C25 46,45 58,75 38 C100 18,125 30,150 22 C175 14,200 36,225 24 C245 15,265 30,300 14 L300 64 L0 64Z" fill="url(#hg)" />
              <path d="M0 52 C25 46,45 58,75 38 C100 18,125 30,150 22 C175 14,200 36,225 24 C245 15,265 30,300 14" fill="none" stroke={BRAND4} strokeWidth="1.5" />
              <path d="M0 44 C30 40,55 50,80 42 C110 32,130 44,160 38 C185 32,210 46,240 36 C265 28,280 40,300 32" fill="none" stroke={PURPLE} strokeWidth="1" strokeDasharray="4 3" />
            </svg>
          </div>

          <div style={{ background: mockCard, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
            {devices.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 11px', borderBottom: i < devices.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[d.status], flexShrink: 0 }} />
                  <span style={{ color: '#9ca3af', fontSize: 11 }}>{d.name}</span>
                </div>
                <span style={{ color: '#e5e7eb', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right panel: alerts */}
        <div style={{ width: 120, borderLeft: '1px solid rgba(255,255,255,0.04)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: '#6b7280', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Alerts</div>
          {[
            { label: 'High Pressure', sev: 'crit' },
            { label: 'Temp Spike',    sev: 'warn' },
            { label: 'Link Loss',     sev: 'warn' },
            { label: 'Valve Open',    sev: 'info' },
            { label: 'Cert Expiry',   sev: 'info' },
          ].map((a, i) => {
            const c = a.sev === 'crit' ? RED : a.sev === 'warn' ? AMBER : BRAND4
            return (
              <div key={i} style={{ borderRadius: 6, padding: '5px 7px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${c}22` }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: c, marginBottom: 3 }} />
                <span style={{ color: '#6b7280', fontSize: 9 }}>{a.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroTextY      = useTransform(scrollYProgress, [0, 1],   [0, 80])
  const heroOpacity    = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const mockupRotateX  = useTransform(scrollYProgress, [0, 0.5], [10, 0])
  const mockupY        = useTransform(scrollYProgress, [0, 1],   [0, 50])

  return (
    <MainLayout padNavbar={false}>

      {/* ══ 1. HERO ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background"
      >
        {/* Dot-grid background */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.9) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }} />

        {/* Hero scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="hero-scan-line" />
        </div>

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${BRAND}0d 0%, transparent 70%)` }}
        />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${PURPLE}10 0%, transparent 70%)` }}
        />
        <div className="absolute top-[30%] left-[10%] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)' }}
        />

        {/* Floating corner data cards */}
        <div className="iot-float absolute top-32 left-8 xl:left-24 hidden xl:block" style={{ animationDelay: '0s' }}>
          <GlassCard className="p-3 min-w-[140px]" hover={false}>
            <div className="text-[9px] tracking-[2px] uppercase mb-1 font-data text-muted-foreground/50">Pressure</div>
            <div className="text-[22px] font-bold font-data leading-tight" style={{ color: BRAND4 }}>42.3 PSI</div>
            <div className="text-[9px] flex items-center gap-1 mt-0.5" style={{ color: GREEN }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} className="iot-pulse-green" />
              Nominal
            </div>
          </GlassCard>
        </div>

        <div className="iot-float absolute top-40 right-8 xl:right-24 hidden xl:block" style={{ animationDelay: '2s' }}>
          <GlassCard className="p-3 min-w-[140px]" hover={false}>
            <div className="text-[9px] tracking-[2px] uppercase mb-1 font-data text-muted-foreground/50">Temperature</div>
            <div className="text-[22px] font-bold font-data leading-tight" style={{ color: AMBER }}>73.1 °C</div>
            <div className="text-[9px] flex items-center gap-1 mt-0.5" style={{ color: AMBER }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER }} />
              Elevated
            </div>
          </GlassCard>
        </div>

        <div className="iot-float absolute bottom-40 left-8 xl:left-24 hidden xl:block" style={{ animationDelay: '4s' }}>
          <GlassCard className="p-3 min-w-[140px]" hover={false}>
            <div className="text-[9px] tracking-[2px] uppercase mb-1 font-data text-muted-foreground/50">Devices</div>
            <div className="text-[22px] font-bold font-data leading-tight" style={{ color: GREEN }}>247 / 250</div>
            <div className="h-[3px] bg-border/40 rounded-full mt-2">
              <div style={{ width: '98.8%', height: '100%', background: GREEN, borderRadius: 2 }} />
            </div>
          </GlassCard>
        </div>

        {/* Hero text */}
        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 pt-28 pb-10 max-w-5xl mx-auto"
        >
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {/* Badge */}
            <motion.div variants={fadeUp} className="flex justify-center mb-7">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 text-xs font-medium tracking-widest uppercase font-data" style={{ color: '#00e5ff' }}>
                <span className="w-2 h-2 rounded-full node-pulse-1" style={{ background: '#00e5ff' }} />
                Industrial IoT Monitoring Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="font-display text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[0.9] mb-6 tracking-tight"
            >
              Monitor Every{' '}
              <span className="bg-gradient-to-r from-[#00e5ff] to-brand-400 bg-clip-text text-transparent">Machine.</span>
              <br />
              <span style={{ color: PURPLE }}>Every Sensor.</span>
              <br />
              <span className="text-muted-foreground font-light">In Real Time.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-muted-foreground font-light"
            >
              WebSCADA-grade industrial monitoring. Connect machines, sensors, and PLCs —
              visualize live data, trigger alerts, and control systems from any device.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-display font-bold text-base tracking-wide text-white overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-2">
                  Launch Dashboard <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-display font-bold text-base tracking-wide transition-all duration-300 border border-[#00e5ff]/25 bg-[#00e5ff]/5 hover:bg-[#00e5ff]/10 hover:border-[#00e5ff]/40"
                style={{ color: '#00e5ff' }}
              >
                Sign In to Portal
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              className="mt-16 pt-10 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-border/40"
            >
              {[
                { v: '247+',   l: 'Devices Online',    color: '#00e5ff' },
                { v: '12.4k',  l: 'Data Streams/sec',  color: PURPLE },
                { v: '99.97%', l: 'System Uptime',     color: GREEN },
                { v: '< 50ms', l: 'Alert Latency',     color: BRAND4 },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="font-display font-bold text-2xl mb-1" style={{ color: s.color }}>{s.v}</div>
                  <div className="text-[11px] uppercase tracking-[1px] font-data text-muted-foreground/60">{s.l}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          style={{ rotateX: mockupRotateX, y: mockupY, opacity: heroOpacity, transformPerspective: 1200, transformOrigin: 'top center' }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl mx-auto px-4 pb-16"
        >
          <div style={{ boxShadow: `0 -20px 80px ${BRAND}0d, 0 40px 80px rgba(0,0,0,0.6)` }}>
            <HeroDashboard />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-b from-transparent to-background" />
        </motion.div>
      </section>

      {/* ══ 2. LIVE SYSTEM OVERVIEW ══════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-background">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${BRAND}14, transparent)` }} />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <SectionBadge>Live System Overview</SectionBadge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Everything Running.{' '}
              <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">Right Now.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-lg mx-auto">
              Real-time KPIs from across your industrial infrastructure — no refresh needed.
            </motion.p>
          </motion.div>

          {/* KPI Cards */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12"
          >
            {[
              { icon: Wifi,          label: 'Devices Online', value: 247,   suffix: '',      accent: BRAND4, note: '98.8% of fleet',         bar: 0.988 },
              { icon: Activity,      label: 'System Uptime',  value: 99,    suffix: '.97%',  accent: GREEN,  note: '43d 7h continuous',       bar: 0.9997 },
              { icon: TrendingUp,    label: 'Data Streams',   value: 12400, suffix: '/s',    accent: PURPLE, note: '+4.2% vs yesterday',      bar: null },
              { icon: AlertTriangle, label: 'Active Alerts',  value: 3,     suffix: '',      accent: AMBER,  note: '2 Warning · 1 Critical',  bar: null },
            ].map((kpi, i) => (
              <motion.div key={i} variants={fadeUp}>
                <GlassCard className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${kpi.accent}18`, border: `1px solid ${kpi.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <kpi.icon size={20} color={kpi.accent} />
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: kpi.accent, display: 'inline-block' }} className="iot-pulse-green mt-1" />
                  </div>
                  <div className="font-data font-bold mb-1" style={{ fontSize: 32, color: kpi.accent, lineHeight: 1 }}>
                    <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-0.5">{kpi.label}</div>
                  <div className="text-[11px] text-muted-foreground/60 font-data">{kpi.note}</div>
                  {kpi.bar && (
                    <div className="h-[3px] bg-border/40 rounded-full mt-3">
                      <div style={{ width: `${kpi.bar * 100}%`, height: '100%', background: kpi.accent, borderRadius: 2, boxShadow: `0 0 8px ${kpi.accent}` }} />
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Live chart */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <GlassCard className="p-6" hover={false}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg">Energy Consumption — 24h</h3>
                  <p className="text-[12px] text-muted-foreground/60 font-data">kW · Updated every 2 minutes</p>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND4 }} className="iot-pulse-green" />
                  <span style={{ color: BRAND4 }} className="text-[11px] font-data">LIVE</span>
                </div>
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={energyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="eg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND4} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={BRAND4} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" stroke="#1f2937" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#1f2937" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip content={<IoTTooltip />} />
                    <Area type="monotone" dataKey="kw" stroke={BRAND4} strokeWidth={2} fill="url(#eg1)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ══ 3. DEVICE MONITORING ════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-secondary/20">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <SectionBadge>Device Monitoring</SectionBadge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Every Device.{' '}
              <span style={{ color: GREEN }}>Every Signal.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
          >
            {[
              { icon: Thermometer, name: 'Temperature Sensor', id: 'TEMP-B7', value: '73.1 °C',  status: 'warning', accent: AMBER,  sparkPath: 'M0 40 C20 35,30 50,50 30 C70 10,85 25,100 20' },
              { icon: Gauge,       name: 'Pressure Gauge',     id: 'PRES-A3', value: '42.3 PSI', status: 'online',  accent: BRAND4, sparkPath: 'M0 30 C20 25,35 40,50 22 C65 5,80 18,100 15' },
              { icon: Zap,         name: 'Energy Meter',       id: 'ENER-C1', value: '68.4 kW',  status: 'online',  accent: GREEN,  sparkPath: 'M0 35 C15 20,30 45,50 25 C70 5,85 30,100 22' },
              { icon: Cpu,         name: 'PLC Controller',     id: 'PLC-D9',  value: 'RUN — OK', status: 'online',  accent: PURPLE, sparkPath: 'M0 42 C20 38,40 28,60 32 C80 36,90 22,100 18' },
              { icon: TrendingUp,  name: 'Motor System',       id: 'MOT-E2',  value: '1450 RPM', status: 'online',  accent: BRAND4, sparkPath: 'M0 38 C15 32,30 42,55 20 C75 2,90 25,100 18' },
            ].map((dev) => {
              const statusColor = dev.status === 'online' ? GREEN : dev.status === 'warning' ? AMBER : '#4b5563'
              const statusLabel = dev.status === 'online' ? 'Online' : dev.status === 'warning' ? 'Warning' : 'Offline'
              return (
                <motion.div key={dev.id} variants={fadeUp}>
                  <GlassCard className="p-5 h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${dev.accent}18`, border: `1px solid ${dev.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <dev.icon size={18} color={dev.accent} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: `${statusColor}15`, border: `1px solid ${statusColor}25` }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                        <span style={{ color: statusColor, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1 }}>{statusLabel}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground/60 font-data mb-0.5">{dev.id}</div>
                    <div className="text-[13px] font-semibold text-foreground font-display mb-3">{dev.name}</div>
                    <div className="font-data font-bold mb-4" style={{ fontSize: 20, color: dev.accent }}>{dev.value}</div>
                    <svg viewBox="0 0 100 50" style={{ width: '100%', height: 44 }}>
                      <defs>
                        <linearGradient id={`sg-${dev.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={dev.accent} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={dev.accent} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={`${dev.sparkPath} L100 50 L0 50Z`} fill={`url(#sg-${dev.id})`} />
                      <path d={dev.sparkPath} fill="none" stroke={dev.accent} strokeWidth="1.5" />
                    </svg>
                  </GlassCard>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ══ 4. DATA ANALYTICS ════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-background">
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse 60% 50% at 30% 50%, ${PURPLE}0f, transparent)` }} />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <SectionBadge>Data Analytics</SectionBadge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Insights That Drive{' '}
              <span style={{ color: PURPLE }}>Action.</span>
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Temperature trends */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <GlassCard className="p-6 h-full" hover={false}>
                <h3 className="font-display font-bold text-foreground mb-1">Temperature Trends</h3>
                <p className="text-[11px] text-muted-foreground/60 font-data mb-5">3-zone comparison · 7 days</p>
                <div className="flex gap-4 mb-4">
                  {[['Zone 1', BRAND4],['Zone 2', PURPLE],['Zone 3', GREEN]].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 2, background: c, borderRadius: 1 }} />
                      <span className="text-[10px] text-muted-foreground/60 font-data">{l}</span>
                    </div>
                  ))}
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tempData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="day" stroke="#1f2937" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <YAxis stroke="#1f2937" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip content={<IoTTooltip />} />
                      <Line type="monotone" dataKey="z1" stroke={BRAND4} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="z2" stroke={PURPLE} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="z3" stroke={GREEN}  strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Machine efficiency */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}>
              <GlassCard className="p-6 h-full" hover={false}>
                <h3 className="font-display font-bold text-foreground mb-1">Machine Performance</h3>
                <p className="text-[11px] text-muted-foreground/60 font-data mb-5">Efficiency % · All zones</p>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perfData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="zone" stroke="#1f2937" tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                      <YAxis stroke="#1f2937" domain={[60, 100]} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip content={<IoTTooltip />} />
                      <Bar dataKey="eff" radius={[4, 4, 0, 0]}>
                        {perfData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.eff >= 90 ? GREEN : entry.eff >= 85 ? BRAND4 : AMBER} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            {/* Alert history */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }}>
              <GlassCard className="p-6 h-full" hover={false}>
                <h3 className="font-display font-bold text-foreground mb-1">Alert History</h3>
                <p className="text-[11px] text-muted-foreground/60 font-data mb-5">Last 7 days · By severity</p>
                <div className="space-y-3">
                  {[
                    { sev: 'Critical', count: 2,  color: RED,    w: 15 },
                    { sev: 'Warning',  count: 8,  color: AMBER,  w: 55 },
                    { sev: 'Info',     count: 24, color: BRAND4, w: 100 },
                    { sev: 'Resolved', count: 31, color: GREEN,  w: 100 },
                  ].map((a) => (
                    <div key={a.sev}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-muted-foreground font-display">{a.sev}</span>
                        <span style={{ color: a.color }} className="text-[12px] font-bold font-data">{a.count}</span>
                      </div>
                      <div className="h-[6px] bg-border/40 rounded-full">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${a.w}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.3 }}
                          style={{ height: '100%', background: a.color, borderRadius: 3, boxShadow: `0 0 8px ${a.color}80` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-border/40">
                  <div className="text-[10px] tracking-[2px] uppercase font-data text-muted-foreground/50 mb-2">MTTR (Mean Time to Resolve)</div>
                  <div style={{ color: GREEN }} className="text-[28px] font-bold font-data">4.3 min</div>
                  <div className="text-[11px] text-muted-foreground/60 font-data">↓ 18% vs last week</div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 5. SYSTEM ARCHITECTURE ═══════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-secondary/20">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <SectionBadge>System Architecture</SectionBadge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              From Field to{' '}
              <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">Dashboard</span>{' '}
              in Milliseconds.
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col md:flex-row items-center justify-center gap-0 max-w-4xl mx-auto"
          >
            {[
              { icon: Thermometer,   label: 'Sensors & PLCs',    sub: 'Temp · Pressure · Flow · Motor',            color: GREEN  },
              { icon: Radio,         label: 'Field Gateway',     sub: 'LoRaWAN · MQTT · Modbus · GSM',             color: BRAND4 },
              { icon: Server,        label: 'Cloud Platform',    sub: 'AWS IoT · Time-series DB · MQTT Broker',    color: PURPLE },
              { icon: LayoutDashboard, label: 'SCADA Dashboard', sub: 'WebSCADA · Alerts · Reports · Control',     color: AMBER  },
            ].map((node, i) => (
              <div key={node.label} className="flex flex-col md:flex-row items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                >
                  <GlassCard className="p-6 text-center min-w-[160px]" hover={false}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${node.color}15`, border: `1px solid ${node.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <node.icon size={24} color={node.color} />
                    </div>
                    <div className="text-[13px] font-bold text-foreground font-display mb-1">{node.label}</div>
                    <div className="text-[10px] text-muted-foreground/60 font-data">{node.sub}</div>
                  </GlassCard>
                </motion.div>

                {i < 3 && (
                  <div className="flex-shrink-0 mx-2 hidden md:block">
                    <svg width="60" height="20" viewBox="0 0 60 20">
                      <defs>
                        <linearGradient id={`conn-${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={BRAND4} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={BRAND4} stopOpacity="0.8" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="10" x2="60" y2="10" stroke={`url(#conn-${i})`} strokeWidth="2" strokeDasharray="6 4"
                        style={{ animation: 'iot-dash-flow 1s linear infinite' }}
                      />
                      <polygon points="54,6 60,10 54,14" fill={BRAND4} />
                    </svg>
                  </div>
                )}
                {i < 3 && (
                  <div className="flex-shrink-0 my-2 md:hidden">
                    <svg width="20" height="30" viewBox="0 0 20 30">
                      <line x1="10" y1="0" x2="10" y2="30" stroke={BRAND4} strokeWidth="2" strokeDasharray="4 3" strokeOpacity="0.5" />
                      <polygon points="6,24 10,30 14,24" fill={BRAND4} />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          {/* Protocol badges */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3 mt-12"
          >
            {['MQTT', 'Modbus RTU', 'OPC-UA', 'LoRaWAN', 'HTTP/REST', 'WebSocket', 'AMQP'].map((p) => (
              <span key={p} className="border border-brand-500/20 bg-brand-500/5 text-brand-400 px-3 py-1 rounded-full text-[11px] font-data">
                {p}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 6. INDUSTRY APPLICATIONS ════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <SectionBadge>Industry Applications</SectionBadge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Built for{' '}
              <span style={{ color: GREEN }}>Every Industry.</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: Sun,     title: 'Solar Farms',            desc: 'Monitor inverter output, panel temp, and grid feed-in. Real-time generation analytics across distributed arrays.', accent: AMBER  },
              { icon: Train,   title: 'Railway Systems',        desc: 'Track signal health, switch actuators, and power rail telemetry. Safety-critical alerting within 50ms.',           accent: BRAND4 },
              { icon: Sprout,  title: 'Agriculture Automation', desc: 'Soil moisture, irrigation schedules, tank levels, and pump control — from field to crop in one view.',             accent: GREEN  },
              { icon: Factory, title: 'Smart Manufacturing',    desc: 'PLC integration, conveyor belt monitoring, machine OEE, and predictive maintenance dashboards.',                   accent: PURPLE },
              { icon: Home,    title: 'Smart Buildings',        desc: 'HVAC, lighting, access control, and energy metering under one roof — all controllable remotely.',                  accent: BRAND4 },
              { icon: PlugZap, title: 'Energy Monitoring',      desc: 'Sub-metering, demand response, power quality analysis, and utility integration via API.',                          accent: GREEN  },
            ].map((app) => (
              <motion.div key={app.title} variants={fadeUp}>
                <GlassCard className="p-6 group">
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: `${app.accent}12`, border: `1px solid ${app.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, transition: 'all 0.3s' }} className="group-hover:scale-110">
                    <app.icon size={22} color={app.accent} />
                  </div>
                  <h3 className="text-[16px] font-bold text-foreground font-display mb-2">{app.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{app.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 14, color: app.accent, fontSize: 12, opacity: 0, transition: 'opacity 0.2s' }} className="group-hover:opacity-100 font-display font-semibold">
                    Learn more <ChevronRight size={14} />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 7. PLATFORM FEATURES ════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-secondary/20">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse 60% 60% at 70% 50%, ${BRAND}0e, transparent)` }} />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp} className="mb-6">
                <SectionBadge>Platform Features</SectionBadge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
                Industrial Grade.<br />
                <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">Cloud Native.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground leading-relaxed mb-8">
                Not a generic IoT platform. Every feature is purpose-built for the operational
                realities of industrial environments — from brownouts to 10,000 concurrent devices.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 font-display font-bold text-sm px-6 py-3 rounded-full transition-all border border-brand-500/30 text-brand-400 bg-brand-500/5 hover:bg-brand-500/10 hover:border-brand-500/50"
                >
                  Explore all features <ArrowRight size={16} />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                { icon: Activity,  title: 'Real-Time Monitoring', desc: 'Sub-second updates via WebSocket. No polling, no lag.',                  accent: BRAND4 },
                { icon: Bell,      title: 'Smart Alert Engine',   desc: 'SCADA-grade: Active → Ack → Resolved with full history.',                accent: AMBER  },
                { icon: Settings2, title: 'Remote Control',       desc: 'Issue commands and schedule operations from any browser.',               accent: PURPLE },
                { icon: Shield,    title: 'Role-Based Access',    desc: '10+ roles. Admins can tune per-user module access.',                     accent: GREEN  },
                { icon: Wifi,      title: 'Multi-Protocol',       desc: 'LoRaWAN, MQTT, Modbus, OPC-UA, GSM/4G, Bluetooth.',                     accent: BRAND4 },
                { icon: Lock,      title: 'End-to-End Security',  desc: 'TLS everywhere, JWT auth, encrypted device credentials.',                accent: RED    },
              ].map((f) => (
                <motion.div key={f.title} variants={fadeUp}>
                  <GlassCard className="p-5">
                    <div className="flex gap-3">
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.accent}12`, border: `1px solid ${f.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <f.icon size={17} color={f.accent} />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-foreground font-display mb-0.5">{f.title}</div>
                        <div className="text-[12px] text-muted-foreground leading-relaxed">{f.desc}</div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ 8. TECHNOLOGY STACK ══════════════════════════════════════════════ */}
      <section className="py-20 relative overflow-hidden bg-background border-y border-border/40">
        <div className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-[12px] tracking-[3px] uppercase font-data text-muted-foreground/50">Technology Stack</p>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: Radio,    label: 'MQTT',        color: BRAND4  },
              { icon: Network,  label: 'Modbus RTU',  color: GREEN   },
              { icon: Globe,    label: 'OPC-UA',      color: PURPLE  },
              { icon: Terminal, label: 'Node.js',     color: GREEN   },
              { icon: Database, label: 'MongoDB',     color: GREEN   },
              { icon: Server,   label: 'Next.js 14',  color: BRAND4  },
              { icon: Cpu,      label: 'ESP32 / PLC', color: AMBER   },
              { icon: Zap,      label: 'AWS IoT Core',color: AMBER   },
              { icon: Lock,     label: 'TLS / JWT',   color: RED     },
            ].map((tech) => (
              <motion.div
                key={tech.label}
                variants={fadeUp}
                whileHover={{ scale: 1.08, transition: { duration: 0.15 } }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full cursor-default border border-border/50 bg-card/60 hover:border-brand-500/30 transition-colors"
              >
                <tech.icon size={15} color={tech.color} />
                <span className="text-[13px] font-semibold text-muted-foreground font-display">{tech.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ 9. WEBSCADA PREVIEW ══════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-secondary/20">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 80%, ${PURPLE}16, transparent)` }} />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="text-center mb-14"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <SectionBadge>WebSCADA Preview</SectionBadge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              The Control Room.{' '}
              <span style={{ color: PURPLE }}>In Your Browser.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
              Full SCADA control, live alarms, device telemetry, and one-click command dispatch —
              optimized for Chrome, Edge, and mobile.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="rounded-[20px] overflow-hidden border border-purple-500/20"
            style={{ boxShadow: `0 0 80px ${PURPLE}1f, 0 40px 80px rgba(0,0,0,0.5)` }}
          >
            {/* browser chrome */}
            <div className="bg-card border-b border-border/50 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                {['#ff5f57','#ffbd2e','#28ca41'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
              </div>
              <div className="flex-1 bg-background/60 rounded-md px-3 py-1 text-center">
                <span className="text-[11px] text-muted-foreground/50 font-data">iot.spaceautotech.com/scada</span>
              </div>
            </div>

            {/* app shell */}
            <div style={{ display: 'flex', height: 520, background: 'hsl(217.2 33% 10%)' }}>
              {/* sidebar */}
              <div style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.05)', background: 'hsl(217.2 33% 8%)', padding: '16px 12px' }}>
                <div style={{ color: BRAND4, fontWeight: 700, fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Rajdhani, sans-serif', letterSpacing: 1 }}>
                  <Zap size={18} color={BRAND4} />
                  SpaceIoT
                </div>
                {[
                  { icon: LayoutDashboard, label: 'Dashboard',    active: false },
                  { icon: Gauge,           label: 'SCADA Control',active: true  },
                  { icon: Activity,        label: 'Live Telemetry',active: false },
                  { icon: Bell,            label: 'Alarm Center', active: false, badge: '3' },
                  { icon: Radio,           label: 'Devices',      active: false },
                  { icon: BarChart3,       label: 'Reports',      active: false },
                  { icon: Globe,           label: 'OMS Map',      active: false },
                  { icon: Shield,          label: 'Admin',        active: false },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, marginBottom: 2, background: item.active ? `${BRAND}14` : 'transparent', border: item.active ? `1px solid ${BRAND}25` : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <item.icon size={15} color={item.active ? BRAND4 : '#374151'} />
                      <span style={{ color: item.active ? '#e5e7eb' : '#374151', fontSize: 12, fontFamily: 'Rajdhani, sans-serif', fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span style={{ background: RED, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace' }}>{item.badge}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* main content */}
              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 15, fontFamily: 'Rajdhani, sans-serif' }}>SCADA — Valve Control</div>
                    <div style={{ color: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>Manifold Alpha · Station 4</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ padding: '5px 12px', borderRadius: 20, background: `${BRAND}14`, border: `1px solid ${BRAND}30`, color: BRAND4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND4 }} className="iot-pulse-green" />
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
                    </div>
                    <div style={{ padding: '5px 12px', borderRadius: 20, background: `${GREEN}14`, border: `1px solid ${GREEN}30`, color: GREEN, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>AUTO MODE</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: 'span 2' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { id: 'V-01', pos: 100, color: GREEN  },
                        { id: 'V-02', pos: 0,   color: '#374151' },
                        { id: 'V-03', pos: 65,  color: BRAND4 },
                        { id: 'V-04', pos: 100, color: GREEN  },
                      ].map((v) => (
                        <div key={v.id} style={{ background: 'hsl(217.2 33% 8%)', borderRadius: 10, padding: '10px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ color: '#6b7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>{v.id}</div>
                          <div style={{ height: 50, width: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${v.pos}%`, background: v.color, borderRadius: 4, transition: 'height 0.5s', boxShadow: v.pos > 0 ? `0 0 10px ${v.color}60` : 'none' }} />
                          </div>
                          <div style={{ color: v.color, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: 6 }}>{v.pos}%</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, background: 'hsl(217.2 33% 8%)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#6b7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2, marginBottom: 6 }}>FLOW RATE — REALTIME</div>
                      <svg viewBox="0 0 300 50" style={{ width: '100%', height: 50 }}>
                        <defs>
                          <linearGradient id="scada-g" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PURPLE} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0 35 C30 30,50 42,80 28 C110 14,130 32,160 20 C185 10,210 30,240 18 C262 9,280 25,300 14 L300 50 L0 50Z" fill="url(#scada-g)" />
                        <path d="M0 35 C30 30,50 42,80 28 C110 14,130 32,160 20 C185 10,210 30,240 18 C262 9,280 25,300 14" fill="none" stroke={PURPLE} strokeWidth="1.5" />
                      </svg>
                    </div>
                  </div>

                  {/* alert panel */}
                  <div style={{ background: 'hsl(217.2 33% 8%)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#6b7280', fontSize: 9, letterSpacing: 2, fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>ACTIVE ALERTS</div>
                    {[
                      { msg: 'V-02 Actuator Fault', sev: 'crit', time: '2m ago'  },
                      { msg: 'High Backpressure',   sev: 'warn', time: '8m ago'  },
                      { msg: 'Sensor B7 Drift',     sev: 'warn', time: '15m ago' },
                    ].map((a, i) => {
                      const c = a.sev === 'crit' ? RED : AMBER
                      return (
                        <div key={i} style={{ borderRadius: 8, padding: '8px', marginBottom: 6, background: `${c}0a`, border: `1px solid ${c}25` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                            <span style={{ color: '#9ca3af', fontSize: 10, flex: 1 }}>{a.msg}</span>
                          </div>
                          <div style={{ color: '#6b7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', paddingLeft: 12 }}>{a.time}</div>
                        </div>
                      )
                    })}
                    <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ color: '#6b7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>SYSTEM HEALTH</div>
                      {[
                        { label: 'CPU',  val: 34, color: GREEN  },
                        { label: 'MEM',  val: 61, color: BRAND4 },
                        { label: 'DISK', val: 28, color: GREEN  },
                      ].map((r) => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ color: '#6b7280', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', width: 28 }}>{r.label}</span>
                          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                            <div style={{ width: `${r.val}%`, height: '100%', background: r.color, borderRadius: 2 }} />
                          </div>
                          <span style={{ color: r.color, fontSize: 9, fontFamily: 'JetBrains Mono, monospace', width: 28, textAlign: 'right' }}>{r.val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ 10. FINAL CTA ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-36 relative overflow-hidden bg-background">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `radial-gradient(circle, rgba(99,102,241,0.9) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        {/* Glow orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${BRAND}0f 0%, transparent 70%)` }}
        />
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${PURPLE}12 0%, transparent 70%)` }}
        />

        {/* Beacon rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {[160, 280, 400].map((s, i) => (
            <div key={s} className="iot-float absolute rounded-full border border-brand-500/10"
              style={{ width: s, height: s, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animationDelay: `${i * 0.8}s` }}
            />
          ))}
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-6 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <CheckCircle2 size={14} color={GREEN} />
                <span className="text-[12px] text-muted-foreground font-data">Ready to deploy in minutes</span>
              </div>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="font-display font-bold text-foreground leading-[0.92] mb-6"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              Start Monitoring Your<br />
              <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-brand-500 bg-clip-text text-transparent">
                Industrial Systems
              </span>
              <br />
              <span className="text-muted-foreground font-light">Today.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-[18px] text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed"
            >
              Connect your first sensor, configure alerts, and have live dashboards
              running before your next coffee break.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/dashboard"
                className="relative inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full font-display font-bold text-lg tracking-wide text-white overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-3">
                  <Zap size={20} />
                  Deploy IoT System
                </span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full font-display font-bold text-lg tracking-wide transition-all duration-300 border border-purple-500/30 text-purple-300 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/50"
              >
                <Globe size={20} />
                Sign In to Portal
              </Link>
            </motion.div>

            {/* Trust row */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap justify-center gap-6 pt-6 border-t border-border/40"
            >
              {[
                { icon: Shield,   text: 'TLS Encrypted'      },
                { icon: Activity, text: '99.97% Uptime SLA'  },
                { icon: Lock,     text: 'SOC 2 Ready'        },
                { icon: Zap,      text: '< 50ms Alert Latency' },
              ].map((t) => (
                <div key={t.text} className="flex items-center gap-1.5 text-muted-foreground/50 text-[12px]">
                  <t.icon size={13} className="text-muted-foreground/40" />
                  <span className="font-data">{t.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

    </MainLayout>
  )
}

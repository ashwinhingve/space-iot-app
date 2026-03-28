'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { login, clearError } from '@/store/slices/authSlice';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { RootState, AppDispatch } from '@/store/store';
import {
  ArrowRight, Lock, Mail, AlertCircle, Eye, EyeOff,
  Shield, Users, Activity, Radio, BarChart3, Ticket,
} from 'lucide-react';

// ─── Brand panel features ─────────────────────────────────────────────────────

const FEATURES = [
  { icon: Activity, label: 'Real-time SCADA', desc: 'Live valve control and process monitoring' },
  { icon: Radio,    label: 'Multi-protocol IoT', desc: 'LoRaWAN, Wi-Fi, GSM, Bluetooth unified' },
  { icon: BarChart3, label: 'Advanced Analytics', desc: 'RSSI, runtime, pump reports & exports' },
  { icon: Ticket,   label: 'Ticket Management', desc: 'Multi-stage approval workflows' },
];

const LIVE_METRICS = [
  { v: '247',    l: 'Devices',  color: '#22c55e' },
  { v: '99.97%', l: 'Uptime',   color: '#00e5ff' },
  { v: '< 50ms', l: 'Latency',  color: '#818cf8' },
];

// ─── Circuit Board SVG Background ────────────────────────────────────────────

function CircuitBoard() {
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <pattern id="login-circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* Main crossing traces */}
          <line x1="0" y1="40" x2="32" y2="40" stroke="#00e5ff" strokeWidth="0.6" />
          <line x1="48" y1="40" x2="80" y2="40" stroke="#00e5ff" strokeWidth="0.6" />
          <line x1="40" y1="0" x2="40" y2="32" stroke="#00e5ff" strokeWidth="0.6" />
          <line x1="40" y1="48" x2="40" y2="80" stroke="#00e5ff" strokeWidth="0.6" />
          {/* Junction ring */}
          <circle cx="40" cy="40" r="5" fill="none" stroke="#00e5ff" strokeWidth="0.6" />
          <circle cx="40" cy="40" r="1.5" fill="#00e5ff" />
          {/* Corner dots */}
          <circle cx="0"  cy="0"  r="1.5" fill="#00e5ff" />
          <circle cx="80" cy="0"  r="1.5" fill="#00e5ff" />
          <circle cx="0"  cy="80" r="1.5" fill="#00e5ff" />
          <circle cx="80" cy="80" r="1.5" fill="#00e5ff" />
          {/* Corner traces */}
          <path d="M0 20 H16 V0"  fill="none" stroke="#00e5ff" strokeWidth="0.4" />
          <path d="M64 0 V16 H80" fill="none" stroke="#00e5ff" strokeWidth="0.4" />
          <path d="M80 60 H64 V80" fill="none" stroke="#00e5ff" strokeWidth="0.4" />
          <path d="M16 80 V64 H0"  fill="none" stroke="#00e5ff" strokeWidth="0.4" />
        </pattern>

        {/* Animated data-flow paths */}
        <linearGradient id="flow-grad-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#00e5ff" stopOpacity="0" />
          <stop offset="50%"  stopColor="#00e5ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>

        {/* Vignette overlay */}
        <radialGradient id="circuit-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="#060b18" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {/* Circuit pattern */}
      <rect width="100%" height="100%" fill="url(#login-circuit)" opacity="0.09" />
      {/* Vignette */}
      <rect width="100%" height="100%" fill="url(#circuit-vignette)" />
    </svg>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const isBrowser = typeof window !== 'undefined';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'individual' | 'team'>(() => {
    if (isBrowser) {
      const stored = localStorage.getItem('preferred_login_mode');
      if (stored === 'individual' || stored === 'team') return stored;
    }
    return 'team';
  });

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const { loading, error, isAuthenticated, user } = useSelector((s: RootState) => s.auth);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);
  useEffect(() => {
    if (isAuthenticated) {
      // Sync preferred login mode with actual user type after successful login
      if (user?.userType && isBrowser) {
        localStorage.setItem('preferred_login_mode', user.userType);
      }
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, redirectTo, user]);

  const handleModeSelect = (m: 'individual' | 'team') => {
    setLoginMode(m);
    if (isBrowser) localStorage.setItem('preferred_login_mode', m);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    try {
      await dispatch(login({ email, password })).unwrap();
      router.push(redirectTo);
    } catch { /* error shown via state */ }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060b18 0%, #0a1428 45%, #06101e 100%)' }}
      >
        {/* Circuit board background */}
        <CircuitBoard />

        {/* Scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="auth-scan-line" />
        </div>

        {/* Glowing orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-8%] right-[-4%] w-80 h-80 rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-8%] left-[-4%] w-72 h-72 rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)' }} />
          <div className="absolute top-[42%] left-[32%] w-56 h-56 rounded-full blur-[80px]"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)' }} />
        </div>

        {/* Logo */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-[#00e5ff]/30 rounded-xl blur-md" />
            <img src="/icon.png" alt="Space IoT" className="relative w-10 h-10 rounded-xl object-contain shadow-[0_0_20px_rgba(0,229,255,0.4)]" />
          </div>
          <div>
            <p className="font-display font-bold text-xl leading-none text-white">
              <span>Space</span><span style={{ color: '#00e5ff' }}>IoT</span>
            </p>
            <p className="text-[11px] text-white/30 font-data tracking-widest mt-0.5">PLATFORM v2</p>
          </div>
        </motion.div>

        {/* Hero content */}
        <motion.div
          className="relative z-10 space-y-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] node-pulse-1" />
              <span className="text-[11px] text-[#00e5ff] font-data tracking-[2px] uppercase">Live Monitoring Active</span>
            </div>

            <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Industrial IoT{' '}
              <span className="bg-gradient-to-r from-[#00e5ff] via-brand-400 to-purple-400 bg-clip-text text-transparent">
                Command Center
              </span>
            </h1>
            <p className="mt-4 text-[0.9rem] text-white/45 leading-relaxed max-w-sm">
              Monitor, control, and optimize your water infrastructure in real time — from field sensors to the control room.
            </p>
          </div>

          {/* Live metrics strip */}
          <div className="grid grid-cols-3 gap-3">
            {LIVE_METRICS.map((m, i) => (
              <motion.div
                key={m.l}
                className="rounded-xl border bg-white/[0.03] p-3 text-center"
                style={{ borderColor: `${m.color}20` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <div className="font-display font-bold text-[1.1rem] leading-tight" style={{ color: m.color }}>
                  {m.v}
                </div>
                <div className="text-[9px] text-white/35 uppercase tracking-[2px] mt-0.5 font-data">{m.l}</div>
              </motion.div>
            ))}
          </div>

          {/* Features list */}
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                className="flex items-center gap-3.5"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.07 }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4" style={{ color: '#00e5ff' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">{f.label}</p>
                  <p className="text-xs text-white/35">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">All systems operational</span>
          </div>
          <span className="text-xs text-white/20">© {new Date().getFullYear()} Space Autotech</span>
        </motion.div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#00e5ff]/20 rounded-xl blur-sm" />
            <img src="/icon.png" alt="Space IoT" className="relative w-8 h-8 rounded-xl object-contain" />
          </div>
          <span className="font-display font-bold text-xl">
            <span className="text-foreground">Space</span>
            <span style={{ color: '#00e5ff' }}>IoT</span>
          </span>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <motion.div
            className="w-full max-w-[400px] space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium transition-colors hover:opacity-80" style={{ color: '#00e5ff' }}>
                  Create one free
                </Link>
              </p>
            </div>

            {/* Google sign-in */}
            <GoogleAuthButton redirectTo={redirectTo} onError={console.error} />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border/60" />
              <span className="text-xs text-muted-foreground px-1">or continue with email</span>
              <div className="flex-1 border-t border-border/60" />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="flex items-center gap-2.5 px-4 py-3 bg-destructive/8 border border-destructive/20 text-destructive text-sm rounded-xl"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                <div className={`relative rounded-xl border transition-all duration-150 ${
                  focused === 'email'
                    ? 'border-[#00e5ff]/50 ring-4 ring-[#00e5ff]/6 shadow-[0_0_0_1px_rgba(0,229,255,0.1)]'
                    : 'border-border/60 hover:border-border'
                }`}>
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'email' ? 'text-[#00e5ff]' : 'text-muted-foreground/60'}`} />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className="w-full pl-10 pr-4 py-3 bg-transparent rounded-xl outline-none text-sm placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</label>
                <div className={`relative rounded-xl border transition-all duration-150 ${
                  focused === 'password'
                    ? 'border-[#00e5ff]/50 ring-4 ring-[#00e5ff]/6 shadow-[0_0_0_1px_rgba(0,229,255,0.1)]'
                    : 'border-border/60 hover:border-border'
                }`}>
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'password' ? 'text-[#00e5ff]' : 'text-muted-foreground/60'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full pl-10 pr-12 py-3 bg-transparent rounded-xl outline-none text-sm placeholder:text-muted-foreground/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="relative w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Account type selector */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Account Type</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'individual' as const, icon: Shield, title: 'Individual', desc: 'Personal admin, standalone deployment', color: 'text-emerald-400', activeBg: 'bg-emerald-500/8 border-emerald-500/40', inactiveBg: 'bg-emerald-500/3 border-emerald-500/10' },
                  { id: 'team' as const,       icon: Users,  title: 'Team',       desc: 'Role-based, multi-user collaboration',  color: 'text-[#00e5ff]',  activeBg: 'bg-[#00e5ff]/8 border-[#00e5ff]/40', inactiveBg: 'bg-[#00e5ff]/3 border-[#00e5ff]/10' },
                ]).map(c => {
                  const active = loginMode === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleModeSelect(c.id)}
                      className={`rounded-xl border p-3 text-left transition-all duration-150 ${active ? c.activeBg : c.inactiveBg} ${active ? 'ring-1 ring-inset ' + (c.id === 'individual' ? 'ring-emerald-500/30' : 'ring-[#00e5ff]/30') : ''}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <c.icon className={`w-3.5 h-3.5 ${active ? c.color : 'text-muted-foreground/50'}`} />
                        <p className={`text-xs font-semibold ${active ? c.color : 'text-muted-foreground/70'}`}>{c.title}</p>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: c.id === 'individual' ? '#22c55e' : '#00e5ff' }} />}
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{c.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground/50">
              By signing in you agree to our{' '}
              <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
              {' & '}
              <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

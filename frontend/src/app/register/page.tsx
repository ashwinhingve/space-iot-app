'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { register, setupSystem, clearError } from '@/store/slices/authSlice';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { PasswordStrength } from '@/components/PasswordStrength';
import { RootState, AppDispatch } from '@/store/store';
import {
  ArrowRight, Lock, Mail, User, AlertCircle, Zap, Eye, EyeOff,
  CheckCircle, Shield, Users, Activity, Radio, BarChart3, Ticket,
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
        <pattern id="register-circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
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

        {/* Vignette overlay */}
        <radialGradient id="register-circuit-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="#060b18" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {/* Circuit pattern */}
      <rect width="100%" height="100%" fill="url(#register-circuit)" opacity="0.09" />
      {/* Vignette */}
      <rect width="100%" height="100%" fill="url(#register-circuit-vignette)" />
    </svg>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, icon: Icon, focused, type, value, onChange, placeholder, autoComplete, children,
  id, onFocus, onBlur,
}: {
  label: string;
  icon: React.ElementType;
  focused: boolean;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  autoComplete?: string;
  children?: React.ReactNode;
  id: string;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className={`relative rounded-xl border transition-all duration-150 ${
        focused
          ? 'border-[#00e5ff]/50 ring-4 ring-[#00e5ff]/6 shadow-[0_0_0_1px_rgba(0,229,255,0.1)]'
          : 'border-border/60 hover:border-border'
      }`}>
        <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
          focused ? 'text-[#00e5ff]' : 'text-muted-foreground/60'
        }`} />
        <input
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full pl-10 pr-4 py-3 bg-transparent rounded-xl outline-none text-sm placeholder:text-muted-foreground/40"
        />
      </div>
      {children}
    </div>
  );
}

// ─── Password field with show/hide toggle ────────────────────────────────────

function PasswordField({
  id, label, value, onChange, placeholder, autoComplete, focused, onFocus, onBlur, children,
}: {
  id: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; autoComplete?: string;
  focused: boolean; onFocus: () => void; onBlur: () => void;
  children?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className={`relative rounded-xl border transition-all duration-150 ${
        focused
          ? 'border-[#00e5ff]/50 ring-4 ring-[#00e5ff]/6 shadow-[0_0_0_1px_rgba(0,229,255,0.1)]'
          : 'border-border/60 hover:border-border'
      }`}>
        <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
          focused ? 'text-[#00e5ff]' : 'text-muted-foreground/60'
        }`} />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full pl-10 pr-12 py-3 bg-transparent rounded-xl outline-none text-sm placeholder:text-muted-foreground/40"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [mode, setMode] = useState<'individual' | 'team'>(
    searchParams.get('mode') === 'individual' ? 'individual' : 'team'
  );

  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const { loading, error, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const systemMode = useSelector((s: RootState) => s.config.mode);

  useEffect(() => { setMode(systemMode === 'single' ? 'individual' : 'team'); }, [systemMode]);
  useEffect(() => { dispatch(clearError()); }, [dispatch]);
  useEffect(() => { if (isAuthenticated) router.push(redirectTo); }, [isAuthenticated, router, redirectTo]);

  const validate = (): boolean => {
    setValidationError('');
    if (name.trim().length < 2) { setValidationError('Name must be at least 2 characters'); return false; }
    if (password.length < 8) { setValidationError('Password must be at least 8 characters'); return false; }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setValidationError('Password must include uppercase, lowercase, and a number'); return false;
    }
    if (password !== confirmPassword) { setValidationError('Passwords do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    if (!validate()) return;
    try {
      if (mode === 'individual') {
        try {
          await dispatch(setupSystem({ name, email, password })).unwrap();
          setSuccessMsg('System configured! You are now the administrator.');
        } catch (err: unknown) {
          const msg = typeof err === 'string' ? err : (err as { message?: string })?.message ?? '';
          if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('complete')) {
            await dispatch(register({ name, email, password })).unwrap();
          } else throw err;
        }
      } else {
        await dispatch(register({ name, email, password })).unwrap();
      }
      router.push(redirectTo);
    } catch { /* shown via state */ }
  };

  const displayError = error || validationError;

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden"
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
          <div
            className="absolute top-[-8%] right-[-4%] w-80 h-80 rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-[-8%] left-[-4%] w-72 h-72 rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-[42%] left-[32%] w-56 h-56 rounded-full blur-[80px]"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)' }}
          />
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
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00e5ff] to-brand-600 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.4)]">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
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
              <span className="text-[11px] text-[#00e5ff] font-data tracking-[2px] uppercase">Get Started Free</span>
            </div>

            <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Start monitoring{' '}
              <span className="bg-gradient-to-r from-[#00e5ff] via-brand-400 to-purple-400 bg-clip-text text-transparent">
                in minutes
              </span>
            </h1>
            <p className="mt-4 text-[0.9rem] text-white/45 leading-relaxed max-w-sm">
              Connect your devices, configure your manifolds, and get full visibility over your water infrastructure.
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
      <div className="flex-1 flex flex-col bg-background overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#00e5ff]/20 rounded-xl blur-sm" />
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#00e5ff] to-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <span className="font-display font-bold text-xl">
            <span className="text-foreground">Space</span>
            <span style={{ color: '#00e5ff' }}>IoT</span>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <motion.div
            className="w-full max-w-[400px] space-y-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Already have one?{' '}
                <Link href="/login" className="font-medium transition-colors hover:opacity-80" style={{ color: '#00e5ff' }}>
                  Sign in
                </Link>
              </p>
            </div>

            {/* Mode selector */}
            <div className="flex rounded-xl border border-border/50 bg-muted/20 p-1">
              {([
                { id: 'individual' as const, label: 'Individual', icon: Shield, desc: 'Full admin access' },
                { id: 'team' as const,       label: 'Team',       icon: Users,  desc: 'Role-based access' },
              ]).map(opt => {
                const Icon = opt.icon;
                const active = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-card border border-border/60 text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Google sign-up */}
            <GoogleAuthButton redirectTo={redirectTo} onError={console.error} />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border/60" />
              <span className="text-xs text-muted-foreground px-1">or with email</span>
              <div className="flex-1 border-t border-border/60" />
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
              {displayError && (
                <motion.div
                  className="flex items-center gap-2.5 px-4 py-3 bg-destructive/8 border border-destructive/20 text-destructive text-sm rounded-xl"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{displayError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form className="space-y-3.5" onSubmit={handleSubmit}>
              <Field
                id="name" label="Full Name" icon={User} type="text"
                value={name} onChange={e => setName(e.target.value)}
                placeholder="John Doe" autoComplete="name"
                focused={focused === 'name'}
                onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
              />
              <Field
                id="email" label="Email" icon={Mail} type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoComplete="username"
                focused={focused === 'email'}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              />
              <PasswordField
                id="password" label="Password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                autoComplete="new-password" focused={focused === 'password'}
                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
              >
                {password && <div className="mt-2"><PasswordStrength password={password} /></div>}
              </PasswordField>
              <PasswordField
                id="confirm" label="Confirm Password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password"
                autoComplete="new-password" focused={focused === 'confirm'}
                onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
              >
                {confirmPassword && password && (
                  <p className={`text-xs mt-1.5 ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </PasswordField>

              <button
                type="submit"
                disabled={loading || !name || !email || !password || !confirmPassword}
                className="relative w-full py-3 mt-1 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
              >
                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Creating account…
                    </>
                  ) : (
                    <>
                      {mode === 'individual' ? 'Set up my account' : 'Create account'}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Mode info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border text-sm ${
                  mode === 'individual'
                    ? 'bg-emerald-500/5 border-emerald-500/15'
                    : 'bg-[#00e5ff]/5 border-[#00e5ff]/15'
                }`}
              >
                {mode === 'individual'
                  ? <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  : <Users className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#00e5ff' }} />
                }
                <div>
                  <p className={`text-xs font-semibold ${mode === 'individual' ? 'text-emerald-400' : ''}`}
                    style={mode === 'team' ? { color: '#00e5ff' } : undefined}>
                    {mode === 'individual' ? 'Individual — First-time system setup' : 'Team — Join as operator'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {mode === 'individual'
                      ? "You'll become the system admin with full access to all features."
                      : 'Your admin will assign your role and permissions after registration.'}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <p className="text-center text-xs text-muted-foreground/50">
              By creating an account you agree to our{' '}
              <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Terms</span>
              {' & '}
              <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

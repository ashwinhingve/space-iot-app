'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from '@/store/slices/authSlice';
import { RootState, AppDispatch } from '@/store/store';
import { Zap, Shield, Users, ArrowRight, AlertCircle } from 'lucide-react';

// ─── Circuit Board SVG Background ────────────────────────────────────────────

function CircuitBoard() {
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <pattern id="onboard-circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <line x1="0" y1="40" x2="32" y2="40" stroke="#00e5ff" strokeWidth="0.6" />
          <line x1="48" y1="40" x2="80" y2="40" stroke="#00e5ff" strokeWidth="0.6" />
          <line x1="40" y1="0" x2="40" y2="32" stroke="#00e5ff" strokeWidth="0.6" />
          <line x1="40" y1="48" x2="40" y2="80" stroke="#00e5ff" strokeWidth="0.6" />
          <circle cx="40" cy="40" r="5" fill="none" stroke="#00e5ff" strokeWidth="0.6" />
          <circle cx="40" cy="40" r="1.5" fill="#00e5ff" />
          <circle cx="0" cy="0" r="1.5" fill="#00e5ff" />
          <circle cx="80" cy="0" r="1.5" fill="#00e5ff" />
          <circle cx="0" cy="80" r="1.5" fill="#00e5ff" />
          <circle cx="80" cy="80" r="1.5" fill="#00e5ff" />
        </pattern>
        <radialGradient id="onboard-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#060b18" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#onboard-circuit)" opacity="0.09" />
      <rect width="100%" height="100%" fill="url(#onboard-vignette)" />
    </svg>
  );
}

const PURPOSE_OPTIONS = [
  { value: 'water_management', label: 'Water Management' },
  { value: 'agriculture',      label: 'Agriculture' },
  { value: 'industrial_iot',   label: 'Industrial IoT' },
  { value: 'smart_city',       label: 'Smart City' },
  { value: 'research',         label: 'Research' },
  { value: 'other',            label: 'Other' },
];

export default function OnboardingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, loading, error, isAuthenticated } = useSelector((s: RootState) => s.auth);

  const [userType, setUserType] = useState<'individual' | 'team'>('team');
  const [purposeType, setPurposeType] = useState('water_management');
  const [purposeDescription, setPurposeDescription] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // If user already has userType set, go to dashboard
    if (user?.userType) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile({
        userType,
        purposeType,
        purposeDescription: purposeDescription.trim() || undefined,
      })).unwrap();
      router.push('/dashboard');
    } catch { /* error displayed via Redux error state below */ }
  };

  if (!isAuthenticated || user?.userType) return null;

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #060b18 0%, #0a1428 45%, #06101e 100%)' }}
      >
        <CircuitBoard />
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-[-8%] right-[-4%] w-80 h-80 rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-[-8%] left-[-4%] w-72 h-72 rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)' }}
          />
        </div>

        {/* Logo */}
        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
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

        {/* Onboarding info */}
        <motion.div
          className="relative z-10 space-y-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
              <span className="text-[11px] text-[#00e5ff] font-data tracking-[2px] uppercase">One Last Step</span>
            </div>
            <h1 className="font-display text-3xl xl:text-4xl font-bold text-white leading-[1.1] tracking-tight">
              Tell us about{' '}
              <span className="bg-gradient-to-r from-[#00e5ff] via-brand-400 to-purple-400 bg-clip-text text-transparent">
                your project
              </span>
            </h1>
            <p className="mt-4 text-[0.9rem] text-white/45 leading-relaxed max-w-sm">
              Help us personalize your SpaceIoT experience. This takes less than 30 seconds.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Shield, title: 'Individual', desc: 'Personal admin, standalone deployment' },
              { icon: Users,  title: 'Team',       desc: 'Multi-user with role-based access' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="flex items-center gap-3.5"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4" style={{ color: '#00e5ff' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">{item.title}</p>
                  <p className="text-xs text-white/35">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
            className="w-full max-w-[400px] space-y-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {/* Progress indicator */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#00e5ff' }}>✓</div>
                  <span className="text-xs text-muted-foreground">Account Created</span>
                </div>
                <div className="flex-1 h-px bg-border/60" />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-[#00e5ff] to-brand-600">2</div>
                  <span className="text-xs font-semibold text-foreground">Your Profile</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Complete your profile</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Welcome, <span className="text-foreground font-medium">{user?.name}</span>! Help us tailor your experience.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* User Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Type</label>
                <div className="flex rounded-xl border border-border/50 bg-muted/20 p-1">
                  {([
                    { id: 'individual' as const, label: 'Individual', icon: Shield, desc: 'Full admin access' },
                    { id: 'team' as const,       label: 'Team',       icon: Users,  desc: 'Role-based access' },
                  ]).map(opt => {
                    const Icon = opt.icon;
                    const active = userType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setUserType(opt.id)}
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
                <AnimatePresence mode="wait">
                  <motion.p
                    key={userType}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground/60"
                  >
                    {userType === 'individual'
                      ? 'You will have full admin access to all features.'
                      : 'Your admin will assign your role and permissions.'}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Purpose Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purpose Type</label>
                <select
                  value={purposeType}
                  onChange={e => setPurposeType(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-[#00e5ff]/50 focus:ring-4 focus:ring-[#00e5ff]/6 transition-all"
                >
                  {PURPOSE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Purpose Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Purpose Description{' '}
                  <span className="normal-case font-normal text-muted-foreground/50">(optional)</span>
                </label>
                <textarea
                  value={purposeDescription}
                  onChange={e => setPurposeDescription(e.target.value.slice(0, 500))}
                  placeholder="Describe how you plan to use RTC features…"
                  rows={3}
                  className="w-full px-3.5 py-3 rounded-xl border border-border/60 bg-background text-sm outline-none focus:border-[#00e5ff]/50 focus:ring-4 focus:ring-[#00e5ff]/6 transition-all resize-none placeholder:text-muted-foreground/40"
                />
                <p className="text-xs text-muted-foreground/40 text-right">{purposeDescription.length}/500</p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-destructive/8 border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3 mt-1 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Saving…
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full text-center text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

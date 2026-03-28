'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile, updatePassword } from '@/store/slices/authSlice';
import { RootState, AppDispatch } from '@/store/store';
import { RoleBadge } from '@/components/RoleBadge';
import { PasswordStrength } from '@/components/PasswordStrength';
import { useTheme } from 'next-themes';
import {
  User, Lock, Info, Palette, CheckCircle, AlertCircle,
  Eye, EyeOff, Sun, Moon, Monitor, Shield, Users, Mail,
  Phone, Building2, MapPin, Briefcase, Calendar,
} from 'lucide-react';

const PURPOSE_LABELS: Record<string, string> = {
  water_management: 'Water Management',
  agriculture:      'Agriculture',
  industrial_iot:   'Industrial IoT',
  smart_city:       'Smart City',
  research:         'Research',
  other:            'Other',
};

const TABS = [
  { id: 'profile',     label: 'Profile',     icon: User },
  { id: 'security',    label: 'Security',    icon: Lock },
  { id: 'account',     label: 'Account',     icon: Info },
  { id: 'preferences', label: 'Preferences', icon: Palette },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label, icon: Icon, value, onChange, placeholder, type = 'text', optional,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label} {optional && <span className="normal-case font-normal text-muted-foreground/50">(optional)</span>}
      </label>
      <div className={`relative rounded-xl border transition-all duration-150 ${
        focused
          ? 'border-[#00e5ff]/50 ring-4 ring-[#00e5ff]/6'
          : 'border-border/60 hover:border-border'
      }`}>
        <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused ? 'text-[#00e5ff]' : 'text-muted-foreground/60'}`} />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-transparent rounded-xl outline-none text-sm placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordField({
  label, value, onChange, placeholder, autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className={`relative rounded-xl border transition-all duration-150 ${
        focused
          ? 'border-[#00e5ff]/50 ring-4 ring-[#00e5ff]/6'
          : 'border-border/60 hover:border-border'
      }`}>
        <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused ? 'text-[#00e5ff]' : 'text-muted-foreground/60'}`} />
        <input
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
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
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success';
  return (
    <motion.div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
        isSuccess
          ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
          : 'bg-destructive/8 border-destructive/20 text-destructive'
      }`}
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
    >
      {isSuccess ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span>{message}</span>
    </motion.div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((s: RootState) => s.auth);
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile form state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileDept, setProfileDept] = useState(user?.department || '');
  const [profileVillage, setProfileVillage] = useState(user?.village || '');
  const [profileProject, setProfileProject] = useState(user?.project || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Sync user data into form when user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileDept(user.department || '');
      setProfileVillage(user.village || '');
      setProfileProject(user.project || '');
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!profileName.trim() || profileName.trim().length < 2) {
      setProfileMsg({ type: 'error', text: 'Name must be at least 2 characters' });
      return;
    }
    try {
      await dispatch(updateProfile({
        name: profileName.trim(),
        phone: profilePhone.trim() || undefined,
        department: profileDept.trim() || undefined,
        village: profileVillage.trim() || undefined,
        project: profileProject.trim() || undefined,
      })).unwrap();
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: typeof err === 'string' ? err : 'Update failed' });
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) {
      setSecurityMsg({ type: 'error', text: 'All password fields are required' });
      return;
    }
    if (newPwd.length < 8) {
      setSecurityMsg({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    if (!/[A-Z]/.test(newPwd) || !/[a-z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      setSecurityMsg({ type: 'error', text: 'Password must include uppercase, lowercase, and a number' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setSecurityMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setSecurityLoading(true);
    try {
      await dispatch(updatePassword({ currentPassword: currentPwd, newPassword: newPwd })).unwrap();
      setSecurityMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setSecurityMsg({ type: 'error', text: typeof err === 'string' ? err : 'Password change failed' });
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and security</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-border/40">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-card border border-border/60 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >

          {/* ── Profile Tab ──────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
              <h2 className="font-semibold text-lg">Profile Information</h2>

              <AnimatePresence>
                {profileMsg && <Alert type={profileMsg.type} message={profileMsg.text} />}
              </AnimatePresence>

              <form className="space-y-4" onSubmit={handleProfileSave}>
                <Field label="Full Name" icon={User} value={profileName} onChange={setProfileName} placeholder="Your name" />
                <Field label="Phone" icon={Phone} value={profilePhone} onChange={setProfilePhone} placeholder="+91 9876543210" optional />
                <Field label="Department" icon={Building2} value={profileDept} onChange={setProfileDept} placeholder="Engineering" optional />
                <Field label="Village / Location" icon={MapPin} value={profileVillage} onChange={setProfileVillage} placeholder="Village or area" optional />
                <Field label="Project" icon={Briefcase} value={profileProject} onChange={setProfileProject} placeholder="Project name" optional />

                <button
                  type="submit"
                  disabled={loading}
                  className="relative px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10">{loading ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ── Security Tab ─────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
              <h2 className="font-semibold text-lg">Security</h2>

              {user?.authProvider === 'google' ? (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#00e5ff]/5 border border-[#00e5ff]/20">
                  <Info className="w-4 h-4 text-[#00e5ff] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#00e5ff' }}>Google Sign-In account</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Your account uses Google Sign-In. Password changes are not available for this account type.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {securityMsg && <Alert type={securityMsg.type} message={securityMsg.text} />}
                  </AnimatePresence>

                  <form className="space-y-4" onSubmit={handlePasswordSave}>
                    <PasswordField
                      label="Current Password"
                      value={currentPwd}
                      onChange={setCurrentPwd}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                    <PasswordField
                      label="New Password"
                      value={newPwd}
                      onChange={setNewPwd}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                    {newPwd && <div className="mt-1"><PasswordStrength password={newPwd} /></div>}
                    <PasswordField
                      label="Confirm New Password"
                      value={confirmPwd}
                      onChange={setConfirmPwd}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                    />
                    {confirmPwd && newPwd && (
                      <p className={`text-xs ${newPwd === confirmPwd ? 'text-emerald-400' : 'text-red-400'}`}>
                        {newPwd === confirmPwd ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={securityLoading || !currentPwd || !newPwd || !confirmPwd}
                      className="relative px-5 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #00b8d4 0%, #4f46e5 100%)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative z-10">{securityLoading ? 'Updating…' : 'Change Password'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ── Account Tab ──────────────────────────────────────────── */}
          {activeTab === 'account' && (
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
              <h2 className="font-semibold text-lg">Account Information</h2>
              <div className="space-y-0">
                <InfoRow icon={Mail} label="Email" value={user?.email} />
                <InfoRow icon={User} label="Name" value={user?.name} />
                <div className="flex items-start gap-3 py-2.5 border-b border-border/40">
                  <Shield className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-semibold">Role</p>
                    <div className="mt-1">
                      {user?.role && <RoleBadge role={user.role as any} />}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-2.5 border-b border-border/40">
                  {user?.userType === 'individual' ? (
                    <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Users className="w-4 h-4 text-[#00e5ff] mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-semibold">Account Type</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        user?.userType === 'individual'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-[#00e5ff]/10 border-[#00e5ff]/20'
                      }`} style={user?.userType !== 'individual' ? { color: '#00e5ff' } : undefined}>
                        {user?.userType === 'individual' ? 'Individual' : 'Team'}
                      </span>
                    </div>
                  </div>
                </div>
                {user?.purposeType && (
                  <InfoRow icon={Briefcase} label="Purpose Type" value={PURPOSE_LABELS[user.purposeType] || user.purposeType} />
                )}
                {user?.purposeDescription && (
                  <InfoRow icon={Info} label="Purpose Description" value={user.purposeDescription} />
                )}
                <div className="flex items-start gap-3 py-2.5 border-b border-border/40">
                  <div className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center">
                    {user?.authProvider === 'google' ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-semibold">Authentication</p>
                    <p className="text-sm text-foreground mt-0.5">
                      {user?.authProvider === 'google' ? 'Google Sign-In' : 'Email & Password'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-2.5 border-b border-border/40">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${user?.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wide font-semibold">Account Status</p>
                    <p className={`text-sm mt-0.5 ${user?.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {user?.createdAt && (
                  <InfoRow
                    icon={Calendar}
                    label="Member Since"
                    value={new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Preferences Tab ──────────────────────────────────────── */}
          {activeTab === 'preferences' && (
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
              <h2 className="font-semibold text-lg">Preferences</h2>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Theme</p>
                <div className="flex gap-2">
                  {([
                    { id: 'light',  label: 'Light',  icon: Sun },
                    { id: 'dark',   label: 'Dark',   icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ] as const).map(opt => {
                    const Icon = opt.icon;
                    const active = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setTheme(opt.id)}
                        className={`flex-1 flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all duration-150 ${
                          active
                            ? 'bg-[#00e5ff]/8 border-[#00e5ff]/40 text-foreground'
                            : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? '' : ''}`} style={active ? { color: '#00e5ff' } : {}} />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground/50 mt-2">
                  {theme === 'system' ? 'Follows your system preference' : `${theme === 'dark' ? 'Dark' : 'Light'} theme is active`}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

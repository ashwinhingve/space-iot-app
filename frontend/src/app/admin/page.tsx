'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { RoleBadge } from '@/components/RoleBadge';
import { useRole, UserRole, PagePermission, PermissionModule, PermissionAction, ALL_ROLES, ALL_PAGES, ROLE_LABELS, PAGE_LABELS, ROLE_DEFAULT_PERMISSIONS } from '@/hooks/useRole';
import { RootState, AppDispatch } from '@/store/store';
import { fetchSystemConfig, setMode, SystemMode } from '@/store/slices/configSlice';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config';
import {
  Users, Crown, RefreshCw, Shield, ToggleLeft, ToggleRight,
  Search, AlertTriangle, CheckCircle, Loader2, Plus, X,
  Trash2, Edit3, Key, Eye, EyeOff,
  Phone, Building2, MapPin, Briefcase, LayoutGrid, List,
  UserCheck, UserX, SlidersHorizontal, BarChart3,
  ChevronRight, Check, Info, Settings, Activity,
  UsersRound, Layers, Save, Tag,
  ChevronDown, ChevronUp, History, User,
  Wifi, Radio, Signal, Cpu, Server, Network, Zap, Satellite,
  WifiOff, TrendingUp, Clock, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: PagePermission[];
  isActive: boolean;
  authProvider: 'local' | 'google';
  createdAt: string;
  roleAssignedAt?: string;
  roleAssignedBy?: { name: string; email: string };
  phone?: string;
  department?: string;
  village?: string;
  project?: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  roles: Record<string, { total: number; active: number }>;
}

interface CreateForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  phone: string;
  department: string;
  village: string;
  project: string;
  permissions: PagePermission[];
}

interface EditForm {
  name: string;
  phone: string;
  department: string;
  village: string;
  project: string;
  role: UserRole;
  permissions: PagePermission[];
}

interface DynamicRole {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isSystem: boolean;
  permissions: Partial<Record<PermissionModule, { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean; approve?: boolean }>>;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  members: { _id: string; name: string; email: string; role: string }[];
  createdBy?: { name: string; email: string };
  createdAt: string;
}

interface ActivityLog {
  _id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  module: string;
  target?: string;
  details?: string | Record<string, unknown>;
  timestamp: string;
}

interface AdminDevice {
  _id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  mqttTopic: string;
  lastData?: { timestamp: string; value: number };
}

interface AdminNetworkDevice {
  _id: string;
  name: string;
  protocol: 'lorawan' | 'wifi' | 'bluetooth' | 'gsm';
  status: 'online' | 'offline' | 'error' | 'provisioning';
  signalStrength?: number;
  lastSeen?: string;
  tags: string[];
  lorawan?: { devEui?: string; appId?: string };
  wifi?: { ipAddress?: string; ssid?: string };
  gsm?: { networkType?: string };
  bluetooth?: { batteryLevel?: number; rssi?: number };
  createdAt: string;
}

interface AdminTTNGateway {
  _id: string;
  gatewayId: string;
  applicationId: string;
  name: string;
  isOnline: boolean;
  lastSeen: string;
  metrics: { totalUplinksSeen: number; avgRssi: number; avgSnr: number; lastRssi: number; lastSnr: number };
}

interface AdminTTNApp {
  _id: string;
  applicationId: string;
  name: string;
  isActive: boolean;
  ttnRegion: string;
}

// ─── Role group display config ────────────────────────────────────────────────

const ROLE_GROUPS = [
  { label: 'Management', roles: ['admin', 'supervisor'] as UserRole[] },
  { label: 'Field Operations', roles: ['ews', 'ows', 'wua'] as UserRole[] },
  { label: 'Executive', roles: ['executive_mechanic', 'executive_electrical', 'executive_civil'] as UserRole[] },
  { label: 'Quality & Survey', roles: ['quality_assurance', 'survey'] as UserRole[] },
];

const PAGE_INFO: Record<PagePermission, { desc: string; color: string }> = {
  dashboard:    { desc: 'Main dashboard overview',       color: 'bg-blue-500/20 text-blue-400' },
  devices:      { desc: 'Device management',             color: 'bg-cyan-500/20 text-cyan-400' },
  scada:        { desc: 'SCADA control system',          color: 'bg-emerald-500/20 text-emerald-400' },
  oms:          { desc: 'Operations management',         color: 'bg-orange-500/20 text-orange-400' },
  reports:      { desc: 'Reports & analytics',           color: 'bg-violet-500/20 text-violet-400' },
  tickets:      { desc: 'Ticket management',             color: 'bg-yellow-500/20 text-yellow-400' },
  documents:    { desc: 'Document management',           color: 'bg-pink-500/20 text-pink-400' },
  billing_view: { desc: 'Billing & finance',             color: 'bg-green-500/20 text-green-400' },
  admin:        { desc: 'Admin panel (restricted)',      color: 'bg-red-500/20 text-red-400' },
};

const PERMISSION_MODULES: { id: PermissionModule; label: string; color: string }[] = [
  { id: 'dashboard',  label: 'Dashboard',   color: 'text-blue-400' },
  { id: 'devices',    label: 'Devices',     color: 'text-cyan-400' },
  { id: 'scada',      label: 'SCADA',       color: 'text-emerald-400' },
  { id: 'oms',        label: 'OMS',         color: 'text-orange-400' },
  { id: 'reports',    label: 'Reports',     color: 'text-violet-400' },
  { id: 'tickets',    label: 'Tickets',     color: 'text-yellow-400' },
  { id: 'documents',  label: 'Documents',   color: 'text-pink-400' },
  { id: 'billing',    label: 'Billing',     color: 'text-green-400' },
  { id: 'users',      label: 'Users',       color: 'text-sky-400' },
  { id: 'admin',      label: 'Admin',       color: 'text-red-400' },
];

const PERMISSION_ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: 'view',    label: 'View' },
  { id: 'create',  label: 'Create' },
  { id: 'edit',    label: 'Edit' },
  { id: 'delete',  label: 'Delete' },
  { id: 'approve', label: 'Approve' },
];

const TEAM_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#f97316', '#ec4899', '#6366f1', '#14b8a6',
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }: { toast: { msg: string; type: 'success' | 'error' } | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92 }}
          className={`fixed bottom-6 right-4 sm:right-6 z-[100] flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/90 border-red-500/40 text-red-300'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Permission Checkbox Grid ─────────────────────────────────────────────────

function PermissionGrid({
  selected,
  onChange,
  disabled = false,
}: {
  selected: PagePermission[];
  onChange: (perms: PagePermission[]) => void;
  disabled?: boolean;
}) {
  const toggle = (p: PagePermission) => {
    if (p === 'admin') return; // admin permission is always locked
    onChange(
      selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p]
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ALL_PAGES.map(p => {
        const checked = selected.includes(p);
        const isLocked = p === 'admin';
        return (
          <button
            key={p}
            type="button"
            disabled={disabled || isLocked}
            onClick={() => toggle(p)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
              checked
                ? 'border-brand-500/50 bg-brand-500/10 text-foreground'
                : 'border-border/30 bg-secondary/20 text-muted-foreground'
            } ${disabled || isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-500/30 cursor-pointer'}`}
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              checked ? 'bg-brand-500 border-brand-500' : 'border-border/50'
            }`}>
              {checked && <Check className="h-2.5 w-2.5 text-white" />}
            </span>
            <span className="font-medium truncate">{PAGE_LABELS[p]}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
  token,
}: {
  onClose: () => void;
  onCreated: (user: AdminUser) => void;
  token: string | null;
}) {
  const [form, setForm] = useState<CreateForm>({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'operator',
    phone: '', department: '', village: '', project: '',
    permissions: ROLE_DEFAULT_PERMISSIONS['operator'],
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const setField = (key: keyof CreateForm, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
  };

  const handleRoleChange = (role: UserRole) => {
    setForm(f => ({
      ...f,
      role,
      permissions: ROLE_DEFAULT_PERMISSIONS[role] || ['dashboard'],
    }));
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email format';
    if (!form.password) return 'Password is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          permissions: form.permissions,
          phone: form.phone.trim() || undefined,
          department: form.department.trim() || undefined,
          village: form.village.trim() || undefined,
          project: form.project.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create user');
      onCreated(data.user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative z-10 w-full max-w-lg bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
              <Plus className="h-4 w-4 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Create New User</h2>
              <p className="text-xs text-muted-foreground">Step {step} of 2 — {step === 1 ? 'Account Info' : 'Role & Permissions'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 transition-colors ${s <= step ? 'bg-brand-500' : 'bg-border/30'}`} />
          ))}
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setField('name', e.target.value)}
                    placeholder="e.g. Ahmed Khan"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="user@example.com"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setField('password', e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm Password *</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setField('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setField('department', e.target.value)}
                    placeholder="e.g. Engineering"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Village</label>
                  <input
                    type="text"
                    value={form.village}
                    onChange={e => setField('village', e.target.value)}
                    placeholder="e.g. Lahore"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Project Name</label>
                  <input
                    type="text"
                    value={form.project}
                    onChange={e => setField('project', e.target.value)}
                    placeholder="e.g. OMS Project A"
                    className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Assign Role *</label>
                <select
                  value={form.role}
                  onChange={e => handleRoleChange(e.target.value as UserRole)}
                  className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  {ALL_ROLES.filter(r => r !== 'admin').map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Page Permissions</label>
                  <span className="text-[10px] text-muted-foreground/60">Auto-set from role • customizable</span>
                </div>
                <PermissionGrid
                  selected={form.permissions}
                  onChange={perms => setForm(f => ({ ...f, permissions: perms }))}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-border/40">
          {step === 2 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Back
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          )}
          {step === 1 ? (
            <Button size="sm" onClick={handleNext} className="bg-brand-500 hover:bg-brand-600 text-white px-6">
              Next →
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white px-6 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Create User
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit User Drawer ─────────────────────────────────────────────────────────

function EditUserDrawer({
  user: targetUser,
  currentUserId,
  token,
  onClose,
  onUpdated,
  showToast,
}: {
  user: AdminUser;
  currentUserId: string | undefined;
  token: string | null;
  onClose: () => void;
  onUpdated: (updated: AdminUser) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState<EditForm>({
    name: targetUser.name,
    phone: targetUser.phone || '',
    department: targetUser.department || '',
    village: targetUser.village || '',
    project: targetUser.project || '',
    role: targetUser.role,
    permissions: targetUser.permissions || [],
  });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'role' | 'permissions'>('profile');

  const isAdminUser = targetUser.email === 'spaceautomation29@gmail.com';
  const isSelf = targetUser._id === currentUserId;
  const authHdr = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleRoleChange = (role: UserRole) => {
    setForm(f => ({
      ...f,
      role,
      permissions: ROLE_DEFAULT_PERMISSIONS[role] || ['dashboard'],
    }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${targetUser._id}/profile`, {
        method: 'PATCH',
        headers: authHdr,
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          department: form.department.trim() || undefined,
          village: form.village.trim() || undefined,
          project: form.project.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      onUpdated({ ...targetUser, ...data.user });
      showToast('Profile updated');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveRole = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${targetUser._id}/role`, {
        method: 'PATCH',
        headers: authHdr,
        body: JSON.stringify({ role: form.role, resetPermissions: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      const updated = { ...targetUser, ...data.user };
      setForm(f => ({ ...f, permissions: updated.permissions || [] }));
      onUpdated(updated);
      showToast(`Role updated to ${ROLE_LABELS[form.role]}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${targetUser._id}/permissions`, {
        method: 'PATCH',
        headers: authHdr,
        body: JSON.stringify({ permissions: form.permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      onUpdated({ ...targetUser, ...data.user });
      showToast('Permissions updated');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: Edit3 },
    { id: 'role' as const, label: 'Role', icon: Key },
    { id: 'permissions' as const, label: 'Permissions', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <motion.div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative ml-auto w-full max-w-md h-full bg-background border-l border-border/50 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold">
              {targetUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{targetUser.name}</p>
              <p className="text-xs text-muted-foreground">{targetUser.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-border/40 shrink-0">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeSection === s.id
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeSection === 'profile' && (
            <>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: 'name', label: 'Full Name', icon: Users, placeholder: 'Full name' },
                  { key: 'phone', label: 'Phone', icon: Phone, placeholder: '+92 300 0000000' },
                  { key: 'department', label: 'Department', icon: Briefcase, placeholder: 'e.g. Engineering' },
                  { key: 'village', label: 'Village', icon: MapPin, placeholder: 'e.g. Lahore' },
                  { key: 'project', label: 'Project Name', icon: Building2, placeholder: 'e.g. OMS Project A' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={form[key as keyof EditForm] as string}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save Profile
              </Button>
            </>
          )}

          {activeSection === 'role' && (
            <>
              <div className="rounded-xl border border-border/40 bg-secondary/10 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Current Role</span>
                </div>
                <RoleBadge role={targetUser.role} size="md" showFull />
              </div>

              {!isAdminUser && !isSelf && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Change Role</label>
                    <select
                      value={form.role}
                      onChange={e => handleRoleChange(e.target.value as UserRole)}
                      className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    >
                      {ALL_ROLES.filter(r => r !== 'admin').map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-start gap-2 text-xs text-amber-400">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Changing the role will reset permissions to the new role&apos;s defaults.
                  </div>
                  <Button
                    size="sm"
                    onClick={saveRole}
                    disabled={saving || form.role === targetUser.role}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    Update Role
                  </Button>
                </>
              )}

              {(isAdminUser || isSelf) && (
                <p className="text-xs text-muted-foreground text-center">
                  {isAdminUser ? 'Admin role cannot be changed.' : 'Cannot change your own role.'}
                </p>
              )}
            </>
          )}

          {activeSection === 'permissions' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {form.permissions.length} of {ALL_PAGES.length} pages enabled
                </span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, permissions: ROLE_DEFAULT_PERMISSIONS[f.role] || ['dashboard'] }))}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Reset to role defaults
                </button>
              </div>
              <PermissionGrid
                selected={form.permissions}
                onChange={perms => setForm(f => ({ ...f, permissions: perms }))}
                disabled={isAdminUser}
              />
              {!isAdminUser && (
                <Button
                  size="sm"
                  onClick={savePermissions}
                  disabled={saving}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Save Permissions
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  useRole();
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((s: RootState) => s.auth.token);
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const systemMode = useSelector((s: RootState) => s.config.mode);
  const configCompanyName = useSelector((s: RootState) => s.config.companyName);

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'roles' | 'teams' | 'system' | 'infrastructure'>('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Roles tab state
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([]);
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null);
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [roleFormData, setRoleFormData] = useState({ name: '', description: '', color: '#3b82f6', permissions: {} as DynamicRole['permissions'] });
  const [roleLoading, setRoleLoading] = useState(false);

  // Teams tab state
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({ name: '', description: '', color: '#3b82f6' });
  const [teamLoading, setTeamLoading] = useState(false);
  const [addMemberInput, setAddMemberInput] = useState<Record<string, string>>({});

  // System tab state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [systemSaving, setSystemSaving] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logModule, setLogModule] = useState('');

  // Infrastructure tab state
  const [adminDevices, setAdminDevices] = useState<AdminDevice[]>([]);
  const [adminNetDevices, setAdminNetDevices] = useState<AdminNetworkDevice[]>([]);
  const [adminGateways, setAdminGateways] = useState<AdminTTNGateway[]>([]);
  const [adminTTNApps, setAdminTTNApps] = useState<AdminTTNApp[]>([]);
  const [infraLoading, setInfraLoading] = useState(false);
  const [infraSubTab, setInfraSubTab] = useState<'mqtt' | 'network' | 'gateways'>('mqtt');

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const authHeaders = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes, rolesRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users?limit=200`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers: authHeaders }),
        fetch(API_ENDPOINTS.ROLES, { headers: authHeaders }),
        fetch(API_ENDPOINTS.TEAMS, { headers: authHeaders }),
      ]);
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users ?? []); }
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats ?? null); }
      if (rolesRes.ok) { const d = await rolesRes.json(); setDynamicRoles(d.roles ?? []); }
      if (teamsRes.ok) { const d = await teamsRes.json(); setTeams(d.teams ?? []); }
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast]);

  const fetchLogs = useCallback(async (page = 1, module = '') => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (module) params.set('module', module);
      const res = await fetch(`${API_ENDPOINTS.ACTIVITY_LOGS}?${params}`, { headers: authHeaders });
      if (res.ok) { const d = await res.json(); setActivityLogs(d.logs ?? []); }
    } catch {
      showToast('Failed to load activity logs', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [authHeaders, showToast]);

  const fetchInfrastructure = useCallback(async () => {
    setInfraLoading(true);
    try {
      const [devRes, netRes, appsRes] = await Promise.all([
        fetch(API_ENDPOINTS.DEVICES, { headers: authHeaders }),
        fetch(API_ENDPOINTS.NETWORK_DEVICES, { headers: authHeaders }),
        fetch(API_ENDPOINTS.TTN_APPLICATIONS, { headers: authHeaders }),
      ]);
      if (devRes.ok)  { const d = await devRes.json();  setAdminDevices(d.devices ?? d ?? []); }
      if (netRes.ok)  { const d = await netRes.json();  setAdminNetDevices(d.devices ?? d ?? []); }
      if (appsRes.ok) {
        const d = await appsRes.json();
        const apps: AdminTTNApp[] = d.applications ?? d ?? [];
        setAdminTTNApps(apps);
        // Fetch gateway stats for every app in parallel
        const gwResults = await Promise.allSettled(
          apps.map(app =>
            fetch(API_ENDPOINTS.TTN_GATEWAY_STATS(app.applicationId), { headers: authHeaders }).then(r => r.json())
          )
        );
        const allGateways: AdminTTNGateway[] = [];
        gwResults.forEach(r => {
          if (r.status === 'fulfilled' && r.value?.gateways) allGateways.push(...r.value.gateways);
        });
        setAdminGateways(allGateways);
      }
    } catch {
      showToast('Failed to load infrastructure data', 'error');
    } finally {
      setInfraLoading(false);
    }
  }, [authHeaders, showToast]);

  // Role CRUD
  const saveRole = useCallback(async () => {
    if (!roleFormData.name.trim()) return;
    setRoleLoading(true);
    try {
      const isEdit = !!editingRole;
      const url = isEdit ? API_ENDPOINTS.ROLE_DETAIL(editingRole.slug) : API_ENDPOINTS.ROLES;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(roleFormData),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      if (isEdit) {
        setDynamicRoles(prev => prev.map(r => r._id === editingRole._id ? d.role : r));
      } else {
        setDynamicRoles(prev => [...prev, d.role]);
      }
      setIsRoleFormOpen(false);
      setEditingRole(null);
      setRoleFormData({ name: '', description: '', color: '#3b82f6', permissions: {} });
      showToast(isEdit ? 'Role updated' : 'Role created');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setRoleLoading(false);
    }
  }, [authHeaders, editingRole, roleFormData, showToast]);

  const deleteRole = useCallback(async (role: DynamicRole) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(API_ENDPOINTS.ROLE_DETAIL(role.slug), { method: 'DELETE', headers: authHeaders });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setDynamicRoles(prev => prev.filter(r => r._id !== role._id));
      showToast('Role deleted');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  }, [authHeaders, showToast]);

  // Team CRUD
  const saveTeam = useCallback(async () => {
    if (!teamFormData.name.trim()) return;
    setTeamLoading(true);
    try {
      const isEdit = !!editingTeam;
      const url = isEdit ? API_ENDPOINTS.TEAM_DETAIL(editingTeam._id) : API_ENDPOINTS.TEAMS;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: authHeaders,
        body: JSON.stringify(teamFormData),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      if (isEdit) {
        setTeams(prev => prev.map(t => t._id === editingTeam._id ? { ...t, ...d.team } : t));
      } else {
        setTeams(prev => [...prev, d.team]);
      }
      setIsTeamFormOpen(false);
      setEditingTeam(null);
      setTeamFormData({ name: '', description: '', color: '#3b82f6' });
      showToast(isEdit ? 'Team updated' : 'Team created');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setTeamLoading(false);
    }
  }, [authHeaders, editingTeam, teamFormData, showToast]);

  const deleteTeam = useCallback(async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    try {
      const res = await fetch(API_ENDPOINTS.TEAM_DETAIL(team._id), { method: 'DELETE', headers: authHeaders });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setTeams(prev => prev.filter(t => t._id !== team._id));
      showToast('Team deleted');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  }, [authHeaders, showToast]);

  const addTeamMember = useCallback(async (teamId: string, userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(API_ENDPOINTS.TEAM_MEMBERS(teamId), {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      setTeams(prev => prev.map(t => t._id === teamId ? { ...t, members: d.team.members } : t));
      setAddMemberInput(prev => ({ ...prev, [teamId]: '' }));
      showToast('Member added');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  }, [authHeaders, showToast]);

  const removeTeamMember = useCallback(async (teamId: string, userId: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.TEAM_MEMBER(teamId, userId), { method: 'DELETE', headers: authHeaders });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      setTeams(prev => prev.map(t => t._id === teamId ? { ...t, members: d.team.members } : t));
      showToast('Member removed');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  }, [authHeaders, showToast]);

  // System config save
  const saveSystemConfig = useCallback(async () => {
    setSystemSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.SYSTEM_CONFIG, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ mode: systemMode, companyName: companyNameInput }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      dispatch(fetchSystemConfig());
      showToast('System config saved');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setSystemSaving(false);
    }
  }, [authHeaders, systemMode, companyNameInput, dispatch, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCompanyNameInput(configCompanyName); }, [configCompanyName]);
  useEffect(() => { if (activeTab === 'system') fetchLogs(logPage, logModule); }, [activeTab, fetchLogs, logPage, logModule]);
  useEffect(() => { if (activeTab === 'infrastructure') fetchInfrastructure(); }, [activeTab, fetchInfrastructure]);

  const handleToggleActive = async (userId: string, current: boolean) => {
    setUpdating(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/active`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ isActive: !current })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !current } : u));
      showToast(`Account ${!current ? 'enabled' : 'disabled'}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to update', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    setUpdating(user._id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${user._id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      setUsers(prev => prev.filter(u => u._id !== user._id));
      showToast(`${user.name} deleted`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = useMemo(() => users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'inactive' && u.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q)
      );
    }
    return true;
  }), [users, roleFilter, statusFilter, search]);

  // ─── Overview Tab ───────────────────────────────────────────────────────────

  const OverviewTab = () => {
    if (!stats) return null;

    const topRoles = ALL_ROLES
      .filter(r => r !== 'admin')
      .map(r => ({ role: r, ...( stats.roles[r] || { total: 0, active: 0 }) }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total);

    return (
      <div className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users',  value: stats.totalUsers,  icon: Users,     color: 'border-border/40 bg-secondary/10', ic: 'text-muted-foreground' },
            { label: 'Active',       value: stats.activeUsers, icon: UserCheck,  color: 'border-emerald-500/20 bg-emerald-500/5', ic: 'text-emerald-400' },
            { label: 'Inactive',     value: stats.totalUsers - stats.activeUsers, icon: UserX, color: 'border-red-500/20 bg-red-500/5', ic: 'text-red-400' },
            { label: 'Roles',        value: ALL_ROLES.filter(r => (stats.roles[r]?.total ?? 0) > 0).length, icon: Shield, color: 'border-brand-500/20 bg-brand-500/5', ic: 'text-brand-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.ic}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Role distribution */}
        <div className="rounded-xl border border-border/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Role Distribution</h3>
          </div>
          {topRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No users assigned yet</p>
          ) : (
            <div className="space-y-2.5">
              {topRoles.slice(0, 10).map(({ role, total, active }) => (
                <div key={role} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <RoleBadge role={role} size="sm" showFull />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-secondary/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${Math.round((total / Math.max(stats.totalUsers, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                    {active}/{total} active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent users */}
        <div className="rounded-xl border border-border/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Recently Added
            </h3>
            <button
              onClick={() => setActiveTab('users')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {[...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(u => (
              <div key={u._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <RoleBadge role={u.role} size="sm" />
                <span className={`h-2 w-2 rounded-full shrink-0 ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── Users Tab ──────────────────────────────────────────────────────────────

  const UsersTab = () => (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search name, email, phone, department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-border/50 bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as UserRole | '')}
            className="h-9 rounded-lg border border-border/50 bg-background px-2 text-sm dark:[color-scheme:dark] min-w-[110px]"
          >
            <option value="">All Roles</option>
            {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
            className="h-9 rounded-lg border border-border/50 bg-background px-2 text-sm dark:[color-scheme:dark] min-w-[100px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 transition-colors ${viewMode === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 transition-colors ${viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create User</span>
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading users…
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
          <Users className="h-8 w-8 opacity-30" />
          <p>No users found</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid view
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredUsers.map(u => {
            const isAdminUser = u.email === 'spaceautomation29@gmail.com';
            const isSelf = u._id === currentUser?._id;
            const isBusy = updating === u._id;
            return (
              <motion.div
                key={u._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/40 bg-secondary/10 p-4 hover:border-border/70 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[120px]">
                        {u.name}
                        {isSelf && <span className="ml-1 text-[9px] text-brand-400">(you)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{u.email}</p>
                    </div>
                  </div>
                  <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <RoleBadge role={u.role} size="sm" showFull />
                  <div className="flex items-center gap-1">
                    {!isAdminUser && !isSelf && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleToggleActive(u._id, u.isActive)}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          u.isActive ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={u.isActive ? 'Disable' : 'Enable'}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                          u.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => setEditingUser(u)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      title="Edit"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {!isAdminUser && !isSelf && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {(u.phone || u.department) && (
                  <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap gap-2">
                    {u.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{u.phone}</span>}
                    {u.department && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Briefcase className="h-2.5 w-2.5" />{u.department}</span>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        // Table view
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  {['User', 'Role', 'Pages', 'Status', 'Phone/Dept', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {filteredUsers.map(u => {
                  const isAdminUser = u.email === 'spaceautomation29@gmail.com';
                  const isSelf = u._id === currentUser?._id;
                  const isBusy = updating === u._id;
                  return (
                    <motion.tr
                      key={u._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-secondary/10 transition-colors"
                    >
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[130px]">
                              {u.name}
                              {isSelf && <span className="ml-1 text-[9px] text-brand-400">(you)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[130px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} size="sm" />
                      </td>

                      {/* Pages */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {(u.permissions || []).length}/{ALL_PAGES.length}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          u.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      {/* Phone/Dept */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {u.phone && <p>{u.phone}</p>}
                          {u.department && <p className="opacity-70">{u.department}</p>}
                          {!u.phone && !u.department && <p className="opacity-40">—</p>}
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                            title="Edit user"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {!isAdminUser && !isSelf && (
                            <>
                              <button
                                disabled={isBusy}
                                onClick={() => handleToggleActive(u._id, u.isActive)}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                  u.isActive
                                    ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                                    : 'text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={u.isActive ? 'Disable account' : 'Enable account'}
                              >
                                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                                  u.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                disabled={isBusy}
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                title="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Roles & Permissions Tab ────────────────────────────────────────────────

  // ─── Roles Tab ──────────────────────────────────────────────────────────────

  const openEditRole = (role: DynamicRole) => {
    setEditingRole(role);
    setRoleFormData({ name: role.name, description: role.description ?? '', color: role.color ?? '#3b82f6', permissions: { ...role.permissions } });
    setIsRoleFormOpen(true);
  };

  const toggleRolePerm = (module: PermissionModule, action: PermissionAction) => {
    setRoleFormData(prev => {
      const mod = prev.permissions[module] ?? {};
      return { ...prev, permissions: { ...prev.permissions, [module]: { ...mod, [action]: !mod[action] } } };
    });
  };

  const RolesTab = () => (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Dynamic roles with fine-grained module permissions. System roles cannot be deleted.
        </p>
        <Button size="sm" onClick={() => { setEditingRole(null); setRoleFormData({ name: '', description: '', color: '#3b82f6', permissions: {} }); setIsRoleFormOpen(true); }}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> New Role
        </Button>
      </div>

      {/* Role Form */}
      <AnimatePresence>
        {isRoleFormOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-brand-500/30 bg-brand-500/5 overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{editingRole ? `Edit: ${editingRole.name}` : 'Create New Role'}</h3>
                <button onClick={() => { setIsRoleFormOpen(false); setEditingRole(null); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role Name *</label>
                  <input value={roleFormData.name} onChange={e => setRoleFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Field Inspector"
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                  <input value={roleFormData.description} onChange={e => setRoleFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description"
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map(c => (
                    <button key={c} onClick={() => setRoleFormData(f => ({ ...f, color: c }))}
                      style={{ background: c }}
                      className={`h-6 w-6 rounded-full transition-all ${roleFormData.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : ''}`} />
                  ))}
                </div>
              </div>
              {/* Permission Matrix */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Permissions</label>
                <div className="overflow-x-auto rounded-lg border border-border/30">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/20 bg-secondary/20">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Module</th>
                        {PERMISSION_ACTIONS.map(a => (
                          <th key={a.id} className="px-2 py-2 text-center font-medium text-muted-foreground">{a.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {PERMISSION_MODULES.map(mod => {
                        const modPerms = roleFormData.permissions[mod.id] ?? {};
                        return (
                          <tr key={mod.id} className="hover:bg-secondary/10 transition-colors">
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium ${mod.color}`}>{mod.label}</span>
                            </td>
                            {PERMISSION_ACTIONS.map(act => (
                              <td key={act.id} className="px-2 py-2 text-center">
                                <button onClick={() => toggleRolePerm(mod.id, act.id)}
                                  className={`mx-auto flex h-5 w-5 items-center justify-center rounded border transition-all ${
                                    modPerms[act.id]
                                      ? 'bg-brand-500 border-brand-500'
                                      : 'border-border/40 hover:border-brand-500/40'
                                  }`}>
                                  {modPerms[act.id] && <Check className="h-3 w-3 text-white" />}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <Button size="sm" onClick={saveRole} disabled={roleLoading || !roleFormData.name.trim()}
                className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
                {roleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roles list */}
      {dynamicRoles.length === 0 && !roleLoading ? (
        <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
          <Shield className="h-8 w-8 opacity-30" />
          <p>No roles found. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dynamicRoles.map(role => {
            const permCount = Object.values(role.permissions).reduce((sum, mod) =>
              sum + (mod ? Object.values(mod).filter(Boolean).length : 0), 0);
            return (
              <div key={role._id} className="rounded-xl border border-border/40 bg-secondary/5 hover:bg-secondary/10 transition-colors">
                <div className="flex items-center gap-3 p-4">
                  <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ background: `${role.color ?? '#3b82f6'}20`, border: `1px solid ${role.color ?? '#3b82f6'}40` }}>
                    <Tag className="h-4 w-4" style={{ color: role.color ?? '#3b82f6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{role.name}</p>
                      {role.isSystem && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          system
                        </span>
                      )}
                    </div>
                    {role.description && <p className="text-xs text-muted-foreground truncate">{role.description}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{permCount} permission{permCount !== 1 ? 's' : ''} granted</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditRole(role)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors" title="Edit">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {!role.isSystem && (
                      <button onClick={() => deleteRole(role)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Mini permission chips */}
                <div className="px-4 pb-3 flex flex-wrap gap-1">
                  {PERMISSION_MODULES.filter(m => {
                    const mp = role.permissions[m.id];
                    return mp && Object.values(mp).some(Boolean);
                  }).map(m => {
                    const mp = role.permissions[m.id] ?? {};
                    const actions = PERMISSION_ACTIONS.filter(a => mp[a.id]).map(a => a.label[0]).join('');
                    return (
                      <span key={m.id} className={`text-[10px] px-1.5 py-0.5 rounded bg-secondary/40 ${m.color}`}>
                        {m.label}:{actions}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Default role reference */}
      <details className="rounded-xl border border-border/30 overflow-hidden">
        <summary className="px-4 py-3 bg-secondary/20 text-xs font-semibold cursor-pointer flex items-center gap-2 select-none hover:bg-secondary/30 transition-colors">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          Default Page-Access Reference (read-only)
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/20 bg-secondary/10">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground w-40 whitespace-nowrap">Role</th>
                {ALL_PAGES.map(p => (
                  <th key={p} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                    <div className={`rounded px-1.5 py-0.5 text-[9px] ${PAGE_INFO[p].color}`}>{PAGE_LABELS[p]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {ROLE_GROUPS.flatMap(g => g.roles).map(role => {
                const perms = ROLE_DEFAULT_PERMISSIONS[role] || [];
                return (
                  <tr key={role} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-4 py-2.5"><RoleBadge role={role} size="sm" showFull /></td>
                    {ALL_PAGES.map(p => (
                      <td key={p} className="px-2 py-2.5 text-center">
                        {perms.includes(p) ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mx-auto" /> : <span className="text-border/50">·</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );

  // ─── Teams Tab ──────────────────────────────────────────────────────────────

  const TeamsTab = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Organize users into teams for better collaboration and access management.
        </p>
        <Button size="sm" onClick={() => { setEditingTeam(null); setTeamFormData({ name: '', description: '', color: '#3b82f6' }); setIsTeamFormOpen(true); }}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> New Team
        </Button>
      </div>

      {/* Team Form */}
      <AnimatePresence>
        {isTeamFormOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-brand-500/30 bg-brand-500/5 overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{editingTeam ? `Edit: ${editingTeam.name}` : 'Create New Team'}</h3>
                <button onClick={() => { setIsTeamFormOpen(false); setEditingTeam(null); }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Team Name *</label>
                  <input value={teamFormData.name} onChange={e => setTeamFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Field Engineers"
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                  <input value={teamFormData.description} onChange={e => setTeamFormData(f => ({ ...f, description: e.target.value }))}
                    placeholder="What does this team do?"
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Team Color</label>
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map(c => (
                    <button key={c} onClick={() => setTeamFormData(f => ({ ...f, color: c }))}
                      style={{ background: c }}
                      className={`h-6 w-6 rounded-full transition-all ${teamFormData.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : ''}`} />
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={saveTeam} disabled={teamLoading || !teamFormData.name.trim()}
                className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
                {teamLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingTeam ? 'Update Team' : 'Create Team'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
          <UsersRound className="h-8 w-8 opacity-30" />
          <p>No teams yet. Create your first team above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {teams.map(team => (
            <div key={team._id} className="rounded-xl border border-border/40 overflow-hidden">
              {/* Team header */}
              <div className="flex items-center gap-3 p-4 border-b border-border/30"
                style={{ background: `${team.color ?? '#3b82f6'}10` }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${team.color ?? '#3b82f6'}25`, border: `1.5px solid ${team.color ?? '#3b82f6'}50` }}>
                  <UsersRound className="h-4 w-4" style={{ color: team.color ?? '#3b82f6' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{team.name}</p>
                  {team.description && <p className="text-xs text-muted-foreground truncate">{team.description}</p>}
                  <p className="text-xs text-muted-foreground">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingTeam(team); setTeamFormData({ name: team.name, description: team.description ?? '', color: team.color ?? '#3b82f6' }); setIsTeamFormOpen(true); }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteTeam(team)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Members list */}
              <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
                {team.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No members yet</p>
                ) : (
                  team.members.map(m => (
                    <div key={m._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/20 transition-colors group">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                      </div>
                      <RoleBadge role={m.role} size="sm" />
                      <button onClick={() => removeTeamMember(team._id, m._id)}
                        className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-red-400 transition-all">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add member */}
              <div className="p-3 border-t border-border/30 flex gap-2">
                <select
                  value={addMemberInput[team._id] ?? ''}
                  onChange={e => setAddMemberInput(prev => ({ ...prev, [team._id]: e.target.value }))}
                  className="flex-1 h-8 rounded-lg border border-border/50 bg-background px-2 text-xs dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="">Add member…</option>
                  {users
                    .filter(u => !team.members.some(m => m._id === u._id))
                    .map(u => <option key={u._id} value={u._id}>{u.name} ({ROLE_LABELS[u.role] ?? u.role})</option>)}
                </select>
                <Button size="sm" onClick={() => addTeamMember(team._id, addMemberInput[team._id] ?? '')}
                  disabled={!addMemberInput[team._id]}
                  className="h-8 px-3 bg-brand-500 hover:bg-brand-600 text-white shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── System Tab ─────────────────────────────────────────────────────────────

  const SystemTab = () => (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="rounded-xl border border-border/40 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">System Mode</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Single User Mode</strong> gives one operator full admin access with no RBAC restrictions. <strong>Team Mode</strong> enables full role-based access control for multi-user deployments.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['single', 'team'] as SystemMode[]).map(m => (
            <button key={m} onClick={() => dispatch(setMode(m))}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                systemMode === m
                  ? m === 'single'
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-brand-500/50 bg-brand-500/10'
                  : 'border-border/40 hover:border-border/70'
              }`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                systemMode === m
                  ? m === 'single' ? 'bg-amber-500/20' : 'bg-brand-500/20'
                  : 'bg-secondary/30'
              }`}>
                {m === 'single'
                  ? <User className={`h-4 w-4 ${systemMode === m ? 'text-amber-400' : 'text-muted-foreground'}`} />
                  : <Users className={`h-4 w-4 ${systemMode === m ? 'text-brand-400' : 'text-muted-foreground'}`} />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${systemMode === m ? (m === 'single' ? 'text-amber-300' : 'text-brand-300') : ''}`}>
                  {m === 'single' ? 'Single User Mode' : 'Team Mode'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m === 'single' ? 'Full access, no restrictions' : 'Role-based access control'}
                </p>
              </div>
              {systemMode === m && (
                <CheckCircle className={`h-4 w-4 ml-auto shrink-0 ${m === 'single' ? 'text-amber-400' : 'text-brand-400'}`} />
              )}
            </button>
          ))}
        </div>
        {systemMode === 'single' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Single User Mode bypasses all role checks. All users get full admin access.
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Company Name</label>
          <input value={companyNameInput} onChange={e => setCompanyNameInput(e.target.value)}
            placeholder="e.g. Space Autotech"
            className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
        <Button size="sm" onClick={saveSystemConfig} disabled={systemSaving}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
          {systemSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save System Config
        </Button>
      </div>

      {/* Activity Log */}
      <div className="rounded-xl border border-border/40 p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Activity Log</h3>
          </div>
          <div className="flex items-center gap-2">
            <select value={logModule} onChange={e => { setLogModule(e.target.value); setLogPage(1); }}
              className="h-8 rounded-lg border border-border/50 bg-background px-2 text-xs dark:[color-scheme:dark] min-w-[110px]">
              <option value="">All modules</option>
              {PERMISSION_MODULES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button onClick={() => fetchLogs(logPage, logModule)} disabled={logsLoading}
              className="h-8 px-2.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading logs…
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Activity className="h-6 w-6 opacity-30" />
            <p>No activity logs</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activityLogs.map(log => (
              <div key={log._id} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-secondary/20 transition-colors">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {log.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium">{log.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-mono">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    {log.target && <span className="text-xs text-muted-foreground truncate">{log.target}</span>}
                  </div>
                  {log.details && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {new Date(log.timestamp).toLocaleString()} · {log.module} · {log.userRole}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-1 border-t border-border/20">
          <p className="text-xs text-muted-foreground">Page {logPage}</p>
          <div className="flex gap-1">
            <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
              className="h-7 px-2.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-40 transition-colors">
              <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
            </button>
            <button onClick={() => setLogPage(p => p + 1)} disabled={activityLogs.length < 30}
              className="h-7 px-2.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 disabled:opacity-40 transition-colors">
              <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Infrastructure Tab ─────────────────────────────────────────────────────

  const InfrastructureTab = () => {
    const onlineMqtt = adminDevices.filter(d => d.status === 'online').length;
    const onlineNet  = adminNetDevices.filter(d => d.status === 'online').length;
    const onlineGw   = adminGateways.filter(g => {
      if (!g.lastSeen) return false;
      return (Date.now() - new Date(g.lastSeen).getTime()) < 15 * 60 * 1000;
    }).length;

    const PROTO_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      lorawan:   { label: 'LoRaWAN',   color: 'text-violet-400 bg-violet-500/10 border-violet-500/25',   icon: <Radio    className="h-3 w-3" /> },
      wifi:      { label: 'Wi-Fi',     color: 'text-cyan-400   bg-cyan-500/10   border-cyan-500/25',     icon: <Wifi     className="h-3 w-3" /> },
      bluetooth: { label: 'Bluetooth', color: 'text-blue-400   bg-blue-500/10   border-blue-500/25',     icon: <Signal   className="h-3 w-3" /> },
      gsm:       { label: 'GSM',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: <Network  className="h-3 w-3" /> },
    };

    const netByProto = {
      lorawan:   adminNetDevices.filter(d => d.protocol === 'lorawan').length,
      wifi:      adminNetDevices.filter(d => d.protocol === 'wifi').length,
      bluetooth: adminNetDevices.filter(d => d.protocol === 'bluetooth').length,
      gsm:       adminNetDevices.filter(d => d.protocol === 'gsm').length,
    };

    const appName = (appId: string) => adminTTNApps.find(a => a.applicationId === appId)?.name ?? appId;

    const kpiCards = [
      { label: 'MQTT Devices',    value: adminDevices.length,    sub: `${onlineMqtt} online`,   icon: Cpu,      color: 'from-sky-500/20 to-sky-600/10 border-sky-500/25',     iconColor: 'text-sky-400' },
      { label: 'Network Devices', value: adminNetDevices.length, sub: `${onlineNet} online`,    icon: Server,   color: 'from-violet-500/20 to-violet-600/10 border-violet-500/25', iconColor: 'text-violet-400' },
      { label: 'TTN Gateways',    value: adminGateways.length,   sub: `${onlineGw} online`,     icon: Satellite,color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/25', iconColor: 'text-emerald-400' },
      { label: 'TTN Applications',value: adminTTNApps.length,    sub: `${adminTTNApps.filter(a => a.isActive).length} active`, icon: Zap, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/25', iconColor: 'text-amber-400' },
    ];

    const subTabs = [
      { id: 'mqtt'     as const, label: `MQTT (${adminDevices.length})`,       icon: Cpu },
      { id: 'network'  as const, label: `Network (${adminNetDevices.length})`, icon: Server },
      { id: 'gateways' as const, label: `Gateways (${adminGateways.length})`,  icon: Satellite },
    ];

    if (infraLoading) return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading infrastructure…
      </div>
    );

    return (
      <div className="space-y-5">
        {/* Refresh row */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Network className="h-4 w-4 text-brand-400" /> Infrastructure Overview
          </h2>
          <button
            onClick={fetchInfrastructure}
            className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${infraLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`rounded-xl border bg-gradient-to-br ${c.color} p-4 flex items-start gap-3`}>
                <div className={`rounded-lg p-2 bg-background/40 ${c.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs font-medium text-foreground/80">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Network device protocol breakdown */}
        {adminNetDevices.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Network Device Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(netByProto) as [string, number][]).map(([proto, count]) => {
                const m = PROTO_META[proto];
                return (
                  <div key={proto} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${m.color}`}>
                    {m.icon}
                    <div>
                      <p className="text-xs font-semibold">{m.label}</p>
                      <p className="text-lg font-bold leading-tight">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sub-tab navigation */}
        <div className="flex gap-1 border-b border-border/40">
          {subTabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setInfraSubTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                  infraSubTab === t.id
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── MQTT Devices ── */}
        {infraSubTab === 'mqtt' && (
          adminDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
              <Cpu className="h-8 w-8 opacity-30" />
              <p className="text-sm">No MQTT devices registered</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Device</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">MQTT Topic</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Last Value</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Last Seen</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminDevices.map((dev, i) => (
                    <tr key={dev._id} className={`border-b border-border/20 hover:bg-secondary/10 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${dev.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="font-medium truncate max-w-[120px]">{dev.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">{dev.type}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-[11px] bg-secondary/40 rounded px-1.5 py-0.5 text-muted-foreground">{dev.mqttTopic}</code>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono text-foreground/80">{dev.lastData?.value ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {dev.lastData?.timestamp ? new Date(dev.lastData.timestamp).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                          dev.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-red-500/10 text-red-400 border-red-500/25'
                        }`}>
                          {dev.status === 'online' ? <CheckCircle className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                          {dev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Network Devices ── */}
        {infraSubTab === 'network' && (
          adminNetDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
              <Server className="h-8 w-8 opacity-30" />
              <p className="text-sm">No network devices registered</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Device</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Protocol</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Signal</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Details</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Last Seen</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminNetDevices.map((dev, i) => {
                    const m = PROTO_META[dev.protocol];
                    const statusColor =
                      dev.status === 'online'       ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                      dev.status === 'error'         ? 'bg-red-500/10 text-red-400 border-red-500/25' :
                      dev.status === 'provisioning'  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25' :
                                                       'bg-secondary/20 text-muted-foreground border-border/30';
                    const detail =
                      dev.protocol === 'lorawan'   ? (dev.lorawan?.devEui ?? '—') :
                      dev.protocol === 'wifi'      ? (dev.wifi?.ssid ?? dev.wifi?.ipAddress ?? '—') :
                      dev.protocol === 'gsm'       ? (dev.gsm?.networkType ?? '—') :
                      dev.protocol === 'bluetooth' ? (dev.bluetooth?.batteryLevel != null ? `${dev.bluetooth.batteryLevel}% battery` : '—') : '—';
                    return (
                      <tr key={dev._id} className={`border-b border-border/20 hover:bg-secondary/10 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[120px]">{dev.name}</p>
                          {dev.tags.length > 0 && <p className="text-[10px] text-muted-foreground">{dev.tags[0]}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${m.color}`}>
                            {m.icon}{m.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {dev.signalStrength != null ? (
                            <div className="flex items-center gap-1.5">
                              <Signal className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-mono">{dev.signalStrength} dBm</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-[11px] text-muted-foreground">{detail}</code>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {dev.lastSeen ? new Date(dev.lastSeen).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>
                            {dev.status === 'online' ? <CheckCircle className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                            {dev.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── LoRaWAN Gateways ── */}
        {infraSubTab === 'gateways' && (
          adminGateways.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-muted-foreground">
              <Satellite className="h-8 w-8 opacity-30" />
              <p className="text-sm">No gateways found</p>
              {adminTTNApps.length === 0 && <p className="text-xs">Add a TTN application first</p>}
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-secondary/20">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Gateway</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Application</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                      <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> RSSI</div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">SNR</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                      <div className="flex items-center gap-1"><Hash className="h-3 w-3" /> Uplinks</div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last Seen</div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminGateways.map((gw, i) => {
                    const effectivelyOnline = gw.lastSeen
                      ? (Date.now() - new Date(gw.lastSeen).getTime()) < 15 * 60 * 1000
                      : false;
                    return (
                      <tr key={gw._id} className={`border-b border-border/20 hover:bg-secondary/10 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/5'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${effectivelyOnline ? 'bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`} />
                            <div>
                              <p className="font-medium truncate max-w-[120px]">{gw.name}</p>
                              <code className="text-[10px] text-muted-foreground">{gw.gatewayId}</code>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">{appName(gw.applicationId)}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-mono font-semibold ${gw.metrics.avgRssi > -100 ? 'text-emerald-400' : gw.metrics.avgRssi > -115 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {gw.metrics.avgRssi ? `${gw.metrics.avgRssi.toFixed(1)} dBm` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs font-mono font-semibold ${gw.metrics.avgSnr > 0 ? 'text-emerald-400' : gw.metrics.avgSnr > -5 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {gw.metrics.avgSnr ? `${gw.metrics.avgSnr.toFixed(1)} dB` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs font-mono text-foreground/80">{gw.metrics.totalUplinksSeen.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {gw.lastSeen ? new Date(gw.lastSeen).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            effectivelyOnline
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-secondary/20 text-muted-foreground border-border/30'
                          }`}>
                            {effectivelyOnline ? <CheckCircle className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                            {effectivelyOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'overview'        as const, label: 'Overview',                      icon: BarChart3 },
    { id: 'users'           as const, label: `Users (${users.length})`,        icon: Users },
    { id: 'infrastructure'  as const, label: `Infrastructure`,                 icon: Network },
    { id: 'roles'           as const, label: 'Roles',                          icon: Shield },
    { id: 'teams'           as const, label: 'Teams',                          icon: UsersRound },
    { id: 'system'          as const, label: 'System',                         icon: Settings },
  ];

  return (
    <MainLayout>
      <RoleGuard roles={['admin']} showDenied>
        <div className="container max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20">
                  <Crown className="h-4 w-4 text-red-400" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage users, roles, and permissions across the system
              </p>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={fetchData} disabled={loading}
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b border-border/40">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden capitalize">{tab.id}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {loading && activeTab === 'overview' ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  {activeTab === 'overview'        && <OverviewTab />}
                  {activeTab === 'users'           && <UsersTab />}
                  {activeTab === 'infrastructure'  && <InfrastructureTab />}
                  {activeTab === 'roles'           && <RolesTab />}
                  {activeTab === 'teams'           && <TeamsTab />}
                  {activeTab === 'system'          && <SystemTab />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Create User Modal */}
        <AnimatePresence>
          {isCreateOpen && (
            <CreateUserModal
              token={token}
              onClose={() => setIsCreateOpen(false)}
              onCreated={(user) => {
                setUsers(prev => [user, ...prev]);
                setIsCreateOpen(false);
                showToast(`User ${user.name} created successfully!`);
                fetchData(); // refresh stats
              }}
            />
          )}
        </AnimatePresence>

        {/* Edit User Drawer */}
        <AnimatePresence>
          {editingUser && (
            <EditUserDrawer
              user={editingUser}
              currentUserId={currentUser?._id}
              token={token}
              onClose={() => setEditingUser(null)}
              onUpdated={(updated) => {
                setUsers(prev => prev.map(u => u._id === updated._id ? updated : u));
                setEditingUser(updated);
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </RoleGuard>

      <Toast toast={toast} />
    </MainLayout>
  );
}

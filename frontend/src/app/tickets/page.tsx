'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { RoleBadge } from '@/components/RoleBadge';
import { useRole, ROLE_LABELS } from '@/hooks/useRole';
import { RootState } from '@/store/store';
import { API_ENDPOINTS } from '@/lib/config';
import {
  ClipboardList, Plus, X, Search, AlertTriangle, CheckCircle,
  Loader2, RefreshCw, Calendar, MapPin,
  ChevronRight, Clock, Ticket, ArrowRight, Check,
  MessageSquare, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkflowStage, TicketPriority, TicketCategory, TicketSummary } from './shared';
import { STAGE_CONFIG, PRIORITY_CONFIG } from './shared';

interface TicketStats {
  total: number;
  byStage: Record<WorkflowStage, number>;
  byPriority: Record<TicketPriority, number>;
}

interface CreateForm {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  village: string;
  minar: string;
  projectName: string;
  oms: string;
  deadline: string;
  assignedTo: string;
}

const EMPTY_FORM: CreateForm = {
  title: '', description: '', priority: 'normal', category: 'other',
  village: '', minar: '', projectName: '', oms: '', deadline: '', assignedTo: '',
};

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'maintenance',  label: 'Maintenance' },
  { value: 'fault',        label: 'Fault' },
  { value: 'installation', label: 'Installation' },
  { value: 'inspection',   label: 'Inspection' },
  { value: 'billing',      label: 'Billing' },
  { value: 'document',     label: 'Document' },
  { value: 'other',        label: 'Other' },
];

const ACTIVE_STAGES: WorkflowStage[] = ['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review'];

// ─── Stage Pipeline Banner ────────────────────────────────────────────────────

function StagePipeline({ stats }: { stats: TicketStats | null }) {
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/5 p-4">
      <div className="flex items-center gap-0 overflow-x-auto">
        {ACTIVE_STAGES.map((stage, i) => {
          const cfg = STAGE_CONFIG[stage];
          const Icon = cfg.icon;
          const count = stats?.byStage[stage] ?? 0;
          return (
            <div key={stage} className="flex items-center shrink-0">
              <div className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${count > 0 ? cfg.bg : ''}`}>
                <div className={`flex items-center gap-1.5 ${count > 0 ? cfg.color : 'text-muted-foreground/50'}`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold whitespace-nowrap">{cfg.label}</span>
                </div>
                <span className={`text-lg font-bold tabular-nums leading-none ${count > 0 ? cfg.color : 'text-muted-foreground/30'}`}>
                  {count}
                </span>
              </div>
              {i < ACTIVE_STAGES.length - 1 && (
                <ArrowRight className="h-3 w-3 text-border/40 mx-1 shrink-0" />
              )}
            </div>
          );
        })}
        {/* Completed / Rejected */}
        <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border/30 shrink-0">
          <div className="flex flex-col items-center gap-1 px-2 py-1.5">
            <div className="flex items-center gap-1 text-emerald-400/60">
              <Check className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold">Done</span>
            </div>
            <span className="text-lg font-bold tabular-nums leading-none text-emerald-400/60">{stats?.byStage['completed'] ?? 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-2 py-1.5">
            <div className="flex items-center gap-1 text-red-400/60">
              <XCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold">Rejected</span>
            </div>
            <span className="text-lg font-bold tabular-nums leading-none text-red-400/60">{stats?.byStage['rejected'] ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

function CreateTicketModal({ onClose, onCreated, token }: {
  onClose: () => void;
  onCreated: (t: TicketSummary) => void;
  token: string | null;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const set = (k: keyof CreateForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      (Object.keys(form) as (keyof CreateForm)[]).forEach(k => {
        if (form[k]) body[k] = form[k];
      });
      const res = await fetch(API_ENDPOINTS.TICKETS, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Failed to create ticket');
      onCreated(d.ticket);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-background/80 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative z-10 w-full max-w-xl bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
              <Ticket className="h-4 w-4 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Create Ticket</h2>
              <p className="text-xs text-muted-foreground">Step {step} of 2 — {step === 1 ? 'Details' : 'Location'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex">
          {[1, 2].map(s => <div key={s} className={`h-1 flex-1 transition-colors ${s <= step ? 'bg-brand-500' : 'bg-border/30'}`} />)}
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
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Detailed description…"
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => set('priority', e.target.value as TicketPriority)}
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value as TicketCategory)}
                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Deadline</label>
                <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                  className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'village',     label: 'Village',  placeholder: 'Village name' },
                  { key: 'minar',       label: 'Minar',    placeholder: 'Minar ID' },
                  { key: 'projectName', label: 'Project',  placeholder: 'Project name' },
                  { key: 'oms',         label: 'OMS',      placeholder: 'OMS reference' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
                    <input value={form[key as keyof CreateForm]} onChange={e => set(key as keyof CreateForm, e.target.value)}
                      placeholder={placeholder}
                      className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-border/40">
          {step === 2 && (
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5">
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === 1 ? (
            <Button size="sm" onClick={() => { if (!form.title.trim()) { setError('Title is required'); return; } setError(''); setStep(2); }}
              className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={loading}
              className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Ticket
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick }: { ticket: TicketSummary; onClick: () => void }) {
  const stage = STAGE_CONFIG[ticket.stage];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const PriorityIcon = priority.icon;
  const isOverdue = ticket.deadline && ticket.stage !== 'completed' && ticket.stage !== 'rejected'
    && new Date(ticket.deadline) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group rounded-xl border border-border/40 bg-secondary/5 hover:bg-secondary/15 hover:border-border/70 cursor-pointer transition-all p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-muted-foreground/60">#{ticket.ticketNumber}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${stage.bg} ${stage.color} ${stage.border}`}>
              {stage.label}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/30">
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm font-semibold line-clamp-2 group-hover:text-brand-300 transition-colors">{ticket.title}</p>
        </div>
        <div className={`flex items-center gap-1 shrink-0 ${priority.color}`}>
          <PriorityIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium">{priority.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        {ticket.village && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {ticket.village}
          </span>
        )}
        {ticket.deadline && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
            <Calendar className="h-3 w-3" /> {new Date(ticket.deadline).toLocaleDateString()}
          </span>
        )}
        {(ticket._commentCount ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {ticket._commentCount}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-[9px] font-bold shrink-0">
            {ticket.createdBy.name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate max-w-[120px]">{ticket.createdBy.name}</span>
        </div>
        {ticket.assignedTo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[10px] text-muted-foreground/50">→</span>
            <RoleBadge role={ticket.assignedTo.role} size="sm" />
          </div>
        )}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          {new Date(ticket.updatedAt).toLocaleDateString()}
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Ticket Row (table view) ──────────────────────────────────────────────────

function TicketRow({ ticket, onClick }: { ticket: TicketSummary; onClick: () => void }) {
  const stage = STAGE_CONFIG[ticket.stage];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const PriorityIcon = priority.icon;
  const isOverdue = ticket.deadline && ticket.stage !== 'completed' && ticket.stage !== 'rejected'
    && new Date(ticket.deadline) < new Date();

  return (
    <tr onClick={onClick} className="border-b border-border/20 hover:bg-secondary/20 cursor-pointer transition-colors group">
      <td className="px-4 py-3">
        <span className="text-[11px] font-mono text-muted-foreground/60">#{ticket.ticketNumber}</span>
      </td>
      <td className="px-3 py-3 max-w-[260px]">
        <p className="text-sm font-medium line-clamp-1 group-hover:text-brand-300 transition-colors">{ticket.title}</p>
        {ticket.village && <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{ticket.village}</p>}
      </td>
      <td className="px-3 py-3">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${stage.bg} ${stage.color} ${stage.border}`}>
          {stage.label}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className={`flex items-center gap-1 ${priority.color}`}>
          <PriorityIcon className="h-3.5 w-3.5" />
          <span className="text-xs">{priority.label}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.createdBy.name}</td>
      <td className="px-3 py-3">
        <span className={`text-xs ${isOverdue ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
          {ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'all' | 'mine' | WorkflowStage;

export default function TicketsPage() {
  const router = useRouter();
  const { role, hasPermission, isAdminRole, isSuperAdmin, canWrite } = useRole();
  const token = useSelector((s: RootState) => s.auth.token);

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchData = useCallback(async (mine = false) => {
    setLoading(true);
    try {
      const mineParam = mine ? '&mine=true' : '';
      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.TICKETS}?limit=200${mineParam}`, { headers: authHeaders }),
        fetch(API_ENDPOINTS.TICKET_STATS, { headers: authHeaders }),
      ]);
      if (ticketsRes.ok) { const d = await ticketsRes.json(); setTickets(d.tickets ?? []); }
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats ?? null); }
    } catch {
      showToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => { fetchData(activeTab === 'mine'); }, [fetchData, activeTab]);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (activeTab !== 'all' && activeTab !== 'mine' && t.stage !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q) ||
          (t.village ?? '').toLowerCase().includes(q) ||
          t.createdBy.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, activeTab, search]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all',  label: 'All',      count: tickets.length },
    { id: 'mine', label: 'My Tasks', count: activeTab === 'mine' ? tickets.length : 0 },
    ...(['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review'] as WorkflowStage[]).map(s => ({
      id: s as TabId,
      label: STAGE_CONFIG[s].label,
      count: stats?.byStage[s] ?? 0,
    })),
    { id: 'completed' as TabId, label: 'Completed', count: stats?.byStage['completed'] ?? 0 },
    { id: 'rejected' as TabId, label: 'Rejected',   count: stats?.byStage['rejected'] ?? 0 },
  ];

  if (!hasPermission('tickets')) {
    return (
      <MainLayout>
        <div className="container max-w-4xl px-4 py-16 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 opacity-20 mx-auto mb-3" />
          <p className="font-semibold">You don&apos;t have access to tickets.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/15 border border-yellow-500/20">
                <ClipboardList className="h-4 w-4 text-yellow-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">Tickets</h1>
            </div>
            <p className="text-sm text-muted-foreground">Workflow-based issue tracking and resolution</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => fetchData(activeTab === 'mine')} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {(isAdminRole || canWrite) && (
              <Button size="sm" onClick={() => setIsCreateOpen(true)}
                className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Ticket</span>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Pipeline banner */}
        <StagePipeline stats={stats} />

        {/* Priority stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            {(['normal', 'high', 'urgent'] as TicketPriority[]).map(p => {
              const cfg = PRIORITY_CONFIG[p];
              const Icon = cfg.icon;
              return (
                <div key={p} className="rounded-xl border border-border/40 p-3 flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cfg.label}</p>
                    <p className="text-lg font-bold tabular-nums leading-tight">{stats.byPriority[p] ?? 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, number, village, creator…"
              className="w-full h-9 rounded-lg border border-border/50 bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="flex rounded-lg border border-border/50 overflow-hidden shrink-0">
            <button onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-xs transition-colors ${viewMode === 'cards' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Cards
            </button>
            <button onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-xs transition-colors ${viewMode === 'table' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Table
            </button>
          </div>
        </div>

        {/* Stage tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-border/40 pb-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
              {tab.count > 0 && (
                <span className={`min-w-[18px] text-center rounded-full px-1 text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-brand-500/20 text-brand-300' : 'bg-secondary/60 text-muted-foreground'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="text-xs text-muted-foreground">
          Showing {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
          {role && <span> — visible to your role ({ROLE_LABELS[role] ?? role})</span>}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading tickets…
            </div>
          ) : filtered.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-30" />
              <p>No tickets in this stage</p>
              {(isAdminRole || canWrite) && activeTab === 'all' && (
                <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)} className="mt-2 gap-1.5">
                  <Plus className="h-4 w-4" /> Create first ticket
                </Button>
              )}
            </motion.div>
          ) : viewMode === 'cards' ? (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(t => (
                <TicketCard key={t._id} ticket={t} onClick={() => router.push(`/tickets/${t._id}`)} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-xl border border-border/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/20">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Title</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Stage</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Created By</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Deadline</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <TicketRow key={t._id} ticket={t} onClick={() => router.push(`/tickets/${t._id}`)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <CreateTicketModal
            token={token}
            onClose={() => setIsCreateOpen(false)}
            onCreated={ticket => {
              setTickets(prev => [ticket, ...prev]);
              setIsCreateOpen(false);
              showToast(`Ticket #${ticket.ticketNumber} created`);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
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
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

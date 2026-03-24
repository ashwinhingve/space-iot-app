'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { RoleBadge } from '@/components/RoleBadge';
import { useRole } from '@/hooks/useRole';
import { RootState } from '@/store/store';
import { API_ENDPOINTS } from '@/lib/config';
import { STAGE_CONFIG, WorkflowStage, TicketPriority, TicketCategory, TicketSummary } from '../shared';
import {
  ArrowLeft, CheckCircle, AlertTriangle, Loader2,
  MessageSquare, FileText, ChevronRight, Clock,
  User, Calendar, MapPin, Phone, Building2, Tag,
  Send, XCircle, RotateCcw, Check, Flag,
  Download, Paperclip, Info, Zap, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkflowHistoryEntry {
  _id?: string;
  stage: WorkflowStage;
  action: string;
  byName: string;
  byRole: string;
  comment?: string;
  documentName?: string;
  timestamp: string;
}

interface Comment {
  _id: string;
  byName: string;
  byRole: string;
  text: string;
  documentName?: string;
  documentUrl?: string;
  stage: WorkflowStage;
  timestamp: string;
}

interface TicketDocument {
  _id: string;
  name: string;
  url: string;
  uploaderName: string;
  uploaderRole: string;
  stage: WorkflowStage;
  isFinalReport: boolean;
  uploadedAt: string;
}

interface TicketDetail extends TicketSummary {
  minar?: string;
  oms?: string;
  kasra?: string;
  contactName?: string;
  contactMobile?: string;
  rejectedFrom?: WorkflowStage;
  rejectionReason?: string;
  workflowHistory: WorkflowHistoryEntry[];
  comments: Comment[];
  documents: TicketDocument[];
}

// ─── Stage who can advance ────────────────────────────────────────────────────

const STAGE_ADVANCE_ROLES: Partial<Record<WorkflowStage, string[]>> = {
  draft:        ['admin', 'supervisor'],
  manager:      ['admin', 'supervisor'],
  executive:    ['admin', 'executive_mechanic', 'executive_electrical', 'executive_civil', 'ews', 'ows'],
  supervisor:   ['admin', 'supervisor'],
  billing:      ['admin'],
  final_review: ['admin'],
};

const STAGE_REJECT_ROLES: Partial<Record<WorkflowStage, string[]>> = {
  manager:      ['admin', 'supervisor'],
  executive:    ['admin', 'executive_mechanic', 'executive_electrical', 'executive_civil', 'ews', 'ows'],
  supervisor:   ['admin', 'supervisor'],
  billing:      ['admin'],
  final_review: ['admin'],
};

const NEXT_STAGE_LABEL: Partial<Record<WorkflowStage, string>> = {
  draft:        'Send to Manager',
  manager:      'Send to Executive',
  executive:    'Send to Supervisor',
  supervisor:   'Send to Billing',
  billing:      'Submit for Final Review',
  final_review: 'Mark Completed',
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; icon: React.ElementType }> = {
  normal: { label: 'Normal', color: 'text-blue-400',   icon: Clock },
  high:   { label: 'High',   color: 'text-orange-400', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'text-red-400',    icon: Zap },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  maintenance: 'Maintenance', fault: 'Fault', installation: 'Installation',
  inspection: 'Inspection', billing: 'Billing', document: 'Document', other: 'Other',
};

// ─── Workflow Stepper ─────────────────────────────────────────────────────────

function WorkflowStepper({ stage }: { stage: WorkflowStage }) {
  const steps: WorkflowStage[] = ['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed'];
  const currentIdx = stage === 'rejected' ? -1 : steps.indexOf(stage);

  if (stage === 'rejected') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
        <XCircle className="h-5 w-5 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">Ticket Rejected</p>
          <p className="text-xs text-red-400/70">This ticket was rejected during the review process.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/5 p-4">
      <div className="flex items-center gap-0 overflow-x-auto">
        {steps.map((s, i) => {
          const cfg = STAGE_CONFIG[s];
          const Icon = cfg.icon;
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s} className="flex items-center shrink-0">
              <div className={`flex flex-col items-center gap-1 ${isCurrent ? 'opacity-100' : isDone ? 'opacity-70' : 'opacity-30'}`}>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                  isDone   ? 'border-emerald-500 bg-emerald-500/20' :
                  isCurrent? `${cfg.border} ${cfg.bg}` :
                             'border-border/30 bg-transparent'
                }`}>
                  {isDone ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Icon className={`h-3.5 w-3.5 ${isCurrent ? cfg.color : 'text-muted-foreground/40'}`} />}
                </div>
                <span className={`text-[9px] font-semibold whitespace-nowrap ${isCurrent ? cfg.color : 'text-muted-foreground/50'}`}>
                  {cfg.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-6 sm:w-10 mx-1 shrink-0 transition-colors ${i < currentIdx ? 'bg-emerald-500/50' : 'bg-border/30'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  type: 'stage' | 'comment' | 'document';
  userName: string;
  userRole: string;
  at: string;
  content: string;
  stage?: WorkflowStage;
  action?: string;
  docUrl?: string;
}

function buildTimeline(ticket: TicketDetail): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const h of ticket.workflowHistory) {
    entries.push({
      id: `hist-${h.timestamp}-${h.action}`,
      type: 'stage',
      userName: h.byName,
      userRole: h.byRole,
      at: h.timestamp,
      content: h.comment ?? '',
      stage: h.stage,
      action: h.action,
    });
  }

  for (const c of ticket.comments) {
    entries.push({
      id: c._id,
      type: 'comment',
      userName: c.byName,
      userRole: c.byRole,
      at: c.timestamp,
      content: c.text,
    });
  }

  for (const d of ticket.documents) {
    entries.push({
      id: d._id,
      type: 'document',
      userName: d.uploaderName,
      userRole: d.uploaderRole,
      at: d.uploadedAt,
      content: d.name,
      docUrl: d.url,
    });
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function TimelineView({ ticket }: { ticket: TicketDetail }) {
  const entries = useMemo(() => buildTimeline(ticket), [ticket]);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>;
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border/30" />
      {entries.map(e => {
        const isStage = e.type === 'stage';
        const isDoc = e.type === 'document';
        const stageCfg = e.stage ? STAGE_CONFIG[e.stage] : null;
        const isCompleted = e.action === 'approved' || e.stage === 'completed';
        const isRejected = e.action === 'rejected' || e.stage === 'rejected';
        return (
          <div key={e.id} className="flex items-start gap-3 py-2 relative">
            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
              isStage
                ? isCompleted ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                  : isRejected ? 'border-red-500/50 bg-red-500/15 text-red-400'
                  : 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                : isDoc
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-border/40 bg-secondary/30 text-muted-foreground'
            }`}>
              {isStage ? (stageCfg ? <stageCfg.icon className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                : isDoc ? <Paperclip className="h-4 w-4" />
                : <MessageSquare className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold">{e.userName}</span>
                <RoleBadge role={e.userRole} size="sm" />
                {isStage && e.stage && e.action && (
                  <span className="text-[11px] text-muted-foreground">
                    {e.action === 'created' ? 'created ticket' :
                     e.action === 'advanced' ? <>advanced to <span className={`font-medium ${stageCfg?.color}`}>{stageCfg?.label}</span></> :
                     e.action === 'rejected' ? 'rejected ticket' :
                     e.action === 'approved' ? 'approved ticket' :
                     e.action === 'reopened' ? 're-opened ticket' :
                     e.action === 'assigned' ? 'assigned ticket' :
                     e.action}
                  </span>
                )}
                {isDoc && <span className="text-[11px] text-muted-foreground">uploaded a document</span>}
              </div>
              {e.content && (
                <p className={`text-xs mt-0.5 ${isStage ? 'text-muted-foreground italic' : 'text-foreground/80'}`}>{e.content}</p>
              )}
              {isDoc && e.docUrl && (
                <a href={e.docUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-0.5 transition-colors">
                  <Download className="h-3 w-3" /> {e.content}
                </a>
              )}
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{new Date(e.at).toLocaleString()}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Action Panel ─────────────────────────────────────────────────────────────

function ActionPanel({ ticket, token, onUpdated, showToast }: {
  ticket: TicketDetail;
  token: string | null;
  onUpdated: (t: TicketDetail) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const { role, isAdmin } = useRole();
  const [commentText, setCommentText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);

  const canAdvance = useMemo(() => {
    const allowed = STAGE_ADVANCE_ROLES[ticket.stage] ?? [];
    return allowed.includes(role) || isAdmin;
  }, [ticket.stage, role, isAdmin]);

  const canReject = useMemo(() => {
    const allowed = STAGE_REJECT_ROLES[ticket.stage] ?? [];
    return allowed.includes(role) || isAdmin;
  }, [ticket.stage, role, isAdmin]);

  const isTerminal = ticket.stage === 'completed' || ticket.stage === 'rejected';

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const doAction = async (endpoint: string, body: Record<string, string>, action: string) => {
    setLoading(action);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed');
      onUpdated(d.ticket ?? d);
      showToast(
        action === 'advance' ? 'Ticket advanced' :
        action === 'reject'  ? 'Ticket rejected' :
        action === 'reopen'  ? 'Ticket reopened' :
        action === 'comment' ? 'Comment added' : 'Done'
      );
      if (action === 'comment') setCommentText('');
      if (action === 'reject')  { setRejectReason(''); setShowReject(false); }
      if (action === 'advance') { setAdvanceNote(''); setShowAdvance(false); }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Advance */}
      {!isTerminal && canAdvance && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-300">Advance Ticket</p>
          </div>
          <AnimatePresence>
            {showAdvance && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <textarea
                  value={advanceNote}
                  onChange={e => setAdvanceNote(e.target.value)}
                  rows={2}
                  placeholder="Optional note for next stage…"
                  className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdvance(v => !v)} className="gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" /> {showAdvance ? 'Hide note' : 'Add note'}
            </Button>
            <Button size="sm"
              onClick={() => doAction(API_ENDPOINTS.TICKET_ADVANCE(ticket._id), { note: advanceNote }, 'advance')}
              disabled={loading === 'advance'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {loading === 'advance' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {NEXT_STAGE_LABEL[ticket.stage] ?? 'Advance'}
            </Button>
          </div>
        </div>
      )}

      {/* Reject */}
      {!isTerminal && canReject && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <p className="text-sm font-semibold text-red-300">Reject Ticket</p>
          </div>
          <AnimatePresence>
            {showReject && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for rejection (required)…"
                  className="w-full rounded-lg border border-red-500/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
          {!showReject ? (
            <Button size="sm" variant="outline" onClick={() => setShowReject(true)}
              className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
              <XCircle className="h-3.5 w-3.5" /> Reject this ticket
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowReject(false)} className="text-xs">Cancel</Button>
              <Button size="sm"
                onClick={() => doAction(API_ENDPOINTS.TICKET_REJECT(ticket._id), { reason: rejectReason }, 'reject')}
                disabled={loading === 'reject' || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
                {loading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Confirm Reject
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Reopen */}
      {ticket.stage === 'rejected' && isAdmin && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Button size="sm"
            onClick={() => doAction(API_ENDPOINTS.TICKET_REOPEN(ticket._id), {}, 'reopen')}
            disabled={loading === 'reopen'}
            className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent border text-sm w-full">
            {loading === 'reopen' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reopen Ticket
          </Button>
        </div>
      )}

      {/* Add Comment */}
      <div className="rounded-xl border border-border/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Add Comment</p>
        </div>
        <textarea
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          rows={3}
          placeholder="Write a comment visible to all parties…"
          className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
        />
        <Button size="sm"
          onClick={() => doAction(API_ENDPOINTS.TICKET_COMMENT(ticket._id), { text: commentText }, 'comment')}
          disabled={loading === 'comment' || !commentText.trim()}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5">
          {loading === 'comment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post Comment
        </Button>
      </div>
    </div>
  );
}

// ─── Detail field ─────────────────────────────────────────────────────────────

function DetailField({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />}
      <div>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useRole();
  const token = useSelector((s: RootState) => s.auth.token);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'timeline' | 'docs'>('timeline');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchTicket = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.TICKET_DETAIL(params.id), { headers: authHeaders });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Ticket not found');
      setTicket(d.ticket);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [params.id, authHeaders]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading ticket…
        </div>
      </MainLayout>
    );
  }

  if (error || !ticket) {
    return (
      <MainLayout>
        <div className="container max-w-4xl px-4 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3 opacity-60" />
          <p className="font-semibold text-red-300">{error || 'Ticket not found'}</p>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </MainLayout>
    );
  }

  const stage = STAGE_CONFIG[ticket.stage];
  const priority = PRIORITY_CONFIG[ticket.priority];
  const PriorityIcon = priority.icon;
  const isOverdue = ticket.deadline && ticket.stage !== 'completed' && ticket.stage !== 'rejected'
    && new Date(ticket.deadline) < new Date();

  return (
    <MainLayout>
      <div className="container max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-5">

        {/* Back + header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <button onClick={() => router.push('/tickets')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Tickets
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground/60">#{ticket.ticketNumber}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${stage.bg} ${stage.color} ${stage.border}`}>
                  {stage.label}
                </span>
                <div className={`flex items-center gap-1 ${priority.color}`}>
                  <PriorityIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{priority.label}</span>
                </div>
                {isOverdue && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30">
                    Overdue
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">{ticket.title}</h1>
              {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
            </div>
          </div>
        </motion.div>

        {/* Workflow stepper */}
        <WorkflowStepper stage={ticket.stage} />

        {ticket.stage === 'rejected' && ticket.rejectionReason && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-start gap-2 text-sm text-red-400">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Rejection reason:</p>
              <p className="text-red-400/80">{ticket.rejectionReason}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: details */}
          <div className="lg:col-span-1 space-y-4">

            {/* Meta card */}
            <div className="rounded-xl border border-border/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket Details</p>
              <div className="space-y-3 text-sm">
                <DetailField label="Category" value={CATEGORY_LABELS[ticket.category]} icon={Tag} />
                <DetailField label="Created by" value={ticket.createdBy.name} icon={User} />
                {ticket.assignedTo && <DetailField label="Assigned to" value={ticket.assignedTo.name} icon={User} />}
                <DetailField label="Created" value={new Date(ticket.createdAt).toLocaleString()} icon={Clock} />
                <DetailField label="Last updated" value={new Date(ticket.updatedAt).toLocaleString()} icon={Clock} />
                {ticket.deadline && (
                  <DetailField label="Deadline" value={new Date(ticket.deadline).toLocaleDateString()} icon={Calendar} />
                )}
                {ticket.completedAt && (
                  <DetailField label="Completed" value={new Date(ticket.completedAt).toLocaleString()} icon={CheckCircle} />
                )}
              </div>
            </div>

            {/* Location card */}
            {(ticket.village || ticket.minar || ticket.projectName || ticket.oms || ticket.kasra) && (
              <div className="rounded-xl border border-border/40 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
                <div className="space-y-2">
                  <DetailField label="Village" value={ticket.village} icon={MapPin} />
                  <DetailField label="Minar" value={ticket.minar} icon={Flag} />
                  <DetailField label="Project" value={ticket.projectName} icon={Building2} />
                  <DetailField label="OMS" value={ticket.oms} icon={Building2} />
                  <DetailField label="Kasra" value={ticket.kasra} />
                </div>
              </div>
            )}

            {/* Contact card */}
            {(ticket.contactName || ticket.contactMobile) && (
              <div className="rounded-xl border border-border/40 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
                <div className="space-y-2">
                  <DetailField label="Name" value={ticket.contactName} icon={User} />
                  <DetailField label="Mobile" value={ticket.contactMobile} icon={Phone} />
                </div>
              </div>
            )}

            {/* Action panel */}
            <ActionPanel ticket={ticket} token={token} onUpdated={setTicket} showToast={showToast} />
          </div>

          {/* Right: timeline + documents */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border/40 overflow-hidden">
              {/* Section toggle */}
              <div className="flex border-b border-border/30">
                {[
                  { id: 'timeline' as const, label: `Activity (${buildTimeline(ticket).length})`, icon: Clock },
                  { id: 'docs' as const, label: `Documents (${ticket.documents.length})`, icon: FileText },
                ].map(s => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                      activeSection === s.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeSection === 'timeline' && <TimelineView ticket={ticket} />}

                {activeSection === 'docs' && (
                  <div>
                    {ticket.documents.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                        <Paperclip className="h-7 w-7 opacity-30" />
                        <p className="text-sm">No documents uploaded yet</p>
                        <p className="text-xs text-muted-foreground/60">Documents are uploaded by billing and admin</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ticket.documents.map(doc => (
                          <div key={doc._id} className="flex items-center gap-3 rounded-lg border border-border/30 p-3 hover:bg-secondary/20 transition-colors">
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {doc.uploaderName} · {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <a href={doc.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0">
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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

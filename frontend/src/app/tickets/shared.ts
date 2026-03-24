import type { ElementType } from 'react';
import {
  FileText, Flag, Building2, CheckCircle, Check, XCircle, Clock, AlertCircle, Zap, User,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowStage =
  | 'draft' | 'manager' | 'executive' | 'supervisor'
  | 'billing' | 'final_review' | 'completed' | 'rejected';

export type TicketPriority = 'normal' | 'high' | 'urgent';
export type TicketCategory = 'maintenance' | 'fault' | 'installation' | 'inspection' | 'billing' | 'document' | 'other';

export interface TicketUser { _id: string; name: string; email: string; role: string; }

export interface TicketSummary {
  _id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  stage: WorkflowStage;
  category: TicketCategory;
  village?: string;
  projectName?: string;
  deadline?: string;
  createdBy: TicketUser;
  assignedTo?: TicketUser;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  rejectionReason?: string;
  _commentCount?: number;
  _docCount?: number;
}

// ─── Stage config ─────────────────────────────────────────────────────────────

export const STAGE_CONFIG: Record<WorkflowStage, {
  label: string; color: string; bg: string; border: string; icon: ElementType; step: number
}> = {
  draft:        { label: 'Draft',        color: 'text-slate-400',   bg: 'bg-slate-500/10',    border: 'border-slate-500/30',   icon: FileText,    step: 0 },
  manager:      { label: 'Manager',      color: 'text-blue-400',    bg: 'bg-blue-500/10',     border: 'border-blue-500/30',    icon: User,        step: 1 },
  executive:    { label: 'Executive',    color: 'text-cyan-400',    bg: 'bg-cyan-500/10',     border: 'border-cyan-500/30',    icon: Flag,        step: 2 },
  supervisor:   { label: 'Supervisor',   color: 'text-violet-400',  bg: 'bg-violet-500/10',   border: 'border-violet-500/30',  icon: Building2,   step: 3 },
  billing:      { label: 'Billing',      color: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/30',   icon: FileText,    step: 4 },
  final_review: { label: 'Final Review', color: 'text-orange-400',  bg: 'bg-orange-500/10',   border: 'border-orange-500/30',  icon: CheckCircle, step: 5 },
  completed:    { label: 'Completed',    color: 'text-emerald-400', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/30', icon: Check,       step: 6 },
  rejected:     { label: 'Rejected',     color: 'text-red-400',     bg: 'bg-red-500/10',      border: 'border-red-500/30',     icon: XCircle,     step: -1 },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; dot: string; icon: ElementType }> = {
  normal: { label: 'Normal', color: 'text-blue-400',   dot: 'bg-blue-500',   icon: Clock },
  high:   { label: 'High',   color: 'text-orange-400', dot: 'bg-orange-500', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'text-red-400',    dot: 'bg-red-500',    icon: Zap },
};

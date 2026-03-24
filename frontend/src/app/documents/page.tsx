'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import {
  FileText, Upload, Search, Filter, Download, Eye,
  Plus, X, CheckCircle, FileCheck, FileImage,
  AlertTriangle, Loader2, Calendar, Tag, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocType = 'report' | 'photo' | 'certificate' | 'form' | 'permit' | 'other';
type DocStatus = 'pending' | 'approved' | 'rejected';

interface Doc {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
  village?: string;
  project?: string;
}

const TYPE_CONFIG: Record<DocType, { label: string; color: string; icon: React.ElementType }> = {
  report:      { label: 'Report',      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    icon: FileText },
  photo:       { label: 'Photo',       color: 'bg-pink-500/15 text-pink-400 border-pink-500/30',    icon: FileImage },
  certificate: { label: 'Certificate', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: FileCheck },
  form:        { label: 'Form',        color: 'bg-violet-500/15 text-violet-400 border-violet-500/30', icon: FileText },
  permit:      { label: 'Permit',      color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: FileCheck },
  other:       { label: 'Other',       color: 'bg-secondary/50 text-muted-foreground border-border/30', icon: FileText },
};

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

// Sample placeholder data (replace with API call in production)
const SAMPLE_DOCS: Doc[] = [
  { id: '1', name: 'OMS Monthly Report - March 2026.pdf',    type: 'report',      status: 'approved', size: '2.4 MB', uploadedBy: 'Ahmed Khan',    uploadedAt: '2026-03-10', village: 'Lahore',   project: 'OMS Phase 1' },
  { id: '2', name: 'Site Inspection Photo - Node M-012.jpg', type: 'photo',       status: 'pending',  size: '1.8 MB', uploadedBy: 'Sara Ahmed',    uploadedAt: '2026-03-12', village: 'Karachi',  project: 'OMS Phase 2' },
  { id: '3', name: 'Installation Certificate - Valve V-05',   type: 'certificate', status: 'approved', size: '450 KB', uploadedBy: 'Ali Raza',      uploadedAt: '2026-03-08', village: 'Islamabad',project: 'OMS Phase 1' },
  { id: '4', name: 'Maintenance Permit Form.pdf',             type: 'permit',      status: 'pending',  size: '320 KB', uploadedBy: 'Fatima Sheikh', uploadedAt: '2026-03-14', village: 'Lahore',   project: 'OMS Phase 3' },
  { id: '5', name: 'Electrical Inspection Report Q1.pdf',     type: 'report',      status: 'rejected', size: '1.1 MB', uploadedBy: 'Usman Malik',   uploadedAt: '2026-03-05', village: 'Faisalabad',project: 'OMS Phase 2' },
];

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'report' as DocType, description: '', village: '', project: '' });
  const [file, setFile] = useState<File | null>(null);
  const [loading] = useState(false);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const inputCls = 'w-full h-9 rounded-lg border border-border/50 bg-secondary/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-background/80 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative z-10 w-full max-w-lg bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15">
              <Upload className="h-4 w-4 text-brand-400" />
            </div>
            <h2 className="text-base font-semibold">Upload Document</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File drop zone */}
          <div
            className="rounded-xl border-2 border-dashed border-border/50 bg-secondary/10 p-8 text-center cursor-pointer hover:border-brand-500/30 hover:bg-brand-500/5 transition-all"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-brand-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to browse or drag & drop</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, JPG, PNG, DOCX up to 10MB</p>
              </>
            )}
          </div>

          <div>
            <label className={labelCls}>Document Name</label>
            <input type="text" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. OMS Monthly Report" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e => f('type', e.target.value)} className={`${inputCls} dark:[color-scheme:dark]`}>
                {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Village</label>
              <input type="text" value={form.village} onChange={e => f('village', e.target.value)} placeholder="e.g. Lahore" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Project Name</label>
            <input type="text" value={form.project} onChange={e => f('project', e.target.value)} placeholder="e.g. OMS Phase 1" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={e => f('description', e.target.value)}
              rows={2}
              placeholder="Brief description..."
              className="w-full rounded-lg border border-border/50 bg-secondary/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!file || loading} className="bg-brand-500 hover:bg-brand-600 text-white gap-2 px-6" onClick={onClose}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [docs] = useState<Doc[]>(SAMPLE_DOCS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocType | ''>('');
  const [statusFilter, setStatusFilter] = useState<DocStatus | ''>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filtered = docs.filter(d => {
    if (typeFilter && d.type !== typeFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.name.toLowerCase().includes(q) ||
        (d.village || '').toLowerCase().includes(q) ||
        (d.project || '').toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    total: docs.length,
    pending: docs.filter(d => d.status === 'pending').length,
    approved: docs.filter(d => d.status === 'approved').length,
    rejected: docs.filter(d => d.status === 'rejected').length,
  };

  return (
    <MainLayout>
      <RoleGuard permission="documents" showDenied>
        <div className="container max-w-7xl px-3 sm:px-4 py-6 sm:py-8 space-y-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
                  <FileText className="h-4 w-4 text-violet-400" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">Document Management</h1>
              </div>
              <p className="text-sm text-muted-foreground">Upload, review, and manage project documents</p>
            </div>
            <Button size="sm" onClick={() => setIsUploadOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',    value: counts.total,    color: 'border-border/40 bg-secondary/10',           icon: FileText,   ic: 'text-muted-foreground' },
              { label: 'Pending',  value: counts.pending,  color: 'border-yellow-500/20 bg-yellow-500/5',       icon: AlertTriangle, ic: 'text-yellow-400' },
              { label: 'Approved', value: counts.approved, color: 'border-emerald-500/20 bg-emerald-500/5',     icon: CheckCircle,ic: 'text-emerald-400' },
              { label: 'Rejected', value: counts.rejected, color: 'border-red-500/20 bg-red-500/5',             icon: X,          ic: 'text-red-400' },
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search documents, village, project…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 rounded-lg border border-border/50 bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as DocType | '')} className="h-9 rounded-lg border border-border/50 bg-background px-2 text-sm dark:[color-scheme:dark]">
                <option value="">All Types</option>
                {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DocStatus | '')} className="h-9 rounded-lg border border-border/50 bg-background px-2 text-sm dark:[color-scheme:dark]">
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
              <div className="flex items-center gap-1 px-3 rounded-lg border border-border/50 bg-background/50 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                {filtered.length}
              </div>
            </div>
          </div>

          {/* Document Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30" />
              <p>No documents found</p>
              <Button size="sm" onClick={() => setIsUploadOpen(true)} variant="outline">Upload First Document</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(doc => {
                const tc = TYPE_CONFIG[doc.type];
                const sc = STATUS_CONFIG[doc.status];
                const TypeIcon = tc.icon;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/40 bg-secondary/10 p-4 hover:border-border/70 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tc.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>

                    <p className="text-sm font-medium leading-snug mb-1 line-clamp-2">{doc.name}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tc.color}`}>
                        <Tag className="h-2.5 w-2.5" />{tc.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-secondary/30 rounded-full px-2 py-0.5">{doc.size}</span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{doc.uploadedBy}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      {doc.village && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3 shrink-0" />
                          <span className="truncate">{doc.village} {doc.project && `· ${doc.project}`}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <Eye className="h-3.5 w-3.5" />View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                        <Download className="h-3.5 w-3.5" />Download
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} />}
        </AnimatePresence>
      </RoleGuard>
    </MainLayout>
  );
}

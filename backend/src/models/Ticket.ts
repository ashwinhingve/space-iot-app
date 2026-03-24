import mongoose from 'mongoose';

export type TicketPriority = 'normal' | 'high' | 'urgent';

export type WorkflowStage =
  | 'draft'         // Admin created, not yet dispatched
  | 'manager'       // With Manager/Engineer for review
  | 'executive'     // With Executive Officers for fieldwork
  | 'supervisor'    // With Supervisor for review
  | 'billing'       // With Billing dept for final report
  | 'final_review'  // With Admin for final approval
  | 'completed'     // Admin approved — done
  | 'rejected';     // Rejected at any stage

export type TicketCategory =
  | 'maintenance' | 'fault' | 'installation'
  | 'inspection' | 'billing' | 'document' | 'other';

export interface IWorkflowEntry {
  stage: WorkflowStage;
  action: 'created' | 'advanced' | 'rejected' | 'commented' | 'document_added' | 'approved' | 'assigned' | 'reopened';
  by: mongoose.Types.ObjectId;
  byName: string;
  byRole: string;
  comment?: string;
  documentName?: string;
  timestamp: Date;
}

export interface ITicketComment {
  _id: mongoose.Types.ObjectId;
  by: mongoose.Types.ObjectId;
  byName: string;
  byRole: string;
  text: string;
  documentName?: string;
  documentUrl?: string;
  stage: WorkflowStage;
  timestamp: Date;
}

export interface ITicketDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploaderName: string;
  uploaderRole: string;
  stage: WorkflowStage;
  isFinalReport: boolean;
  uploadedAt: Date;
}

export interface ITicket extends mongoose.Document {
  ticketNumber: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  stage: WorkflowStage;
  category: TicketCategory;

  // Location & project
  village?: string;
  minar?: string;
  projectName?: string;
  oms?: string;
  kasra?: string;
  deadline?: Date;

  // Contact info
  contactName?: string;
  contactMobile?: string;

  // Workflow
  workflowHistory: mongoose.Types.DocumentArray<any>;
  comments: mongoose.Types.DocumentArray<any>;
  documents: mongoose.Types.DocumentArray<any>;

  // People
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;

  // Rejection
  rejectedFrom?: WorkflowStage;
  rejectionReason?: string;

  // Completion
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const workflowEntrySchema = new mongoose.Schema({
  stage:        { type: String, required: true },
  action:       { type: String, required: true },
  by:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  byName:       { type: String, required: true },
  byRole:       { type: String, required: true },
  comment:      { type: String },
  documentName: { type: String },
  timestamp:    { type: Date, default: Date.now },
}, { _id: false });

const commentSchema = new mongoose.Schema({
  by:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  byName:       { type: String, required: true },
  byRole:       { type: String, required: true },
  text:         { type: String, required: true, trim: true },
  documentName: { type: String },
  documentUrl:  { type: String },
  stage:        { type: String, required: true },
  timestamp:    { type: Date, default: Date.now },
});

const documentSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  url:           { type: String, required: true, trim: true },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderName:  { type: String, required: true },
  uploaderRole:  { type: String, required: true },
  stage:         { type: String, required: true },
  isFinalReport: { type: Boolean, default: false },
  uploadedAt:    { type: Date, default: Date.now },
});

let ticketCounter = 0;

const ticketSchema = new mongoose.Schema<ITicket>({
  ticketNumber:  { type: String, unique: true },
  title:         { type: String, required: true, trim: true },
  description:   { type: String, trim: true },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal',
  },
  stage: {
    type: String,
    enum: ['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
    default: 'draft',
  },
  category: {
    type: String,
    enum: ['maintenance', 'fault', 'installation', 'inspection', 'billing', 'document', 'other'],
    default: 'other',
  },
  village:      { type: String, trim: true },
  minar:        { type: String, trim: true },
  projectName:  { type: String, trim: true },
  oms:          { type: String, trim: true },
  kasra:        { type: String, trim: true },
  deadline:     { type: Date },
  contactName:  { type: String, trim: true },
  contactMobile:{ type: String, trim: true },
  workflowHistory: [workflowEntrySchema],
  comments:        [commentSchema],
  documents:       [documentSchema],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedFrom:    { type: String },
  rejectionReason: { type: String },
  completedAt:  { type: Date },
}, { timestamps: true });

ticketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1 + ticketCounter++).padStart(4, '0')}`;
  }
  next();
});

ticketSchema.index({ stage: 1, priority: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);

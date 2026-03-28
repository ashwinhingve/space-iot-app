import { Request, Response } from 'express';
import { Ticket, WorkflowStage } from '../models/Ticket';

// ── Workflow configuration ──────────────────────────────────────────────────

const NEXT_STAGE: Partial<Record<WorkflowStage, WorkflowStage>> = {
  draft:        'manager',
  manager:      'executive',
  executive:    'supervisor',
  supervisor:   'billing',
  billing:      'final_review',
  final_review: 'completed',
};

// Who can advance a ticket at each stage (admin always can)
const STAGE_ADVANCE_ROLES: Record<WorkflowStage, string[]> = {
  draft:        ['admin'],
  manager:      ['admin', 'manager', 'ews', 'ows'],
  executive:    ['admin', 'executive_mechanic', 'executive_electrical', 'executive_civil'],
  supervisor:   ['admin', 'supervisor'],
  billing:      ['admin', 'billing'],
  final_review: ['admin'],
  completed:    [],
  rejected:     ['admin'],
};

// Stages a role can SEE
const ROLE_VISIBLE_STAGES: Record<string, WorkflowStage[]> = {
  admin:                 ['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  manager:               ['manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  ews:                   ['manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  ows:                   ['manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  executive_mechanic:    ['executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  executive_electrical:  ['executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  executive_civil:       ['executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  supervisor:            ['supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  billing:               ['billing', 'final_review', 'completed', 'rejected'],
  quality_assurance:     ['supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  communication:         ['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'],
  dfm:                   ['final_review', 'completed', 'rejected'],
  survey:                ['draft', 'manager', 'completed', 'rejected'],
  ground_executive:      ['executive', 'supervisor', 'completed', 'rejected'],
  document_verification: ['billing', 'final_review', 'completed', 'rejected'],
};

const canActAtStage = (role: string, stage: WorkflowStage): boolean =>
  (STAGE_ADVANCE_ROLES[stage] ?? []).includes(role);

// ── Helper: build actor info ────────────────────────────────────────────────

const actor = (user: any) => ({ by: user._id, byName: user.name, byRole: user.role });

// ── GET /api/tickets ────────────────────────────────────────────────────────

export const getTickets = async (req: Request, res: Response) => {
  try {
    const { stage, priority, category, search, page = 1, limit = 100, mine } = req.query;
    const role: string = req.user.role;

    const filter: any = {};

    // Role-based visibility — always see own tickets plus visible stages
    if (role !== 'admin' && role !== 'super_admin') {
      const visibleStages = ROLE_VISIBLE_STAGES[role] ?? [];
      filter.$or = [
        { stage: { $in: visibleStages } },
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    if (stage) filter.stage = stage;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (mine === 'true') {
      delete filter.$or;
      filter.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    }
    if (search) {
      const q = { $regex: search, $options: 'i' };
      const textFilter = { $or: [{ title: q }, { ticketNumber: q }, { village: q }, { contactName: q }] };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, textFilter];
        delete filter.$or;
      } else {
        Object.assign(filter, textFilter);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('createdBy', 'name email role')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Ticket.countDocuments(filter),
    ]);

    res.json({ success: true, tickets, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('getTickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

// ── GET /api/tickets/stats ──────────────────────────────────────────────────

export const getTicketStats = async (req: Request, res: Response) => {
  try {
    const role: string = req.user.role;
    const filter: any = {};
    if (role !== 'admin' && role !== 'super_admin') {
      const visibleStages = ROLE_VISIBLE_STAGES[role] ?? [];
      filter.$or = [
        { stage: { $in: visibleStages } },
        { createdBy: req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    const stages: WorkflowStage[] = ['draft', 'manager', 'executive', 'supervisor', 'billing', 'final_review', 'completed', 'rejected'];
    const priorities = ['normal', 'high', 'urgent'];

    const [byStageRaw, byPriorityRaw, total] = await Promise.all([
      Ticket.aggregate([{ $match: filter }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: filter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Ticket.countDocuments(filter),
    ]);

    // Build nested objects with zero-fill
    const byStage: Record<string, number> = {};
    for (const s of stages) byStage[s] = 0;
    for (const s of byStageRaw) byStage[s._id] = s.count;

    const byPriority: Record<string, number> = {};
    for (const p of priorities) byPriority[p] = 0;
    for (const p of byPriorityRaw) byPriority[p._id] = p.count;

    res.json({ success: true, stats: { total, byStage, byPriority } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ── GET /api/tickets/:id ────────────────────────────────────────────────────

export const getTicket = async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email role phone')
      .populate('assignedTo', 'name email role phone');

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

// ── POST /api/tickets — admin only ─────────────────────────────────────────

export const createTicket = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admin can create tickets' });
    }

    const {
      title, description, priority, category,
      village, minar, projectName, oms, deadline,
      assignedTo, note,
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const ticket = new Ticket({
      title: title.trim(),
      description: description?.trim(),
      priority: priority || 'normal',
      category: category || 'other',
      village: village?.trim(),
      minar: minar?.trim(),
      projectName: projectName?.trim(),
      oms: oms?.trim(),
      deadline: deadline ? new Date(deadline) : undefined,
      createdBy: req.user._id,
      assignedTo: assignedTo || undefined,
      stage: 'draft',
      workflowHistory: [{
        stage: 'draft',
        action: 'created',
        ...actor(req.user),
        comment: note?.trim() || 'Ticket created',
        timestamp: new Date(),
      }],
    });

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    if (ticket.assignedTo) await ticket.populate('assignedTo', 'name email role');

    console.log(`Ticket ${ticket.ticketNumber} created by ${req.user.email}`);
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error('createTicket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

// ── PATCH /api/tickets/:id — update basic fields (admin only) ───────────────

export const updateTicket = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admin can edit ticket details' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const allowed = ['title', 'description', 'priority', 'category', 'village', 'minar',
      'projectName', 'oms', 'deadline', 'assignedTo'];

    for (const field of allowed) {
      if (req.body[field] !== undefined) (ticket as any)[field] = req.body[field];
    }

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

// ── POST /api/tickets/:id/advance ───────────────────────────────────────────

export const advanceTicket = async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Accept 'note' OR 'comment' as the body field
    const note = (req.body.note || req.body.comment || '').trim();
    const role: string = req.user.role;
    const stage = ticket.stage as WorkflowStage;

    if (stage === 'completed' || stage === 'rejected') {
      return res.status(400).json({ error: 'Ticket is already completed or rejected' });
    }

    if (!canActAtStage(role, stage)) {
      return res.status(403).json({ error: `Your role (${role}) cannot advance a ticket at ${stage} stage` });
    }

    const nextStage = NEXT_STAGE[stage];
    if (!nextStage) return res.status(400).json({ error: 'No next stage defined' });

    // Billing must have submitted a final report before advancing
    if (stage === 'billing') {
      const hasFinalReport = ticket.documents.some((d: any) => d.isFinalReport);
      if (!hasFinalReport) {
        return res.status(400).json({ error: 'A final report document must be uploaded before submitting for final review' });
      }
    }

    ticket.workflowHistory.push({
      stage,
      action: nextStage === 'completed' ? 'approved' : 'advanced',
      ...actor(req.user),
      comment: note || `Advanced from ${stage} to ${nextStage}`,
      timestamp: new Date(),
    });

    ticket.stage = nextStage;
    if (nextStage === 'completed') ticket.completedAt = new Date();

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('advanceTicket error:', error);
    res.status(500).json({ error: 'Failed to advance ticket' });
  }
};

// ── POST /api/tickets/:id/reject ────────────────────────────────────────────

export const rejectTicket = async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { reason } = req.body;
    const role: string = req.user.role;
    const stage = ticket.stage as WorkflowStage;

    if (stage === 'completed' || stage === 'rejected') {
      return res.status(400).json({ error: 'Ticket is already completed or rejected' });
    }

    if (!canActAtStage(role, stage)) {
      return res.status(403).json({ error: `Your role (${role}) cannot reject a ticket at ${stage} stage` });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    ticket.workflowHistory.push({
      stage,
      action: 'rejected',
      ...actor(req.user),
      comment: reason.trim(),
      timestamp: new Date(),
    });

    ticket.rejectedFrom = stage;
    ticket.rejectionReason = reason.trim();
    ticket.stage = 'rejected';

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject ticket' });
  }
};

// ── POST /api/tickets/:id/reopen — admin only ───────────────────────────────

export const reopenTicket = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admin can reopen tickets' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.stage !== 'rejected') {
      return res.status(400).json({ error: 'Only rejected tickets can be reopened' });
    }

    const { comment } = req.body;
    const returnTo: WorkflowStage = (req.body.returnTo as WorkflowStage) || ticket.rejectedFrom || 'draft';

    ticket.workflowHistory.push({
      stage: 'rejected',
      action: 'reopened',
      ...actor(req.user),
      comment: comment?.trim() || `Reopened and returned to ${returnTo}`,
      timestamp: new Date(),
    });

    ticket.stage = returnTo;
    ticket.rejectedFrom = undefined;
    ticket.rejectionReason = undefined;

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reopen ticket' });
  }
};

// ── POST /api/tickets/:id/comments ─────────────────────────────────────────

export const addComment = async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { text, documentName, documentUrl } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required' });

    const comment: any = {
      ...actor(req.user),
      text: text.trim(),
      documentName: documentName?.trim(),
      documentUrl: documentUrl?.trim(),
      stage: ticket.stage,
      timestamp: new Date(),
    };

    ticket.comments.push(comment);
    ticket.workflowHistory.push({
      stage: ticket.stage,
      action: 'commented',
      ...actor(req.user),
      comment: text.trim(),
      timestamp: new Date(),
    });

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// ── POST /api/tickets/:id/documents ────────────────────────────────────────

export const addDocument = async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { name, url, isFinalReport } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Document name is required' });
    if (!url?.trim()) return res.status(400).json({ error: 'Document URL is required' });

    const doc: any = {
      name: name.trim(),
      url: url.trim(),
      uploadedBy: req.user._id,
      uploaderName: req.user.name,
      uploaderRole: req.user.role,
      stage: ticket.stage,
      isFinalReport: isFinalReport === true || isFinalReport === 'true',
      uploadedAt: new Date(),
    };

    ticket.documents.push(doc);
    ticket.workflowHistory.push({
      stage: ticket.stage,
      action: 'document_added',
      ...actor(req.user),
      comment: `Document added: ${name.trim()}${doc.isFinalReport ? ' (Final Report)' : ''}`,
      documentName: name.trim(),
      timestamp: new Date(),
    });

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add document' });
  }
};

// ── DELETE /api/tickets/:id ─────────────────────────────────────────────────

export const deleteTicket = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admin can delete tickets' });
    }
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await Ticket.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};

// ── POST /api/tickets/:id/notes ─────────────────────────────────────────────

export const addNote = async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Note content is required' });

    ticket.notes.push({
      by: req.user._id,
      byName: req.user.name,
      byRole: req.user.role,
      content: content.trim(),
      timestamp: new Date(),
    } as any);

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
};

// ── PATCH /api/tickets/:id/assign — admin/super_admin only ──────────────────

export const assignTicket = async (req: Request, res: Response) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admin can assign tickets' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { assignedTo } = req.body;
    const prevAssignee = ticket.assignedTo?.toString();
    ticket.assignedTo = assignedTo || undefined;

    const note = assignedTo
      ? `Ticket assigned to a team member`
      : 'Ticket assignment removed';

    ticket.workflowHistory.push({
      stage: ticket.stage,
      action: 'assigned',
      ...actor(req.user),
      comment: (req.body.note?.trim()) || note,
      timestamp: new Date(),
    });

    await ticket.save();
    await ticket.populate('createdBy', 'name email role');
    await ticket.populate('assignedTo', 'name email role');

    console.log(`Ticket ${ticket.ticketNumber} assigned by ${req.user.email} (prev: ${prevAssignee ?? 'none'})`);
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
};

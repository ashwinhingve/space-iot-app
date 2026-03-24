import { Request, Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';

// ── GET /api/activity-logs ──────────────────────────────────────────────────

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { module, action, userId, page = 1, limit = 50, from, to } = req.query;

    const filter: any = {};
    if (module) filter.module = module;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (userId) filter.user = userId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from as string);
      if (to) filter.timestamp.$lte = new Date(to as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

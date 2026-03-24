import { ActivityLog } from '../models/ActivityLog';

export async function logActivity(
  user: { _id: any; name: string; email: string; role: string },
  action: string,
  module: string,
  target?: string,
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await ActivityLog.create({
      user:      user._id,
      userName:  user.name,
      userEmail: user.email,
      userRole:  user.role,
      action,
      module,
      target,
      targetId,
      details,
      timestamp: new Date(),
    });
  } catch (err) {
    // Non-blocking — never fail a request because of logging
    console.error('[ActivityLog] Failed to write log:', err);
  }
}

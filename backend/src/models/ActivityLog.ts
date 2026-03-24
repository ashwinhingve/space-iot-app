import mongoose from 'mongoose';

export interface IActivityLog extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;      // 'CREATE_USER', 'UPDATE_ROLE', 'ADVANCE_TICKET', etc.
  module: string;      // 'users', 'roles', 'teams', 'tickets', 'system'
  target?: string;     // human-readable entity name
  targetId?: string;   // entity _id string
  details?: Record<string, any>;
  timestamp: Date;
}

const activityLogSchema = new mongoose.Schema<IActivityLog>({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String, required: true },
  userEmail: { type: String, required: true },
  userRole:  { type: String, required: true },
  action:    { type: String, required: true },
  module:    { type: String, required: true },
  target:    { type: String },
  targetId:  { type: String },
  details:   { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
}, {
  // No timestamps — we manage timestamp manually for consistency
});

activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ user: 1 });
activityLogSchema.index({ module: 1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);

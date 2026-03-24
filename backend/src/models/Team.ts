import mongoose from 'mongoose';

export interface ITeam extends mongoose.Document {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new mongoose.Schema<ITeam>({
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  color:       { type: String, default: '#6366f1' },
  icon:        { type: String },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

teamSchema.index({ name: 1 });

export const Team = mongoose.model<ITeam>('Team', teamSchema);

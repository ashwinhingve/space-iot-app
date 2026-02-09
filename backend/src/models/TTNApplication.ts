import mongoose from 'mongoose';

export interface ITTNApplication extends mongoose.Document {
  applicationId: string;
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  ttnRegion: string;
  webhookId?: string;
  webhookSecret?: string;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ttnApplicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ttnRegion: {
    type: String,
    required: true,
    enum: ['eu1', 'nam1', 'au1'],
    default: 'eu1'
  },
  webhookId: {
    type: String,
    trim: true
  },
  webhookSecret: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSync: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
ttnApplicationSchema.index({ owner: 1 });
ttnApplicationSchema.index({ applicationId: 1 });

export const TTNApplication = mongoose.model<ITTNApplication>('TTNApplication', ttnApplicationSchema);

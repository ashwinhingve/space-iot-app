import mongoose from 'mongoose';

export interface ITTNDownlink extends mongoose.Document {
  deviceId: string;
  applicationId: string;
  owner: mongoose.Types.ObjectId;
  // Downlink content
  fPort: number;
  payload: string; // Base64 encoded
  decodedPayload?: Record<string, unknown>;
  // Downlink options
  confirmed: boolean;
  priority: 'LOWEST' | 'LOW' | 'BELOW_NORMAL' | 'NORMAL' | 'ABOVE_NORMAL' | 'HIGH' | 'HIGHEST';
  // Correlation ID for tracking
  correlationId: string;
  // Status tracking
  status: 'PENDING' | 'SCHEDULED' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED';
  // Timestamps
  scheduledAt?: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  // Created by
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ttnDownlinkSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  applicationId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fPort: {
    type: Number,
    required: true,
    min: 1,
    max: 223
  },
  payload: {
    type: String,
    required: true
  },
  decodedPayload: {
    type: mongoose.Schema.Types.Mixed
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['LOWEST', 'LOW', 'BELOW_NORMAL', 'NORMAL', 'ABOVE_NORMAL', 'HIGH', 'HIGHEST'],
    default: 'NORMAL'
  },
  correlationId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SCHEDULED', 'SENT', 'ACKNOWLEDGED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  scheduledAt: Date,
  sentAt: Date,
  acknowledgedAt: Date,
  failedAt: Date,
  failureReason: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes
ttnDownlinkSchema.index({ deviceId: 1, createdAt: -1 });
ttnDownlinkSchema.index({ correlationId: 1 });

// TTL index: auto-delete after 30 days
ttnDownlinkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const TTNDownlink = mongoose.model<ITTNDownlink>('TTNDownlink', ttnDownlinkSchema);

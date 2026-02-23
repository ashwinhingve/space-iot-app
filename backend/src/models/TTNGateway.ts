import mongoose from 'mongoose';

export interface ITTNGateway extends mongoose.Document {
  gatewayId: string;
  gatewayEui?: string;
  applicationId: string;
  owner: mongoose.Types.ObjectId;
  name: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  isOnline: boolean;
  lastSeen: Date;
  connectedSince?: Date;
  metrics: {
    totalUplinksSeen: number;
    avgRssi: number;
    avgSnr: number;
    lastRssi: number;
    lastSnr: number;
  };
  firstSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ttnGatewaySchema = new mongoose.Schema({
  gatewayId: {
    type: String,
    required: true,
    trim: true
  },
  gatewayEui: {
    type: String,
    uppercase: true
  },
  applicationId: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  connectedSince: {
    type: Date
  },
  metrics: {
    totalUplinksSeen: { type: Number, default: 0 },
    avgRssi: { type: Number, default: 0 },
    avgSnr: { type: Number, default: 0 },
    lastRssi: { type: Number, default: 0 },
    lastSnr: { type: Number, default: 0 }
  },
  firstSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Unique compound index: one gateway record per application
ttnGatewaySchema.index({ gatewayId: 1, applicationId: 1 }, { unique: true });
ttnGatewaySchema.index({ owner: 1 });
ttnGatewaySchema.index({ applicationId: 1 });

export const TTNGateway = mongoose.model<ITTNGateway>('TTNGateway', ttnGatewaySchema);

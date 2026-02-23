import mongoose from 'mongoose';

export interface ITTNDevice extends mongoose.Document {
  deviceId: string;
  applicationId: string;
  owner: mongoose.Types.ObjectId;
  name: string;
  displayName?: string;
  description?: string;
  devEui: string;
  joinEui?: string;
  devAddr?: string;
  // Device status
  isOnline: boolean;
  lastSeen?: Date;
  connectedSince?: Date;
  // Latest data
  lastUplink?: {
    timestamp: Date;
    fPort: number;
    fCnt: number;
    payload: string;
    decodedPayload?: Record<string, unknown>;
    rssi?: number;
    snr?: number;
    spreadingFactor?: number;
    bandwidth?: number;
    frequency?: number;
    gatewayId?: string;
  };
  // Aggregated metrics
  metrics: {
    totalUplinks: number;
    totalDownlinks: number;
    avgRssi?: number;
    avgSnr?: number;
  };
  // Device attributes from TTN
  attributes?: Record<string, string>;
  // Payload formatter
  payloadFormatter?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ttnDeviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true
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
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  devEui: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  joinEui: {
    type: String,
    uppercase: true,
    trim: true
  },
  devAddr: {
    type: String,
    uppercase: true,
    trim: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date
  },
  connectedSince: {
    type: Date
  },
  lastUplink: {
    timestamp: Date,
    fPort: Number,
    fCnt: Number,
    payload: String,
    decodedPayload: mongoose.Schema.Types.Mixed,
    rssi: Number,
    snr: Number,
    spreadingFactor: Number,
    bandwidth: Number,
    frequency: Number,
    gatewayId: String
  },
  metrics: {
    totalUplinks: { type: Number, default: 0 },
    totalDownlinks: { type: Number, default: 0 },
    avgRssi: Number,
    avgSnr: Number
  },
  attributes: {
    type: Map,
    of: String
  },
  payloadFormatter: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index for unique device per application
ttnDeviceSchema.index({ deviceId: 1, applicationId: 1 }, { unique: true });
ttnDeviceSchema.index({ owner: 1 });
ttnDeviceSchema.index({ devEui: 1 });

export const TTNDevice = mongoose.model<ITTNDevice>('TTNDevice', ttnDeviceSchema);

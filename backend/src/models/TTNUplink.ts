import mongoose from 'mongoose';

export interface ITTNUplink extends mongoose.Document {
  deviceId: string;
  applicationId: string;
  owner: mongoose.Types.ObjectId;
  // Message identifiers
  fPort: number;
  fCnt: number;
  // Payload data
  rawPayload: string; // Base64 encoded
  decodedPayload?: Record<string, unknown>;
  // Radio metadata
  rssi: number;
  snr: number;
  spreadingFactor: number;
  bandwidth: number;
  frequency: number;
  codingRate?: string;
  // Gateway info (primary gateway - backward compat)
  gatewayId: string;
  gatewayEui?: string;
  gatewayLocation?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  // All gateways that received this uplink
  gateways?: Array<{
    gatewayId: string;
    gatewayEui?: string;
    rssi: number;
    snr: number;
    location?: {
      latitude: number;
      longitude: number;
      altitude?: number;
    };
  }>;
  // Timestamps
  receivedAt: Date;
  // Session info
  devAddr?: string;
  // Consumed for downlink
  confirmed: boolean;
  createdAt: Date;
}

const ttnUplinkSchema = new mongoose.Schema({
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
    required: true
  },
  fCnt: {
    type: Number,
    required: true
  },
  rawPayload: {
    type: String,
    required: true
  },
  decodedPayload: {
    type: mongoose.Schema.Types.Mixed
  },
  rssi: {
    type: Number,
    required: true
  },
  snr: {
    type: Number,
    required: true
  },
  spreadingFactor: {
    type: Number,
    required: true
  },
  bandwidth: {
    type: Number,
    required: true
  },
  frequency: {
    type: Number,
    required: true
  },
  codingRate: {
    type: String
  },
  gatewayId: {
    type: String,
    required: true
  },
  gatewayEui: {
    type: String,
    uppercase: true
  },
  gatewayLocation: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  gateways: [{
    gatewayId: { type: String },
    gatewayEui: { type: String, uppercase: true },
    rssi: { type: Number },
    snr: { type: Number },
    location: {
      latitude: Number,
      longitude: Number,
      altitude: Number
    }
  }],
  receivedAt: {
    type: Date,
    required: true,
    index: true
  },
  devAddr: {
    type: String,
    uppercase: true
  },
  confirmed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
ttnUplinkSchema.index({ deviceId: 1, receivedAt: -1 });
ttnUplinkSchema.index({ applicationId: 1, receivedAt: -1 });

// TTL index to auto-delete old uplinks after 30 days (configurable)
ttnUplinkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const TTNUplink = mongoose.model<ITTNUplink>('TTNUplink', ttnUplinkSchema);

import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface ITTNApplication extends mongoose.Document {
  applicationId: string;
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  ttnRegion: string;
  apiKeyEncrypted?: string;
  webhookId?: string;
  webhookSecret?: string;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
  hasApiKey: boolean;
  setApiKey(plainKey: string): void;
  getApiKey(): string | null;
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
  apiKeyEncrypted: {
    type: String,
    select: false
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: hasApiKey
ttnApplicationSchema.virtual('hasApiKey').get(function () {
  return !!this.apiKeyEncrypted;
});

// Instance method: encrypt and store API key
ttnApplicationSchema.methods.setApiKey = function (plainKey: string): void {
  this.apiKeyEncrypted = encrypt(plainKey);
};

// Instance method: decrypt and return API key
ttnApplicationSchema.methods.getApiKey = function (): string | null {
  if (!this.apiKeyEncrypted) return null;
  return decrypt(this.apiKeyEncrypted);
};

// Index for faster queries
ttnApplicationSchema.index({ owner: 1 });
ttnApplicationSchema.index({ applicationId: 1 });

export const TTNApplication = mongoose.model<ITTNApplication>('TTNApplication', ttnApplicationSchema);

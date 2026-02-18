import mongoose from 'mongoose';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/encryption';

export interface IWiFiConfig extends mongoose.Document {
  deviceId: string;
  ssid: string;
  password: string;
  apiKey: string;
  owner: mongoose.Types.ObjectId;
  lastFetched: Date;
  createdAt: Date;
  updatedAt: Date;
  encryptPassword(password: string): string;
  decryptPassword(encryptedPassword: string): string;
}

const wifiConfigSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  ssid: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastFetched: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Method to encrypt password before saving
wifiConfigSchema.methods.encryptPassword = function(password: string): string {
  return encrypt(password);
};

// Method to decrypt password when needed
wifiConfigSchema.methods.decryptPassword = function(encryptedPassword: string): string {
  return decrypt(encryptedPassword);
};

// Generate API key before saving if not exists
wifiConfigSchema.pre('save', function(next) {
  if (!this.apiKey) {
    this.apiKey = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Index for faster queries
wifiConfigSchema.index({ deviceId: 1 });
wifiConfigSchema.index({ apiKey: 1 });
wifiConfigSchema.index({ owner: 1 });

export const WiFiConfig = mongoose.model<IWiFiConfig>('WiFiConfig', wifiConfigSchema);

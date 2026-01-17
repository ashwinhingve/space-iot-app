import mongoose from 'mongoose';
import crypto from 'crypto';

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

// Encryption algorithm
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Get encryption key as Buffer
const getEncryptionKey = (): Buffer => {
  if (process.env.WIFI_ENCRYPTION_KEY) {
    // If key is from env, it's a hex string - convert to Buffer
    return Buffer.from(process.env.WIFI_ENCRYPTION_KEY, 'hex');
  }
  // Generate a random key if not provided
  return crypto.randomBytes(32);
};

const ENCRYPTION_KEY = getEncryptionKey();

// Method to encrypt password before saving
wifiConfigSchema.methods.encryptPassword = function(password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Method to decrypt password when needed
wifiConfigSchema.methods.decryptPassword = function(encryptedPassword: string): string {
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
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

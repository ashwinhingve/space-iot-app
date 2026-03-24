import mongoose from 'mongoose';

export type SystemMode = 'single' | 'team';
export type AdminAccessMode = 'super' | 'rbac';

export interface ISystemConfig extends mongoose.Document {
  mode: SystemMode;
  adminAccessMode: AdminAccessMode;
  companyName?: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const systemConfigSchema = new mongoose.Schema<ISystemConfig>({
  mode: {
    type: String,
    enum: ['single', 'team'],
    default: 'team',
  },
  adminAccessMode: {
    type: String,
    enum: ['super', 'rbac'],
    default: 'super',
  },
  companyName: {
    type: String,
    trim: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);

// Cache so we don't hit DB on every request
let cachedMode: SystemMode = 'team';
let cacheTs = 0;
const CACHE_TTL = 30_000; // 30s

export async function getSystemMode(): Promise<SystemMode> {
  const now = Date.now();
  if (now - cacheTs < CACHE_TTL) return cachedMode;
  try {
    const cfg = await SystemConfig.findOne();
    cachedMode = cfg?.mode ?? 'team';
    cacheTs = now;
  } catch {
    // return cached
  }
  return cachedMode;
}

export function invalidateSystemModeCache() {
  cacheTs = 0;
}

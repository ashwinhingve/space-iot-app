import mongoose from 'mongoose';

export interface IDevice extends mongoose.Document {
  name: string;
  type: string;
  status: 'online' | 'offline';
  owner: mongoose.Types.ObjectId;
  mqttTopic: string;
  lastSeen: Date;
  lastData: {
    timestamp: Date;
    value: number;
  };
  settings: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['switch', 'slider', 'sensor', 'chart']
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mqttTopic: {
    type: String,
    required: true,
    unique: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastData: {
    timestamp: {
      type: Date,
      default: Date.now
    },
    value: {
      type: Number,
      default: 0
    }
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      temperature: 0,
      humidity: 0,
      value: 0
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
deviceSchema.index({ owner: 1 });
deviceSchema.index({ mqttTopic: 1 });

export const Device = mongoose.model<IDevice>('Device', deviceSchema); 
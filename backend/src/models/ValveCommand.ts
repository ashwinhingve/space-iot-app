import mongoose from 'mongoose';

/**
 * Valve Command Interface
 * Represents a command sent to control a valve (ON/OFF)
 * Used for command queue, acknowledgment tracking, and reliability
 */
export interface IValveCommand extends mongoose.Document {
  commandId: string;
  manifoldId: mongoose.Types.ObjectId;
  valveId: mongoose.Types.ObjectId;
  valveNumber: number;
  action: 'ON' | 'OFF';

  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED' | 'EXPIRED';

  issuedBy: mongoose.Types.ObjectId;
  issuedAt: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  expiresAt: Date;

  errorMessage: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Valve Command Schema
 * Command queue for valve control operations
 *
 * Lifecycle:
 * 1. PENDING  - Command created, waiting to be sent
 * 2. SENT     - Published to MQTT, waiting for ESP32 acknowledgment
 * 3. ACKNOWLEDGED - ESP32 confirmed execution
 * 4. FAILED   - Command failed (error occurred)
 * 5. EXPIRED  - No acknowledgment received within timeout (30 seconds)
 *
 * This ensures:
 * - Reliable command delivery
 * - Prevents command flooding
 * - Tracks command history
 * - Enables retry logic
 * - Provides audit trail
 */
const valveCommandSchema = new mongoose.Schema({
  commandId: {
    type: String,
    required: [true, 'Command ID is required'],
    unique: true,
    index: true
  },
  manifoldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manifold',
    required: [true, 'Manifold reference is required'],
    index: true
  },
  valveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Valve',
    required: [true, 'Valve reference is required']
  },
  valveNumber: {
    type: Number,
    required: [true, 'Valve number is required'],
    min: [1, 'Valve number must be between 1 and 4'],
    max: [4, 'Valve number must be between 1 and 4']
  },
  action: {
    type: String,
    enum: {
      values: ['ON', 'OFF'],
      message: 'Action must be ON or OFF'
    },
    required: [true, 'Action is required']
  },

  status: {
    type: String,
    enum: {
      values: ['PENDING', 'SENT', 'ACKNOWLEDGED', 'FAILED', 'EXPIRED'],
      message: 'Invalid command status'
    },
    default: 'PENDING',
    index: true
  },

  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Issued by user reference is required']
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  },
  acknowledgedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30000), // 30 seconds from now
    index: true
  },

  errorMessage: {
    type: String,
    default: '',
    maxlength: [500, 'Error message must be less than 500 characters']
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queue processing
valveCommandSchema.index({ status: 1, expiresAt: 1 });
valveCommandSchema.index({ manifoldId: 1, status: 1 });
valveCommandSchema.index({ valveId: 1, createdAt: -1 });

/**
 * Static method: Get pending commands for a manifold
 */
valveCommandSchema.statics.getPendingCommands = function(manifoldId: mongoose.Types.ObjectId) {
  return this.find({
    manifoldId,
    status: 'PENDING',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: 1 });
};

/**
 * Static method: Get command history for a valve
 */
valveCommandSchema.statics.getValveHistory = function(
  valveId: mongoose.Types.ObjectId,
  limit: number = 50
) {
  return this.find({ valveId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('issuedBy', 'name email');
};

/**
 * Static method: Expire old pending commands
 */
valveCommandSchema.statics.expireOldCommands = async function() {
  const result = await this.updateMany(
    {
      status: { $in: ['PENDING', 'SENT'] },
      expiresAt: { $lt: new Date() }
    },
    {
      $set: {
        status: 'EXPIRED',
        errorMessage: 'Command expired - no acknowledgment received within timeout'
      }
    }
  );
  return result.modifiedCount;
};

/**
 * Instance method: Mark command as sent
 */
valveCommandSchema.methods.markAsSent = function() {
  this.status = 'SENT';
  this.sentAt = new Date();
  return this.save();
};

/**
 * Instance method: Mark command as acknowledged
 */
valveCommandSchema.methods.markAsAcknowledged = function() {
  this.status = 'ACKNOWLEDGED';
  this.acknowledgedAt = new Date();
  return this.save();
};

/**
 * Instance method: Mark command as failed
 */
valveCommandSchema.methods.markAsFailed = function(errorMessage: string) {
  this.status = 'FAILED';
  this.errorMessage = errorMessage;
  return this.save();
};

/**
 * Remove sensitive fields from JSON output
 */
valveCommandSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const ValveCommand = mongoose.model<IValveCommand>('ValveCommand', valveCommandSchema);

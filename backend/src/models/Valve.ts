import mongoose from 'mongoose';

/**
 * Valve Interface
 * Represents a single electric ON/OFF valve with DC latch in the manifold system
 */
export interface IValve extends mongoose.Document {
  valveId: string;
  manifoldId: mongoose.Types.ObjectId;
  esp32PinNumber: number;
  valveNumber: number;

  specifications: {
    type: string;
    size: string;
    voltage: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
  };

  operationalData: {
    currentStatus: 'ON' | 'OFF' | 'FAULT';
    mode: 'AUTO' | 'MANUAL';
    lastCommand?: {
      action: 'ON' | 'OFF';
      timestamp: Date;
      issuedBy: mongoose.Types.ObjectId;
    };
    cycleCount: number;
    totalRuntime: number;
  };

  position: {
    flowOrder: number;
    zone: string;
  };

  alarms: Array<{
    alarmId: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedBy?: mongoose.Types.ObjectId;
    acknowledgedAt?: Date;
  }>;

  schedules: Array<{
    scheduleId: string;
    enabled: boolean;
    cronExpression: string;
    action: 'ON' | 'OFF';
    duration: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Valve Schema
 * Each manifold has 4 valves (V1, V2, V3, V4)
 * - Electric ON/OFF control via GPIO pins
 * - DC latching solenoids (24V DC)
 * - Real-time status monitoring
 * - Alarm management
 * - Irrigation scheduling support
 */
const valveSchema = new mongoose.Schema({
  valveId: {
    type: String,
    required: [true, 'Valve ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  manifoldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manifold',
    required: [true, 'Manifold reference is required'],
    index: true
  },
  esp32PinNumber: {
    type: Number,
    required: [true, 'ESP32 GPIO pin number is required'],
    min: [0, 'GPIO pin must be 0 or greater'],
    max: [39, 'GPIO pin must be 39 or less (ESP32 range)']
  },
  valveNumber: {
    type: Number,
    required: [true, 'Valve number is required'],
    min: [1, 'Valve number must be between 1 and 4'],
    max: [4, 'Valve number must be between 1 and 4']
  },

  specifications: {
    type: {
      type: String,
      default: 'Electric ON/OFF Valve with DC Latch'
    },
    size: {
      type: String,
      default: '2 inch'
    },
    voltage: {
      type: String,
      default: '24V DC'
    },
    manufacturer: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: ''
    },
    serialNumber: {
      type: String,
      default: ''
    }
  },

  operationalData: {
    currentStatus: {
      type: String,
      enum: {
        values: ['ON', 'OFF', 'FAULT'],
        message: 'Status must be ON, OFF, or FAULT'
      },
      default: 'OFF'
    },
    mode: {
      type: String,
      enum: {
        values: ['AUTO', 'MANUAL'],
        message: 'Mode must be AUTO or MANUAL'
      },
      default: 'MANUAL'
    },
    lastCommand: {
      action: {
        type: String,
        enum: ['ON', 'OFF']
      },
      timestamp: {
        type: Date
      },
      issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    cycleCount: {
      type: Number,
      default: 0,
      min: [0, 'Cycle count cannot be negative']
    },
    totalRuntime: {
      type: Number,
      default: 0,
      min: [0, 'Total runtime cannot be negative']
    }
  },

  position: {
    flowOrder: {
      type: Number,
      required: [true, 'Flow order is required'],
      min: [1, 'Flow order must be positive']
    },
    zone: {
      type: String,
      default: ''
    }
  },

  alarms: [{
    alarmId: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: {
        values: ['INFO', 'WARNING', 'CRITICAL'],
        message: 'Severity must be INFO, WARNING, or CRITICAL'
      },
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Alarm message must be less than 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date
    }
  }],

  schedules: [{
    scheduleId: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    cronExpression: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: {
        values: ['ON', 'OFF'],
        message: 'Action must be ON or OFF'
      },
      required: true
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index: Ensure unique valve number per manifold
valveSchema.index({ manifoldId: 1, valveNumber: 1 }, { unique: true });
valveSchema.index({ valveId: 1 });
valveSchema.index({ 'operationalData.currentStatus': 1 });

/**
 * Pre-save middleware
 * Increment manifold's total cycle count when valve cycles
 */
valveSchema.pre('save', async function(next) {
  try {
    if (this.isModified('operationalData.cycleCount')) {
      await mongoose.model('Manifold').findByIdAndUpdate(
        this.manifoldId,
        { $inc: { 'metadata.totalCycles': 1 } }
      );
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Remove sensitive fields from JSON output
 */
valveSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Valve = mongoose.model<IValve>('Valve', valveSchema);

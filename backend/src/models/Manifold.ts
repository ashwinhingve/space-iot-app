import mongoose from 'mongoose';

/**
 * Manifold Interface
 * Represents a 4-valve industrial irrigation manifold system (MANIFOLD-27)
 */
export interface IManifold extends mongoose.Document {
  manifoldId: string;
  name: string;
  esp32DeviceId: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;

  specifications: {
    inletSize: string;
    outletSize: string;
    valveCount: number;
    maxPressure: number;
    maxFlowRate: number;
    manufacturer: string;
    model: string;
  };

  installationDetails: {
    location: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    installationDate: Date;
    installedBy: string;
    notes: string;
  };

  status: 'Active' | 'Maintenance' | 'Offline' | 'Fault';

  metadata: {
    totalCycles: number;
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
    tags: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Manifold Schema
 * Based on MANIFOLD-27 technical drawing specifications
 * - 4" inlet, 2" outlets
 * - 4 electric ON/OFF valves with DC latching
 * - Integrated filtration and pressure control
 */
const manifoldSchema = new mongoose.Schema({
  manifoldId: {
    type: String,
    required: [true, 'Manifold ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^MANIFOLD-[A-Z0-9]+$/, 'Manifold ID must follow format: MANIFOLD-XXX']
  },
  name: {
    type: String,
    required: [true, 'Manifold name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name must be less than 100 characters']
  },
  esp32DeviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: [true, 'ESP32 device reference is required'],
    unique: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required'],
    index: true
  },

  specifications: {
    inletSize: {
      type: String,
      default: '4 inch'
    },
    outletSize: {
      type: String,
      default: '2 inch'
    },
    valveCount: {
      type: Number,
      default: 4,
      immutable: true,
      min: [4, 'Valve count must be 4'],
      max: [4, 'Valve count must be 4']
    },
    maxPressure: {
      type: Number,
      default: 150,
      min: [0, 'Pressure cannot be negative']
    },
    maxFlowRate: {
      type: Number,
      default: 100,
      min: [0, 'Flow rate cannot be negative']
    },
    manufacturer: {
      type: String,
      default: 'AUTOMAT'
    },
    model: {
      type: String,
      default: 'MANIFOLD-27'
    }
  },

  installationDetails: {
    location: {
      type: String,
      default: ''
    },
    coordinates: {
      latitude: {
        type: Number,
        default: 0,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        default: 0,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    },
    installationDate: {
      type: Date,
      default: Date.now
    },
    installedBy: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: '',
      maxlength: [1000, 'Notes must be less than 1000 characters']
    }
  },

  status: {
    type: String,
    enum: {
      values: ['Active', 'Maintenance', 'Offline', 'Fault'],
      message: 'Status must be Active, Maintenance, Offline, or Fault'
    },
    default: 'Offline'
  },

  metadata: {
    totalCycles: {
      type: Number,
      default: 0,
      min: [0, 'Total cycles cannot be negative']
    },
    lastMaintenanceDate: {
      type: Date
    },
    nextMaintenanceDate: {
      type: Date
    },
    tags: {
      type: [String],
      default: []
    }
  }
}, {
  timestamps: true
});

// Indexes for performance optimization (scale to 100+ manifolds)
manifoldSchema.index({ owner: 1, status: 1 });
manifoldSchema.index({ 'installationDetails.location': 1 });
manifoldSchema.index({ manifoldId: 1 });

/**
 * Pre-delete middleware
 * Cascade delete associated valves and components when manifold is deleted
 */
manifoldSchema.pre('findOneAndDelete', async function(next) {
  try {
    const manifoldId = this.getQuery()._id;

    // Delete all valves associated with this manifold
    await mongoose.model('Valve').deleteMany({ manifoldId });

    // Delete all components associated with this manifold
    await mongoose.model('Component').deleteMany({ manifoldId });

    console.log(`Cascade delete completed for manifold: ${manifoldId}`);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Remove sensitive fields from JSON output
 */
manifoldSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Manifold = mongoose.model<IManifold>('Manifold', manifoldSchema);

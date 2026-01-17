import mongoose from 'mongoose';

/**
 * Component Interface
 * Represents physical components in the manifold system (ARV, filters, valves, fittings, etc.)
 * Based on MANIFOLD-27 technical drawing
 */
export interface IComponent extends mongoose.Document {
  componentId: string;
  manifoldId: mongoose.Types.ObjectId;
  componentType:
    | 'ARV'
    | 'Ball Valve'
    | 'Butterfly Valve'
    | 'SASF'
    | 'PDPC Valve'
    | 'Grooved Reducer'
    | 'Grooved Coupling'
    | 'Grooved Tee'
    | 'Grooved Elbow'
    | 'Compression MTA'
    | 'Saddle'
    | 'Other';

  specifications: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    size: string;
    material: string;
    rating: string;
    hasDCLatch: boolean;
  };

  position: {
    flowOrder: number;
    section: 'INLET' | 'FILTER' | 'CONTROL' | 'VALVE_BANK' | 'OUTLET';
    description: string;
  };

  maintenance: {
    lastServiceDate?: Date;
    nextServiceDate?: Date;
    serviceInterval: number;
    history: Array<{
      date: Date;
      technician: string;
      workPerformed: string;
      partsReplaced: string[];
      cost: number;
      notes: string;
    }>;
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Component Schema
 * Tracks all manifold components for asset management and maintenance
 *
 * Component Types from MANIFOLD-27:
 * - ARV: Air Release Valve (2 inch)
 * - Ball Valve: Manual isolation valve (2 inch, 4 inch)
 * - Butterfly Valve: Main inlet valve (4 inch)
 * - SASF: Self-Activating Screen Filter (2 inch)
 * - PDPC Valve: Pressure Differential Pressure Control valve (2 inch with DC Latch)
 * - Grooved Fittings: Reducers, Couplings, Tees, Elbows (2 inch, 4 inch)
 * - Compression MTA: Compression fitting for outlets (2 inch)
 * - Saddle: Pipe saddle fitting (2 inch)
 */
const componentSchema = new mongoose.Schema({
  componentId: {
    type: String,
    required: [true, 'Component ID is required'],
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
  componentType: {
    type: String,
    enum: {
      values: [
        'ARV',
        'Ball Valve',
        'Butterfly Valve',
        'SASF',
        'PDPC Valve',
        'Grooved Reducer',
        'Grooved Coupling',
        'Grooved Tee',
        'Grooved Elbow',
        'Compression MTA',
        'Saddle',
        'Other'
      ],
      message: 'Invalid component type'
    },
    required: [true, 'Component type is required']
  },

  specifications: {
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
    },
    size: {
      type: String,
      default: '2 inch'
    },
    material: {
      type: String,
      default: ''
    },
    rating: {
      type: String,
      default: ''
    },
    hasDCLatch: {
      type: Boolean,
      default: false
    }
  },

  position: {
    flowOrder: {
      type: Number,
      required: [true, 'Flow order is required'],
      min: [1, 'Flow order must be positive']
    },
    section: {
      type: String,
      enum: {
        values: ['INLET', 'FILTER', 'CONTROL', 'VALVE_BANK', 'OUTLET'],
        message: 'Section must be INLET, FILTER, CONTROL, VALVE_BANK, or OUTLET'
      },
      required: [true, 'Section is required']
    },
    description: {
      type: String,
      default: '',
      maxlength: [200, 'Description must be less than 200 characters']
    }
  },

  maintenance: {
    lastServiceDate: {
      type: Date
    },
    nextServiceDate: {
      type: Date
    },
    serviceInterval: {
      type: Number,
      default: 365,
      min: [1, 'Service interval must be at least 1 day']
    },
    history: [{
      date: {
        type: Date,
        required: true
      },
      technician: {
        type: String,
        default: ''
      },
      workPerformed: {
        type: String,
        default: '',
        maxlength: [500, 'Work performed description must be less than 500 characters']
      },
      partsReplaced: {
        type: [String],
        default: []
      },
      cost: {
        type: Number,
        default: 0,
        min: [0, 'Cost cannot be negative']
      },
      notes: {
        type: String,
        default: '',
        maxlength: [500, 'Notes must be less than 500 characters']
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
componentSchema.index({ manifoldId: 1, 'position.flowOrder': 1 });
componentSchema.index({ componentType: 1 });
componentSchema.index({ 'position.section': 1 });

/**
 * Pre-save middleware
 * Auto-calculate next service date based on interval
 */
componentSchema.pre('save', function(next) {
  if (this.maintenance && this.maintenance.lastServiceDate && this.maintenance.serviceInterval) {
    const nextDate = new Date(this.maintenance.lastServiceDate);
    nextDate.setDate(nextDate.getDate() + this.maintenance.serviceInterval);
    this.maintenance.nextServiceDate = nextDate;
  }
  next();
});

/**
 * Remove sensitive fields from JSON output
 */
componentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Component = mongoose.model<IComponent>('Component', componentSchema);

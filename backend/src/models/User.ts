import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'ews'
  | 'ows'
  | 'wua'
  | 'survey'
  | 'executive_mechanic'
  | 'executive_electrical'
  | 'executive_civil'
  | 'supervisor'
  | 'quality_assurance'
  // Legacy aliases kept for backward compat with existing DB documents
  | 'engineer' | 'operator';

export type UserType = 'individual' | 'team';

export type PurposeType =
  | 'water_management'
  | 'agriculture'
  | 'industrial_iot'
  | 'smart_city'
  | 'research'
  | 'other';

export const SUBPAGE_DEFINITIONS: Record<string, string[]> = {
  admin:   ['admin.users', 'admin.roles', 'admin.teams', 'admin.system', 'admin.infrastructure', 'admin.activity'],
  reports: ['reports.pump', 'reports.electrical', 'reports.oms', 'reports.rssi'],
  devices: ['devices.lorawan', 'devices.wifi', 'devices.gsm', 'devices.bluetooth'],
};

export type PagePermission =
  | 'dashboard'
  | 'devices'
  | 'scada'
  | 'oms'
  | 'reports'
  | 'tickets'
  | 'documents'
  | 'billing_view'
  | 'admin'
  | 'super_admin'
  | 'console';

export const ALL_PAGES: PagePermission[] = [
  'dashboard', 'devices', 'scada', 'oms', 'reports',
  'tickets', 'documents', 'billing_view', 'admin', 'super_admin', 'console'
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PagePermission[]> = {
  super_admin:           ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin', 'super_admin', 'console'],
  admin:                 ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin', 'console'],
  ews:                   ['dashboard', 'devices', 'scada', 'console'],
  ows:                   ['dashboard', 'devices', 'scada', 'oms', 'console'],
  wua:                   ['dashboard', 'oms', 'reports'],
  survey:                ['dashboard', 'tickets'],
  executive_mechanic:    ['dashboard', 'tickets'],
  executive_electrical:  ['dashboard', 'tickets'],
  executive_civil:       ['dashboard', 'tickets'],
  supervisor:            ['dashboard', 'devices', 'scada', 'oms', 'tickets', 'console'],
  quality_assurance:     ['dashboard', 'tickets', 'oms', 'reports'],
  // Legacy aliases
  engineer:              ['dashboard', 'devices', 'scada', 'oms', 'reports', 'console'],
  operator:              ['dashboard', 'reports'],
};

// Full enum for Mongoose schema validation (includes legacy aliases)
const SCHEMA_ROLES: string[] = [
  'super_admin', 'admin', 'ews', 'ows', 'wua', 'survey',
  'executive_mechanic', 'executive_electrical', 'executive_civil',
  'supervisor', 'quality_assurance',
  // legacy aliases (kept for backward compat with existing DB docs)
  'engineer', 'operator',
];

// Assignable roles shown in admin panel
export const ALL_ROLES: UserRole[] = [
  'admin', 'ews', 'ows', 'wua', 'survey',
  'executive_mechanic', 'executive_electrical', 'executive_civil',
  'supervisor', 'quality_assurance',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:           'Super Admin',
  admin:                 'Admin',
  ews:                   'EWS',
  ows:                   'OWS',
  wua:                   'WUA',
  survey:                'Survey',
  executive_mechanic:    'Executive (Mechanic)',
  executive_electrical:  'Executive (Electrical)',
  executive_civil:       'Executive (Civil)',
  supervisor:            'Supervisor',
  quality_assurance:     'Quality Assurance',
  // Legacy aliases
  engineer:              'EWS',
  operator:              'OWS',
};

export interface IUser extends mongoose.Document {
  email: string;
  password?: string;
  name: string;
  googleId?: string;
  avatar?: string;
  authProvider: 'local' | 'google';
  role: UserRole;
  permissions: PagePermission[];
  isActive: boolean;
  roleAssignedBy?: mongoose.Types.ObjectId;
  roleAssignedAt?: Date;
  phone?: string;
  department?: string;
  village?: string;
  project?: string;
  userType?: UserType;
  purposeType?: PurposeType;
  purposeDescription?: string;
  subpagePermissions: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

const ADMIN_EMAIL = 'spaceautomation29@gmail.com';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function (this: IUser) {
      return this.authProvider === 'local';
    },
    minlength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    enum: SCHEMA_ROLES,
    default: 'admin'
  },
  permissions: {
    type: [String],
    default: ['dashboard']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  roleAssignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  roleAssignedAt: {
    type: Date
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  village: {
    type: String,
    trim: true
  },
  project: {
    type: String,
    trim: true
  },
  userType: {
    type: String,
    enum: ['individual', 'team'],
    // No default — deliberately undefined for new Google users so onboarding can detect them
  },
  purposeType: {
    type: String,
    enum: ['water_management', 'agriculture', 'industrial_iot', 'smart_city', 'research', 'other']
  },
  purposeDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },
  subpagePermissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Auto-assign super_admin role + permissions for the designated super admin email
userSchema.pre('save', async function (next) {
  if (this.isModified('email') || this.isNew) {
    if (this.email === ADMIN_EMAIL) {
      this.role = 'super_admin';
    }
  }

  // Set default permissions for new users if not explicitly provided
  if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
    this.permissions = ROLE_DEFAULT_PERMISSIONS[this.role as UserRole] || ['dashboard'];
  }

  // Hash password before saving (only for local auth, and only if not already hashed)
  if (!this.isModified('password') || !this.password) return next();
  // Guard against accidental double-hashing (bcrypt hashes always start with $2)
  if (this.password.startsWith('$2')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.googleId; // OAuth identity should not be exposed to frontend
  return obj;
};

export const ADMIN_EMAIL_CONST = ADMIN_EMAIL;
export const User = mongoose.model<IUser>('User', userSchema);

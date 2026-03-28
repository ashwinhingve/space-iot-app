"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.ADMIN_EMAIL_CONST = exports.ROLE_LABELS = exports.ALL_ROLES = exports.ROLE_DEFAULT_PERMISSIONS = exports.ALL_PAGES = exports.SUBPAGE_DEFINITIONS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.SUBPAGE_DEFINITIONS = {
    admin: ['admin.users', 'admin.roles', 'admin.teams', 'admin.system', 'admin.infrastructure', 'admin.activity'],
    reports: ['reports.pump', 'reports.electrical', 'reports.oms', 'reports.rssi'],
    devices: ['devices.lorawan', 'devices.wifi', 'devices.gsm', 'devices.bluetooth'],
};
exports.ALL_PAGES = [
    'dashboard', 'devices', 'scada', 'oms', 'reports',
    'tickets', 'documents', 'billing_view', 'admin', 'super_admin', 'console'
];
exports.ROLE_DEFAULT_PERMISSIONS = {
    super_admin: ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin', 'super_admin', 'console'],
    admin: ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin', 'console'],
    ews: ['dashboard', 'devices', 'scada', 'console'],
    ows: ['dashboard', 'devices', 'scada', 'oms', 'console'],
    wua: ['dashboard', 'oms', 'reports'],
    survey: ['dashboard', 'tickets'],
    executive_mechanic: ['dashboard', 'tickets'],
    executive_electrical: ['dashboard', 'tickets'],
    executive_civil: ['dashboard', 'tickets'],
    supervisor: ['dashboard', 'devices', 'scada', 'oms', 'tickets', 'console'],
    quality_assurance: ['dashboard', 'tickets', 'oms', 'reports'],
    // Legacy aliases
    engineer: ['dashboard', 'devices', 'scada', 'oms', 'reports', 'console'],
    operator: ['dashboard', 'reports'],
};
// Full enum for Mongoose schema validation (includes legacy aliases)
const SCHEMA_ROLES = [
    'super_admin', 'admin', 'ews', 'ows', 'wua', 'survey',
    'executive_mechanic', 'executive_electrical', 'executive_civil',
    'supervisor', 'quality_assurance',
    // legacy aliases (kept for backward compat with existing DB docs)
    'engineer', 'operator',
];
// Assignable roles shown in admin panel
exports.ALL_ROLES = [
    'admin', 'ews', 'ows', 'wua', 'survey',
    'executive_mechanic', 'executive_electrical', 'executive_civil',
    'supervisor', 'quality_assurance',
];
exports.ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    ews: 'EWS',
    ows: 'OWS',
    wua: 'WUA',
    survey: 'Survey',
    executive_mechanic: 'Executive (Mechanic)',
    executive_electrical: 'Executive (Electrical)',
    executive_civil: 'Executive (Civil)',
    supervisor: 'Supervisor',
    quality_assurance: 'Quality Assurance',
    // Legacy aliases
    engineer: 'EWS',
    operator: 'OWS',
};
const ADMIN_EMAIL = 'spaceautomation29@gmail.com';
const userSchema = new mongoose_1.default.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function () {
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
        type: mongoose_1.default.Schema.Types.ObjectId,
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
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified('email') || this.isNew) {
            if (this.email === ADMIN_EMAIL) {
                this.role = 'super_admin';
            }
        }
        // Set default permissions for new users if not explicitly provided
        if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
            this.permissions = exports.ROLE_DEFAULT_PERMISSIONS[this.role] || ['dashboard'];
        }
        // Hash password before saving (only for local auth, and only if not already hashed)
        if (!this.isModified('password') || !this.password)
            return next();
        // Guard against accidental double-hashing (bcrypt hashes always start with $2)
        if (this.password.startsWith('$2'))
            return next();
        try {
            const salt = yield bcryptjs_1.default.genSalt(10);
            this.password = yield bcryptjs_1.default.hash(this.password, salt);
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.password)
            return false;
        return bcryptjs_1.default.compare(candidatePassword, this.password);
    });
};
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.googleId; // OAuth identity should not be exposed to frontend
    return obj;
};
exports.ADMIN_EMAIL_CONST = ADMIN_EMAIL;
exports.User = mongoose_1.default.model('User', userSchema);

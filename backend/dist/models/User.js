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
exports.User = exports.ADMIN_EMAIL_CONST = exports.ROLE_LABELS = exports.ALL_ROLES = exports.ROLE_DEFAULT_PERMISSIONS = exports.ALL_PAGES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.ALL_PAGES = [
    'dashboard', 'devices', 'scada', 'oms', 'reports',
    'tickets', 'documents', 'billing_view', 'admin'
];
exports.ROLE_DEFAULT_PERMISSIONS = {
    admin: ['dashboard', 'devices', 'scada', 'oms', 'reports', 'tickets', 'documents', 'billing_view', 'admin'],
    ews: ['dashboard', 'devices', 'scada'],
    ows: ['dashboard', 'devices', 'scada', 'oms'],
    wua: ['dashboard', 'oms', 'reports'],
    survey: ['dashboard', 'tickets'],
    executive_mechanic: ['dashboard', 'tickets'],
    executive_electrical: ['dashboard', 'tickets'],
    executive_civil: ['dashboard', 'tickets'],
    supervisor: ['dashboard', 'devices', 'scada', 'oms', 'tickets'],
    quality_assurance: ['dashboard', 'tickets', 'oms', 'reports'],
    // Legacy aliases
    engineer: ['dashboard', 'devices', 'scada', 'oms', 'reports'],
    operator: ['dashboard', 'reports'],
};
// Full enum for Mongoose schema validation (includes legacy aliases)
const SCHEMA_ROLES = [
    'admin', 'ews', 'ows', 'wua', 'survey',
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
        minlength: 6
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
        default: 'ows'
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
    }
}, {
    timestamps: true
});
// Auto-assign admin role + permissions for the admin email
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified('email') || this.isNew) {
            if (this.email === ADMIN_EMAIL) {
                this.role = 'admin';
            }
        }
        // Set default permissions for new users if not explicitly provided
        if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
            this.permissions = exports.ROLE_DEFAULT_PERMISSIONS[this.role] || ['dashboard'];
        }
        // Hash password before saving (only for local auth)
        if (!this.isModified('password') || !this.password)
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
    return obj;
};
exports.ADMIN_EMAIL_CONST = ADMIN_EMAIL;
exports.User = mongoose_1.default.model('User', userSchema);

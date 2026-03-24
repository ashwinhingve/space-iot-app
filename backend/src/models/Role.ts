import mongoose from 'mongoose';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export const ALL_MODULES = [
  'dashboard', 'tickets', 'projects', 'documents',
  'billing', 'reports', 'devices', 'scada', 'oms', 'users', 'admin',
] as const;

export type PermissionModule = typeof ALL_MODULES[number];

export type ModulePermissions = Partial<Record<PermissionAction, boolean>>;
export type RolePermissionMap = Partial<Record<PermissionModule, ModulePermissions>>;

export interface IRole extends mongoose.Document {
  name: string;
  slug: string;          // lowercase, no spaces — used as role identifier
  description?: string;
  color: string;
  isSystem: boolean;     // true = cannot be deleted
  permissions: RolePermissionMap;
  memberCount?: number;  // virtual
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new mongoose.Schema<IRole>({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  color:       { type: String, default: '#6366f1' },
  isSystem:    { type: Boolean, default: false },
  permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

roleSchema.index({ slug: 1 });

export const Role = mongoose.model<IRole>('Role', roleSchema);

// ── Default system roles seeded on first boot ──────────────────────────────

export const DEFAULT_ROLES: Array<Omit<IRole, keyof mongoose.Document | 'memberCount' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Admin', slug: 'admin', color: '#ef4444', isSystem: true,
    description: 'Full system access. Cannot be restricted.',
    permissions: {
      dashboard: { view: true, create: true, edit: true, delete: true, approve: true },
      tickets:   { view: true, create: true, edit: true, delete: true, approve: true },
      projects:  { view: true, create: true, edit: true, delete: true, approve: true },
      documents: { view: true, create: true, edit: true, delete: true, approve: true },
      billing:   { view: true, create: true, edit: true, delete: true, approve: true },
      reports:   { view: true, create: true, edit: true, delete: true, approve: true },
      devices:   { view: true, create: true, edit: true, delete: true, approve: true },
      scada:     { view: true, create: true, edit: true, delete: true, approve: true },
      oms:       { view: true, create: true, edit: true, delete: true, approve: true },
      users:     { view: true, create: true, edit: true, delete: true, approve: true },
      admin:     { view: true, create: true, edit: true, delete: true, approve: true },
    },
  },
  {
    name: 'Engineer', slug: 'ews', color: '#06b6d4', isSystem: true,
    description: 'Field engineering operations.',
    permissions: {
      dashboard: { view: true },
      tickets:   { view: true, create: true, edit: true },
      devices:   { view: true, edit: true },
      scada:     { view: true },
      oms:       { view: true },
      reports:   { view: true },
    },
  },
  {
    name: 'Operator', slug: 'ows', color: '#3b82f6', isSystem: true,
    description: 'System monitoring and operations.',
    permissions: {
      dashboard: { view: true },
      tickets:   { view: true, create: true },
      devices:   { view: true },
      scada:     { view: true },
      oms:       { view: true, edit: true },
      reports:   { view: true },
    },
  },
  {
    name: 'Supervisor', slug: 'supervisor', color: '#f59e0b', isSystem: true,
    description: 'Reviews and approves field work.',
    permissions: {
      dashboard: { view: true },
      tickets:   { view: true, edit: true, approve: true },
      devices:   { view: true },
      scada:     { view: true },
      oms:       { view: true },
      reports:   { view: true },
    },
  },
  {
    name: 'Quality Assurance', slug: 'quality_assurance', color: '#ec4899', isSystem: true,
    description: 'Quality checks and compliance.',
    permissions: {
      dashboard: { view: true },
      tickets:   { view: true, edit: true, approve: true },
      oms:       { view: true },
      reports:   { view: true, create: true },
    },
  },
  {
    name: 'Survey', slug: 'survey', color: '#eab308', isSystem: true,
    description: 'Field surveys and inspections.',
    permissions: {
      dashboard: { view: true },
      tickets:   { view: true, create: true },
    },
  },
  {
    name: 'WUA', slug: 'wua', color: '#0ea5e9', isSystem: true,
    description: 'Water Users Association — monitors OMS and reports.',
    permissions: {
      dashboard: { view: true },
      oms:       { view: true },
      reports:   { view: true },
    },
  },
];

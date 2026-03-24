import { Request, Response } from 'express';
import { Role, DEFAULT_ROLES, RolePermissionMap } from '../models/Role';
import { User } from '../models/User';
import { logActivity } from '../utils/logActivity';

// ── Seed default roles once ─────────────────────────────────────────────────

export const seedDefaultRoles = async () => {
  for (const def of DEFAULT_ROLES) {
    const exists = await Role.findOne({ slug: def.slug });
    if (!exists) {
      await Role.create({ ...def });
      console.log(`[Roles] Seeded role: ${def.name}`);
    }
  }
};

// ── GET /api/roles ──────────────────────────────────────────────────────────

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().sort({ isSystem: -1, name: 1 });

    // Attach member count
    const slugCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const s of slugCounts) countMap[s._id] = s.count;

    const result = roles.map(r => ({
      ...r.toObject(),
      memberCount: countMap[r.slug] || 0,
    }));

    res.json({ success: true, roles: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// ── GET /api/roles/:slug ────────────────────────────────────────────────────

export const getRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findOne({ slug: req.params.slug });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role' });
  }
};

// ── POST /api/roles ─────────────────────────────────────────────────────────

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, color, permissions } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Role name is required' });

    const slug = name.trim().toLowerCase().replace(/\s+/g, '_');
    const exists = await Role.findOne({ slug });
    if (exists) return res.status(409).json({ error: 'A role with this name already exists' });

    const role = await Role.create({
      name: name.trim(),
      slug,
      description: description?.trim(),
      color: color || '#6366f1',
      isSystem: false,
      permissions: permissions || {},
      createdBy: req.user._id,
    });

    await logActivity(req.user, 'CREATE_ROLE', 'roles', role.name, role._id.toString());
    res.status(201).json({ success: true, role });
  } catch (error: any) {
    if (error.code === 11000) return res.status(409).json({ error: 'Role already exists' });
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// ── PATCH /api/roles/:slug ──────────────────────────────────────────────────

export const updateRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findOne({ slug: req.params.slug });
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const { name, description, color, permissions } = req.body;
    const before = { name: role.name, permissions: role.permissions };

    if (name && !role.isSystem) {
      role.name = name.trim();
      role.slug = name.trim().toLowerCase().replace(/\s+/g, '_');
    }
    if (description !== undefined) role.description = description?.trim();
    if (color) role.color = color;
    if (permissions) role.permissions = permissions as RolePermissionMap;

    await role.save();

    await logActivity(req.user, 'UPDATE_ROLE', 'roles', role.name, role._id.toString(), {
      before, after: { name: role.name, permissions: role.permissions },
    });

    // Propagate permission changes to users with this role who haven't had custom permissions set
    await syncRolePermissionsToUsers(role.slug, role.permissions);

    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// ── DELETE /api/roles/:slug ─────────────────────────────────────────────────

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findOne({ slug: req.params.slug });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.isSystem) return res.status(403).json({ error: 'System roles cannot be deleted' });

    const memberCount = await User.countDocuments({ role: role.slug });
    if (memberCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${memberCount} user(s) have this role. Reassign them first.`,
      });
    }

    await Role.deleteOne({ slug: role.slug });
    await logActivity(req.user, 'DELETE_ROLE', 'roles', role.name, role._id.toString());

    res.json({ success: true, message: `Role "${role.name}" deleted` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
};

// ── Helper: sync role permissions to all users with this role ───────────────

async function syncRolePermissionsToUsers(roleSlug: string, permissions: RolePermissionMap) {
  try {
    // Derive page-level permissions from view access
    const pages: string[] = [];
    for (const [mod, perms] of Object.entries(permissions)) {
      if (perms?.view) pages.push(mod);
    }
    // Map module names to page permission names
    const pageMap: Record<string, string> = {
      dashboard: 'dashboard', tickets: 'tickets', billing: 'billing_view',
      reports: 'reports', documents: 'documents', scada: 'scada',
      oms: 'oms', devices: 'devices', admin: 'admin', users: 'admin',
    };
    const resolvedPages = [...new Set(pages.map(p => pageMap[p] || p).filter(Boolean))];

    await User.updateMany({ role: roleSlug }, { $set: { permissions: resolvedPages } });
  } catch (err) {
    console.error('[Roles] Failed to sync permissions:', err);
  }
}

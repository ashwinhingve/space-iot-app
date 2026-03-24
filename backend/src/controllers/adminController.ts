import { Request, Response } from 'express';
import { User, UserRole, PagePermission, ALL_ROLES, ROLE_DEFAULT_PERMISSIONS, ALL_PAGES } from '../models/User';
import { AdminAccessMode, SystemConfig, SystemMode, invalidateSystemModeCache } from '../models/SystemConfig';

/**
 * GET /api/admin/users
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 100, role, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (role && ALL_ROLES.includes(role as UserRole)) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .populate('roleAssignedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Admin getUsers error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, permissions, phone, department, village, project } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, email, password, and role are required'
      });
    }

    if (!ALL_ROLES.includes(role as UserRole)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${ALL_ROLES.join(', ')}`
      });
    }

    // Prevent creating another admin
    if (role === 'admin' && email !== 'spaceautomation29@gmail.com') {
      return res.status(403).json({
        error: 'Cannot create admin',
        message: 'Admin role can only be assigned to the designated admin email'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email already exists'
      });
    }

    // Use provided permissions or role defaults
    const userPermissions: PagePermission[] =
      Array.isArray(permissions) && permissions.length > 0
        ? permissions.filter((p: string) => ALL_PAGES.includes(p as PagePermission))
        : ROLE_DEFAULT_PERMISSIONS[role as UserRole] || ['dashboard'];

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      permissions: userPermissions,
      authProvider: 'local',
      isActive: true,
      phone: phone?.trim() || undefined,
      department: department?.trim() || undefined,
      village: village?.trim() || undefined,
      project: project?.trim() || undefined,
      roleAssignedBy: req.user._id,
      roleAssignedAt: new Date()
    });

    await newUser.save();
    console.log(`Admin ${req.user.email} created user ${newUser.email} with role ${role}`);

    res.status(201).json({
      success: true,
      message: `User ${newUser.name} created successfully`,
      user: newUser.toJSON()
    });
  } catch (error: any) {
    console.error('Admin createUser error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * PATCH /api/admin/users/:id/role
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, resetPermissions = true } = req.body;

    if (!role || !ALL_ROLES.includes(role as UserRole)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${ALL_ROLES.join(', ')}`
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === 'spaceautomation29@gmail.com' && role !== 'admin') {
      return res.status(403).json({
        error: 'Cannot change admin role',
        message: 'The primary admin account role cannot be changed'
      });
    }

    if (role === 'admin' && targetUser.email !== 'spaceautomation29@gmail.com') {
      return res.status(403).json({
        error: 'Cannot assign admin role',
        message: 'Admin role can only be assigned to the designated admin email'
      });
    }

    targetUser.role = role as UserRole;
    if (resetPermissions) {
      targetUser.permissions = ROLE_DEFAULT_PERMISSIONS[role as UserRole] || ['dashboard'];
    }
    targetUser.roleAssignedBy = req.user._id;
    targetUser.roleAssignedAt = new Date();
    await targetUser.save();

    console.log(`Admin ${req.user.email} changed role of ${targetUser.email} to ${role}`);

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: targetUser.toJSON()
    });
  } catch (error) {
    console.error('Admin updateUserRole error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

/**
 * PATCH /api/admin/users/:id/permissions
 */
export const updateUserPermissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        error: 'Invalid permissions',
        message: 'permissions must be an array of page names'
      });
    }

    const validPermissions = permissions.filter((p: string) =>
      ALL_PAGES.includes(p as PagePermission)
    ) as PagePermission[];

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admin always keeps admin permission
    if (targetUser.email === 'spaceautomation29@gmail.com') {
      if (!validPermissions.includes('admin')) validPermissions.push('admin');
    }

    targetUser.permissions = validPermissions;
    await targetUser.save();

    console.log(`Admin ${req.user.email} updated permissions of ${targetUser.email}`);

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      user: targetUser.toJSON()
    });
  } catch (error) {
    console.error('Admin updateUserPermissions error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
};

/**
 * PATCH /api/admin/users/:id/profile
 * Update user profile fields (name, phone, department, village, project)
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, department, village, project } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) targetUser.name = name.trim();
    if (phone !== undefined) targetUser.phone = phone?.trim() || undefined;
    if (department !== undefined) targetUser.department = department?.trim() || undefined;
    if (village !== undefined) targetUser.village = village?.trim() || undefined;
    if (project !== undefined) targetUser.project = project?.trim() || undefined;

    await targetUser.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: targetUser.toJSON()
    });
  } catch (error) {
    console.error('Admin updateUserProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * PATCH /api/admin/users/:id/active
 */
export const toggleUserActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === 'spaceautomation29@gmail.com') {
      return res.status(403).json({
        error: 'Cannot disable admin',
        message: 'The primary admin account cannot be disabled'
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        error: 'Cannot disable yourself',
        message: 'You cannot disable your own account'
      });
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    console.log(`Admin ${req.user.email} ${isActive ? 'enabled' : 'disabled'} user ${targetUser.email}`);

    res.json({
      success: true,
      message: `User account ${isActive ? 'enabled' : 'disabled'} successfully`,
      user: targetUser.toJSON()
    });
  } catch (error) {
    console.error('Admin toggleUserActive error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

/**
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.email === 'spaceautomation29@gmail.com') {
      return res.status(403).json({
        error: 'Cannot delete admin',
        message: 'The primary admin account cannot be deleted'
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        error: 'Cannot delete yourself',
        message: 'You cannot delete your own account'
      });
    }

    await User.deleteOne({ _id: id });
    console.log(`Admin ${req.user.email} deleted user ${targetUser.email}`);

    res.json({
      success: true,
      message: `User ${targetUser.name} deleted successfully`
    });
  } catch (error) {
    console.error('Admin deleteUser error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * GET /api/admin/stats
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [total, active, byRole] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }
      ])
    ]);

    const roleBreakdown: Record<string, { total: number; active: number }> = {};
    for (const r of byRole) {
      roleBreakdown[r._id] = { total: r.count, active: r.active };
    }

    // Ensure all roles are present
    const roles: Record<string, { total: number; active: number }> = {};
    for (const role of ALL_ROLES) {
      roles[role] = roleBreakdown[role] || { total: 0, active: 0 };
    }

    res.json({
      success: true,
      stats: { totalUsers: total, activeUsers: active, roles }
    });
  } catch (error) {
    console.error('Admin getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

/**
 * GET /api/admin/config  — public (no auth required for reading mode)
 */
export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    let cfg = await SystemConfig.findOne();
    if (!cfg) cfg = await SystemConfig.create({ mode: 'team' });
    res.json({
      success: true,
      config: {
        mode: cfg.mode,
        adminAccessMode: cfg.adminAccessMode ?? 'super',
        companyName: cfg.companyName
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system config' });
  }
};

/**
 * PATCH /api/admin/config  — admin only
 */
export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    const { mode, adminAccessMode, companyName } = req.body;

    if (mode && !['single', 'team'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be "single" or "team"' });
    }
    if (adminAccessMode && !['super', 'rbac'].includes(adminAccessMode)) {
      return res.status(400).json({ error: 'adminAccessMode must be "super" or "rbac"' });
    }

    let cfg = await SystemConfig.findOne();
    if (!cfg) cfg = new SystemConfig({ mode: 'team' });

    if (mode) cfg.mode = mode as SystemMode;
    if (adminAccessMode) cfg.adminAccessMode = adminAccessMode as AdminAccessMode;
    if (companyName !== undefined) cfg.companyName = companyName?.trim() || undefined;
    cfg.updatedBy = req.user._id;
    await cfg.save();

    invalidateSystemModeCache();

    console.log(
      `Admin ${req.user.email} changed system config: mode=${cfg.mode}, adminAccessMode=${cfg.adminAccessMode ?? 'super'}`
    );
    res.json({
      success: true,
      config: {
        mode: cfg.mode,
        adminAccessMode: cfg.adminAccessMode ?? 'super',
        companyName: cfg.companyName
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update system config' });
  }
};

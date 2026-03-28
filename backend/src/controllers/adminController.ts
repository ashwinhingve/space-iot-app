import { Request, Response } from 'express';
import { User, UserRole, PagePermission, ALL_ROLES, ROLE_DEFAULT_PERMISSIONS, ALL_PAGES, SUBPAGE_DEFINITIONS, ADMIN_EMAIL_CONST } from '../models/User';
import { AdminAccessMode, SystemConfig, SystemMode, invalidateSystemModeCache } from '../models/SystemConfig';

/**
 * GET /api/admin/users
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 100, role, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    // Regular admins cannot see super_admin or other admin accounts
    if (req.user.role !== 'super_admin') {
      filter.role = { $nin: ['super_admin', 'admin'] };
    }

    if (role && ALL_ROLES.includes(role as UserRole)) {
      // Only apply role filter if it doesn't conflict with visibility rule above
      if (req.user.role === 'super_admin') {
        filter.role = role;
      } else if (!['super_admin', 'admin'].includes(role as string)) {
        filter.role = role;
      }
    }
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
    const { name, email, password, role, permissions, subpagePermissions, phone, department, village, project, userType, purposeType } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, email, password, and role are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!ALL_ROLES.includes(role as UserRole)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${ALL_ROLES.join(', ')}`
      });
    }

    // super_admin role cannot be assigned by anyone — it is reserved for the designated email
    if (role === 'super_admin') {
      return res.status(403).json({
        error: 'Cannot assign super_admin role',
        message: 'The super_admin role is reserved and cannot be assigned manually'
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

    // Validate subpage permissions
    const allValidSubpages = Object.values(SUBPAGE_DEFINITIONS).flat();
    const validSubpagePerms: string[] = Array.isArray(subpagePermissions)
      ? subpagePermissions.filter((s: string) => allValidSubpages.includes(s))
      : [];

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      permissions: userPermissions,
      subpagePermissions: validSubpagePerms,
      authProvider: 'local',
      isActive: true,
      phone: phone?.trim() || undefined,
      department: department?.trim() || undefined,
      village: village?.trim() || undefined,
      project: project?.trim() || undefined,
      userType: userType || 'team',
      purposeType: purposeType || undefined,
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

    // super_admin role cannot be assigned to anyone
    if (role === 'super_admin') {
      return res.status(403).json({
        error: 'Cannot assign super_admin role',
        message: 'The super_admin role is reserved and cannot be assigned manually'
      });
    }

    // Protect the designated super admin email — its role cannot be changed
    if (targetUser.email === ADMIN_EMAIL_CONST) {
      return res.status(403).json({
        error: 'Cannot change super admin role',
        message: 'The super admin account role cannot be changed'
      });
    }

    // Regular admins cannot modify other admin or super_admin accounts
    if (req.user.role !== 'super_admin' && ['admin', 'super_admin'].includes(targetUser.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only the super admin can modify admin accounts'
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
    const { permissions, subpagePermissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        error: 'Invalid permissions',
        message: 'permissions must be an array of page names'
      });
    }

    const validPermissions = permissions.filter((p: string) =>
      ALL_PAGES.includes(p as PagePermission)
    ) as PagePermission[];

    // Validate subpage permissions
    const allValidSubpages = Object.values(SUBPAGE_DEFINITIONS).flat();
    const validSubpagePerms: string[] = Array.isArray(subpagePermissions)
      ? subpagePermissions.filter((s: string) => allValidSubpages.includes(s))
      : [];

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protect admin/super_admin accounts from being modified by regular admins
    if (req.user.role !== 'super_admin' && ['admin', 'super_admin'].includes(targetUser.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only the super admin can modify admin account permissions'
      });
    }

    // Super admin always retains super_admin permission (cannot be stripped)
    if (targetUser.email === ADMIN_EMAIL_CONST) {
      if (!validPermissions.includes('super_admin')) validPermissions.push('super_admin');
      if (!validPermissions.includes('admin')) validPermissions.push('admin');
    }

    targetUser.permissions = validPermissions;
    targetUser.subpagePermissions = validSubpagePerms;
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

    // Regular admins cannot modify admin or super_admin accounts
    if (req.user.role !== 'super_admin' && ['admin', 'super_admin'].includes(targetUser.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only the super admin can modify admin account profiles'
      });
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

    // Protect the designated super admin from being disabled
    if (targetUser.email === ADMIN_EMAIL_CONST) {
      return res.status(403).json({
        error: 'Cannot disable super admin',
        message: 'The super admin account cannot be disabled'
      });
    }

    // Regular admins cannot toggle active status on admin/super_admin accounts
    if (req.user.role !== 'super_admin' && ['admin', 'super_admin'].includes(targetUser.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only the super admin can enable/disable admin accounts'
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

    // The super admin account can never be deleted
    if (targetUser.email === ADMIN_EMAIL_CONST) {
      return res.status(403).json({
        error: 'Cannot delete super admin',
        message: 'The super admin account cannot be deleted'
      });
    }

    // Regular admins cannot delete other admin/super_admin accounts
    if (req.user.role !== 'super_admin' && ['admin', 'super_admin'].includes(targetUser.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Only the super admin can delete admin accounts'
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
    // Regular admins only see stats for non-admin/non-super_admin users
    const statsFilter = req.user.role !== 'super_admin' ? { role: { $nin: ['super_admin', 'admin'] } } : {};
    const statsFilterActive = req.user.role !== 'super_admin' ? { role: { $nin: ['super_admin', 'admin'] }, isActive: true } : { isActive: true };

    const [total, active, byRole] = await Promise.all([
      User.countDocuments(statsFilter),
      User.countDocuments(statsFilterActive),
      User.aggregate([
        ...(req.user.role !== 'super_admin' ? [{ $match: { role: { $nin: ['super_admin', 'admin'] } } }] : []),
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

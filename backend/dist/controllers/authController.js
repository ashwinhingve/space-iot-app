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
exports.logout = exports.updatePassword = exports.updateProfile = exports.setupSystem = exports.googleAuth = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const google_auth_library_1 = require("google-auth-library");
const SystemConfig_1 = require("../models/SystemConfig");
// Initialize Google OAuth client
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ _id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};
const User_2 = require("../models/User");
const SUPER_ADMIN_PERMISSIONS = User_2.ROLE_DEFAULT_PERMISSIONS['super_admin'];
/**
 * Ensure legacy users always have required auth fields.
 * Some older documents may miss role/permissions/isActive.
 */
function ensureUserDefaults(user) {
    return __awaiter(this, void 0, void 0, function* () {
        let changed = false;
        if (user.isActive === undefined) {
            user.isActive = true;
            changed = true;
        }
        if (!user.role) {
            user.role = user.email === User_1.ADMIN_EMAIL_CONST ? 'super_admin' : 'admin';
            changed = true;
        }
        if (!Array.isArray(user.permissions) || user.permissions.length === 0) {
            const role = user.role;
            user.permissions = User_2.ROLE_DEFAULT_PERMISSIONS[role] || ['dashboard'];
            changed = true;
        }
        if (!Array.isArray(user.subpagePermissions)) {
            user.subpagePermissions = [];
            changed = true;
        }
        if (changed) {
            yield user.save();
        }
    });
}
/**
 * Enforce designated super admin email always has role=super_admin and full permissions.
 * Silently updates DB if needed — no error thrown.
 */
function enforceSuperAdminIfNeeded(user) {
    return __awaiter(this, void 0, void 0, function* () {
        if (user.email !== User_1.ADMIN_EMAIL_CONST)
            return;
        const needsUpdate = user.role !== 'super_admin' || !user.permissions || user.permissions.length < SUPER_ADMIN_PERMISSIONS.length;
        if (needsUpdate) {
            user.role = 'super_admin';
            user.permissions = SUPER_ADMIN_PERMISSIONS;
            yield user.save();
        }
    });
}
/**
 * Build safe user response object (includes role)
 */
const buildUserResponse = (user) => ({
    _id: user._id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    authProvider: user.authProvider,
    role: user.role,
    permissions: user.permissions || [],
    isActive: user.isActive,
    phone: user.phone,
    department: user.department,
    village: user.village,
    project: user.project,
    userType: user.userType || undefined,
    purposeType: user.purposeType,
    purposeDescription: user.purposeDescription,
    subpagePermissions: user.subpagePermissions || [],
    createdAt: user.createdAt
});
/**
 * Register new user
 * POST /api/auth/register
 */
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, userType, purposeType, purposeDescription } = req.body;
        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide name, email, and password'
            });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }
        // Enhanced password validation
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password too short',
                message: 'Password must be at least 8 characters long'
            });
        }
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            });
        }
        if (name.trim().length < 2) {
            return res.status(400).json({
                error: 'Invalid name',
                message: 'Name must be at least 2 characters long'
            });
        }
        // Check if user already exists
        const existingUser = yield User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email already registered',
                message: 'An account with this email already exists'
            });
        }
        // Determine role:
        //  1. Designated super admin email → always super_admin
        //  2. All other public registrations → admin (default)
        //  3. Single (individual) mode → also admin (no change needed)
        const isAdminEmail = email.toLowerCase() === User_1.ADMIN_EMAIL_CONST;
        let role = 'admin';
        if (isAdminEmail) {
            role = 'super_admin';
        }
        // Create new user
        const user = new User_1.User({
            email: email.toLowerCase(),
            password,
            name: name.trim(),
            authProvider: 'local',
            role,
            userType: userType || 'team',
            purposeType: purposeType || undefined,
            purposeDescription: purposeDescription ? purposeDescription.trim().substring(0, 500) : undefined,
        });
        yield user.save();
        // Generate JWT token
        const token = generateToken(user._id.toString());
        console.log(`New user registered: ${user.email} (role: ${user.role})`);
        res.status(201).json({
            success: true,
            token,
            user: buildUserResponse(user)
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'Email already registered',
                message: 'An account with this email already exists'
            });
        }
        res.status(500).json({
            error: 'Registration failed',
            message: 'An error occurred while creating your account'
        });
    }
});
exports.register = register;
/**
 * Login user
 * POST /api/auth/login
 */
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Please provide email and password'
            });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }
        const user = yield User_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }
        if (user.authProvider === 'google') {
            return res.status(401).json({
                error: 'Invalid login method',
                message: 'This account uses Google Sign-In. Please login with Google.'
            });
        }
        if (user.isActive === false) {
            return res.status(403).json({
                error: 'Account disabled',
                message: 'Your account has been disabled. Please contact the administrator.'
            });
        }
        yield ensureUserDefaults(user);
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }
        yield enforceSuperAdminIfNeeded(user);
        const token = generateToken(user._id.toString());
        console.log(`User logged in: ${user.email} (role: ${user.role})`);
        res.json({
            success: true,
            token,
            user: buildUserResponse(user)
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred while logging in'
        });
    }
});
exports.login = login;
/**
 * Get current user
 * GET /api/auth/me
 */
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }
        yield ensureUserDefaults(user);
        yield enforceSuperAdminIfNeeded(user);
        res.json({
            success: true,
            user: buildUserResponse(user)
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to get user',
            message: 'An error occurred while fetching user data'
        });
    }
});
exports.getMe = getMe;
/**
 * Google OAuth callback
 * POST /api/auth/google
 */
const googleAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({
                error: 'Missing credential',
                message: 'Google ID token is required'
            });
        }
        let payload;
        try {
            const ticket = yield googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
            if (!payload) {
                throw new Error('Invalid token payload');
            }
        }
        catch (verifyError) {
            console.error('Google token verification failed:', verifyError.message);
            return res.status(401).json({
                error: 'Invalid Google token',
                message: 'Failed to verify Google authentication. Please try again.'
            });
        }
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name || 'Google User';
        const avatar = payload.picture;
        if (!payload.email_verified) {
            return res.status(400).json({
                error: 'Email not verified',
                message: 'Please verify your email with Google first'
            });
        }
        let user = yield User_1.User.findOne({ googleId });
        if (!user) {
            user = yield User_1.User.findOne({ email: email.toLowerCase() });
            if (user) {
                if (user.authProvider === 'local') {
                    return res.status(400).json({
                        error: 'Email already registered',
                        message: 'An account with this email exists. Please login with email and password.'
                    });
                }
                user.googleId = googleId;
                user.avatar = avatar || user.avatar;
                user.name = name || user.name;
                yield user.save();
            }
            else {
                // Determine role for new Google users (same logic as register)
                let role = 'admin';
                if (email.toLowerCase() === User_1.ADMIN_EMAIL_CONST) {
                    role = 'super_admin';
                }
                user = new User_1.User({
                    email: email.toLowerCase(),
                    name,
                    googleId,
                    avatar,
                    authProvider: 'google',
                    role,
                    // userType intentionally omitted — onboarding page will prompt the user to set it
                });
                yield user.save();
                console.log(`New user registered via Google: ${user.email} (role: ${user.role})`);
                yield enforceSuperAdminIfNeeded(user);
                const token = generateToken(user._id.toString());
                console.log(`User logged in via Google (new): ${user.email} (role: ${user.role})`);
                return res.json({
                    success: true,
                    token,
                    isNewUser: true,
                    user: buildUserResponse(user)
                });
            }
        }
        else {
            if (user.isActive === false) {
                return res.status(403).json({
                    error: 'Account disabled',
                    message: 'Your account has been disabled. Please contact the administrator.'
                });
            }
            yield ensureUserDefaults(user);
            user.name = name;
            user.avatar = avatar || user.avatar;
            yield user.save();
        }
        yield enforceSuperAdminIfNeeded(user);
        const token = generateToken(user._id.toString());
        console.log(`User logged in via Google: ${user.email} (role: ${user.role})`);
        res.json({
            success: true,
            token,
            isNewUser: false,
            user: buildUserResponse(user)
        });
    }
    catch (error) {
        console.error('Google auth error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'Account already exists',
                message: 'An account with this Google ID already exists'
            });
        }
        res.status(500).json({
            error: 'Google authentication failed',
            message: 'An error occurred during Google authentication'
        });
    }
});
exports.googleAuth = googleAuth;
/**
 * First-time system setup — Individual mode
 * POST /api/auth/setup
 *
 * Sets system mode to 'single' and registers the first user as Admin.
 * Only works when NO admin user exists in the database (first-time setup).
 * After setup, subsequent logins work normally.
 */
const setupSystem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, userType, purposeType, purposeDescription } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Please provide name, email, and password'
            });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email', message: 'Please provide a valid email address' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password too short', message: 'Password must be at least 8 characters' });
        }
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        if (!hasUpper || !hasLower || !hasNum) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must contain uppercase, lowercase, and a number'
            });
        }
        // Guard: only allowed if no admin exists yet
        const adminExists = yield User_1.User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(403).json({
                error: 'Setup already complete',
                message: 'An admin already exists. Use the normal registration form.'
            });
        }
        // Check if email is already registered
        const existing = yield User_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({
                error: 'Email already registered',
                message: 'An account with this email already exists'
            });
        }
        // Switch system mode to 'single' (Individual)
        let cfg = yield SystemConfig_1.SystemConfig.findOne();
        if (!cfg)
            cfg = new SystemConfig_1.SystemConfig({ mode: 'single' });
        cfg.mode = 'single';
        yield cfg.save();
        (0, SystemConfig_1.invalidateSystemModeCache)();
        // Create first user — super_admin if designated email, otherwise admin
        const firstRole = email.toLowerCase() === User_1.ADMIN_EMAIL_CONST ? 'super_admin' : 'admin';
        const user = new User_1.User({
            email: email.toLowerCase(),
            password,
            name: name.trim(),
            authProvider: 'local',
            role: firstRole,
            userType: 'individual',
            purposeType: purposeType || undefined,
            purposeDescription: purposeDescription ? purposeDescription.trim().substring(0, 500) : undefined,
        });
        yield user.save();
        const token = generateToken(user._id.toString());
        console.log(`System setup complete. First admin created: ${user.email}`);
        res.status(201).json({
            success: true,
            token,
            user: buildUserResponse(user),
            message: 'Individual mode configured. You are the system administrator.'
        });
    }
    catch (error) {
        console.error('Setup error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already registered', message: 'An account with this email already exists' });
        }
        res.status(500).json({ error: 'Setup failed', message: 'An error occurred during setup' });
    }
});
exports.setupSystem = setupSystem;
/**
 * Update current user's profile
 * PUT /api/auth/profile
 */
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found', message: 'User account not found' });
        }
        const { name, phone, department, village, project, userType, purposeType, purposeDescription } = req.body;
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2) {
                return res.status(400).json({ error: 'Invalid name', message: 'Name must be at least 2 characters long' });
            }
            user.name = name.trim();
        }
        if (phone !== undefined)
            user.phone = phone ? String(phone).trim() : undefined;
        if (department !== undefined)
            user.department = department ? String(department).trim() : undefined;
        if (village !== undefined)
            user.village = village ? String(village).trim() : undefined;
        if (project !== undefined)
            user.project = project ? String(project).trim() : undefined;
        if (userType !== undefined && ['individual', 'team'].includes(userType)) {
            user.userType = userType;
        }
        if (purposeType !== undefined) {
            const validPurposes = ['water_management', 'agriculture', 'industrial_iot', 'smart_city', 'research', 'other'];
            if (validPurposes.includes(purposeType))
                user.purposeType = purposeType;
        }
        if (purposeDescription !== undefined) {
            user.purposeDescription = purposeDescription ? String(purposeDescription).trim().substring(0, 500) : undefined;
        }
        yield user.save();
        // Issue a fresh token (never echo back the client's own token)
        const token = generateToken(user._id.toString());
        res.json({
            success: true,
            token,
            user: buildUserResponse(user)
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Update failed', message: 'An error occurred while updating your profile' });
    }
});
exports.updateProfile = updateProfile;
/**
 * Change current user's password
 * PUT /api/auth/password
 */
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found', message: 'User account not found' });
        }
        if (user.authProvider === 'google') {
            return res.status(400).json({
                error: 'Not supported',
                message: 'Password change is not available for Google Sign-In accounts'
            });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Missing fields', message: 'Both current and new password are required' });
        }
        const isMatch = yield user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Wrong password', message: 'Current password is incorrect' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password too short', message: 'New password must be at least 8 characters' });
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'Password must contain uppercase, lowercase, and a number'
            });
        }
        user.password = newPassword;
        yield user.save();
        res.json({ success: true, message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Update failed', message: 'An error occurred while updating your password' });
    }
});
exports.updatePassword = updatePassword;
/**
 * Logout user (client-side token removal)
 * POST /api/auth/logout
 */
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Logout failed',
            message: 'An error occurred while logging out'
        });
    }
});
exports.logout = logout;

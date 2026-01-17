"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = express_1.default.Router();
// Public routes with rate limiting
router.post('/register', rateLimiter_1.authLimiter, authController_1.register);
router.post('/login', rateLimiter_1.authLimiter, authController_1.login);
router.post('/google', rateLimiter_1.authLimiter, authController_1.googleAuth);
// Protected routes (require authentication)
router.get('/me', auth_1.auth, authController_1.getMe);
router.post('/logout', auth_1.auth, authController_1.logout);
exports.default = router;

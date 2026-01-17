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
exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const auth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract token from Authorization header
        const authHeader = req.header('Authorization');
        const token = authHeader === null || authHeader === void 0 ? void 0 : authHeader.replace('Bearer ', '');
        if (!token || !(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No authentication token provided',
                code: 'NO_TOKEN'
            });
        }
        // Verify JWT token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Your session has expired. Please login again.',
                    code: 'TOKEN_EXPIRED'
                });
            }
            else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Invalid token',
                    message: 'Authentication token is invalid',
                    code: 'INVALID_TOKEN'
                });
            }
            throw jwtError;
        }
        // Find user
        const user = yield User_1.User.findOne({ _id: decoded._id });
        if (!user) {
            return res.status(401).json({
                error: 'User not found',
                message: 'User account no longer exists',
                code: 'USER_NOT_FOUND'
            });
        }
        // Attach user and token to request
        req.user = user;
        req.token = token;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication',
            code: 'AUTH_ERROR'
        });
    }
});
exports.auth = auth;

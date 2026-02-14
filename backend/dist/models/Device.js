"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const deviceSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['switch', 'slider', 'sensor', 'chart']
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    owner: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mqttTopic: {
        type: String,
        required: true,
        unique: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    lastData: {
        timestamp: {
            type: Date,
            default: Date.now
        },
        value: {
            type: Number,
            default: 0
        }
    },
    settings: {
        type: mongoose_1.default.Schema.Types.Mixed,
        default: {
            temperature: 0,
            humidity: 0,
            value: 0
        }
    }
}, {
    timestamps: true
});
// Index for faster queries
deviceSchema.index({ owner: 1 });
deviceSchema.index({ mqttTopic: 1 });
exports.Device = mongoose_1.default.model('Device', deviceSchema);

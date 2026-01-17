"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const deviceController_1 = require("../controllers/deviceController");
const router = express_1.default.Router();
// All routes require authentication
router.get('/', auth_1.auth, deviceController_1.getDevices);
router.get('/:id', auth_1.auth, deviceController_1.getDevice);
router.post('/', auth_1.auth, deviceController_1.createDevice);
router.put('/:id', auth_1.auth, deviceController_1.updateDevice);
router.delete('/:id', auth_1.auth, deviceController_1.deleteDevice);
router.post('/:id/control', auth_1.auth, deviceController_1.controlDevice);
exports.default = router;

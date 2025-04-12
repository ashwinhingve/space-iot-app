"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const deviceController_1 = require("../controllers/deviceController");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_1.auth);
router.post('/', deviceController_1.createDevice);
router.get('/', deviceController_1.getDevices);
router.get('/:id', deviceController_1.getDevice);
router.put('/:id', deviceController_1.updateDevice);
router.delete('/:id', deviceController_1.deleteDevice);
router.post('/:id/control', deviceController_1.controlDevice);
exports.default = router;

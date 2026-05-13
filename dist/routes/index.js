"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const etablissements_1 = __importDefault(require("./etablissements"));
const diffusions_1 = __importDefault(require("./diffusions"));
const dashboard_1 = __importDefault(require("./dashboard"));
const health_1 = __importDefault(require("./health"));
const utilisateurs_1 = __importDefault(require("./utilisateurs"));
const rapports_1 = __importDefault(require("./rapports"));
const devices_1 = __importDefault(require("./devices"));
const notifications_1 = __importDefault(require("./notifications"));
const audio_1 = __importDefault(require("./audio"));
const upload_1 = __importDefault(require("./upload"));
const router = (0, express_1.Router)();
// Routes publiques
router.use('/auth', auth_1.default);
router.use('/health', health_1.default);
// Routes protégées
router.use('/etablissements', etablissements_1.default);
router.use('/diffusions', diffusions_1.default);
router.use('/dashboard', dashboard_1.default);
router.use('/utilisateurs', utilisateurs_1.default);
router.use('/rapports', rapports_1.default);
router.use('/devices', devices_1.default);
router.use('/notifications', notifications_1.default);
router.use('/audio', audio_1.default);
router.use('/upload', upload_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map
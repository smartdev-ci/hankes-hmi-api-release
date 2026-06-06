"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const middleware_1 = require("./middleware");
const config_1 = require("./config");
const app = (0, express_1.default)();
exports.app = app;
app.disable('x-powered-by');
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
    hsts: config_1.config.nodeEnv === 'production'
        ? { maxAge: 15552000, includeSubDomains: true, preload: true }
        : false,
}));
// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : '*';
const corsAllowsWildcard = corsOrigin === '*' || (Array.isArray(corsOrigin) &&
    corsOrigin.length === 1 &&
    corsOrigin[0] === '*');
app.use((0, cors_1.default)({
    origin: corsAllowsWildcard ? '*' : corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: !corsAllowsWildcard,
}));
app.use((0, middleware_1.rateLimiter)(config_1.config.rateLimit.windowMs, config_1.config.rateLimit.maxRequests));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression
app.use((0, compression_1.default)());
// Logging
if (config_1.config.nodeEnv === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use(middleware_1.requestLogger);
}
// API Routes
app.use('/v1', routes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'HMIS API - Hankes Music Intelligence System',
        version: '2.0.0',
        documentation: '/api-docs',
    });
});
// Error handling
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler, rateLimiter, requestLogger } from './middleware';
import { config } from './config';

const app: Application = express();

app.disable('x-powered-by');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: config.nodeEnv === 'production'
    ? { maxAge: 15552000, includeSubDomains: true, preload: true }
    : false,
}));

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : '*';
const corsAllowsWildcard = corsOrigin === '*' || (
  Array.isArray(corsOrigin) &&
  corsOrigin.length === 1 &&
  corsOrigin[0] === '*'
);

app.use(cors({
  origin: corsAllowsWildcard ? '*' : corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: !corsAllowsWildcard,
}));

app.use(rateLimiter(config.rateLimit.windowMs, config.rateLimit.maxRequests));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}

// API Routes
app.use('/v1', routes);

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
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;

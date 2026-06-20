import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import authRoutes from './modules/auth/auth.routes';
import policyRoutes from './modules/policies/policy.routes';
import submissionRoutes from './modules/submissions/submission.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import verdictRoutes from './modules/verdicts/verdict.routes';
import auditRoutes from './modules/audit/audit.routes';
import appealRoutes from './modules/appeals/appeal.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const app: Application = express();

// ─── Security & Hardening Middleware ─────────────────────────────────────────

// Set security HTTP headers
app.use(helmet());

// Enable CORS with proper configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*', // Configure to specific origins in prod
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
);

// Compress response bodies
app.use(compression());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request size limits (prevent payload too large DOS attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Static Files & Health ───────────────────────────────────────────────────

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req: Request, res: Response) => {
  res.status(200).send("Backend is running");
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/policies', policyRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1/verdicts', verdictRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/appeals', appealRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────

// Global 404 Handler for unmatched routes
app.use('*', notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
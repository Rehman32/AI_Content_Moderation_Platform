import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import policyRoutes from './modules/policies/policy.routes';
import submissionRoutes from './modules/submissions/submission.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import verdictRoutes from './modules/verdicts/verdict.routes';
import auditRoutes from './modules/audit/audit.routes';
import appealRoutes from './modules/appeals/appeal.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/',(req: Request , res:Response) => {
    res.status(200).send("Backend is running");
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/policies', policyRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1/verdicts', verdictRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/appeals', appealRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/',(req: Request , res:Response) => {
    res.status(200).send("Backend is running");
});

// API Routes
app.use('/api/v1/auth', authRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import logger from './utils/logger';
import bundlesRouter from './routes/bundles';
import scrapeRouter from './routes/scrape';
import serveRouter from './routes/serve';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure required directories exist
const dirs = [
  path.join(process.cwd(), 'bundles'),
  path.join(process.cwd(), 'uploads'),
  path.join(process.cwd(), 'logs'),
];
dirs.forEach((dir) => fs.ensureDirSync(dir));

// Middleware
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
    : '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) },
}));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV,
  });
});

// API Routes
app.use('/api/bundles', bundlesRouter);
app.use('/api/scrape', scrapeRouter);
app.use('/api/serve', serveRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`OfflineNet Backend running on port ${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`API: http://localhost:${PORT}/api`);
  logger.info(`Health: http://localhost:${PORT}/api/health`);
});

export default app;
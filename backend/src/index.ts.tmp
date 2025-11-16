import express from 'express';
import cors from 'cors';
import { startIngestionService } from './services/ingestion';
import apiRouter from './routes/api';
import adminRouter from './routes/admin';
import tclProxyRouter from './routes/tcl-proxy';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import logger from './utils/logger';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tcl', tclProxyRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`Backend server is running on port ${port}`);
  logger.info('Starting data ingestion service...');
  startIngestionService();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { securityHeaders, requestSizeLimit, suspiciousActivityDetection, corsConfig } from '@/middleware/securityMiddleware';
import { logger } from '@/utils/logger';
import { connectDatabase, initializeDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Custom security headers
app.use(securityHeaders);

// Request size limiting
app.use(requestSizeLimit('10mb'));

// Suspicious activity detection
app.use(suspiciousActivityDetection);

// CORS configuration with enhanced security
app.use(cors(corsConfig));

// General middleware
app.use(compression());
app.use(morgan('combined', { 
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/health' // Skip health check logs
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import main API routes
import apiRoutes from '@/routes/index';

// API routes
app.use('/api/v1', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Initialize database with system configuration
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
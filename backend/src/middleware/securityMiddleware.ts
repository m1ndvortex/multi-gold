import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Enhanced rate limiting configurations for different endpoints
 */
export const rateLimitConfigs = {
  // General API rate limiting
  general: rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use combination of IP and tenant for rate limiting
      const tenantId = req.headers['x-tenant-id'] || 'unknown';
      return `${req.ip}-${tenantId}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        tenantId: req.headers['x-tenant-id'],
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent']
      });
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
          timestamp: new Date().toISOString()
        }
      });
    }
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10'),
    message: {
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      logger.warn('Authentication rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent']
      });
      res.status(429).json({
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again later.',
          timestamp: new Date().toISOString()
        }
      });
    }
  }),

  // Very strict rate limiting for password reset
  passwordReset: rateLimit({
    windowMs: parseInt(process.env.PASSWORD_RESET_WINDOW_MS || '3600000'), // 1 hour
    max: parseInt(process.env.PASSWORD_RESET_MAX_REQUESTS || '3'),
    message: {
      error: {
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts, please try again later.',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Password reset rate limit exceeded', {
        ip: req.ip,
        email: req.body?.email,
        userAgent: req.headers['user-agent']
      });
      res.status(429).json({
        error: {
          code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
          message: 'Too many password reset attempts, please try again later.',
          timestamp: new Date().toISOString()
        }
      });
    }
  })
};

/**
 * IP Whitelisting middleware
 * Checks if the request IP is in the allowed list for the user/tenant
 */
export const ipWhitelist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Skip IP whitelisting in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;

    // If no tenant or user, skip whitelist check
    if (!tenantId || !userId) {
      return next();
    }

    // For now, skip IP whitelisting as these tables don't exist yet
    // This will be implemented when tenant settings tables are created
    // TODO: Implement IP whitelisting when tenant settings are available
    return next();
  } catch (error) {
    logger.error('IP whitelist check failed', error);
    next(error);
  }
};

/**
 * Security headers middleware
 * Adds additional security headers beyond helmet
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Request-ID', req.headers['x-request-id'] || generateRequestId());
  
  // Prevent caching of sensitive endpoints
  if (req.url.includes('/api/v1/auth') || req.url.includes('/api/v1/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return next(createError(
          `Request size too large. Maximum allowed: ${maxSize}`,
          413,
          'REQUEST_TOO_LARGE'
        ));
      }
    }
    
    next();
  };
};

/**
 * Suspicious activity detection middleware
 */
export const suspiciousActivityDetection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientIp = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userId = (req as any).user?.id;

    // Check for suspicious patterns
    const suspiciousPatterns = [
      // SQL injection attempts
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
      // XSS attempts
      /(<script|javascript:|onload=|onerror=)/i,
      // Path traversal attempts
      /(\.\.\/|\.\.\\)/,
      // Command injection attempts
      /(\b(exec|eval|system|shell_exec)\b)/i
    ];

    const requestData = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params
    });

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestData));

    if (isSuspicious) {
      logger.warn('Suspicious activity detected', {
        clientIp,
        userAgent,
        userId,
        url: req.url,
        method: req.method,
        requestData: req.body,
        timestamp: new Date().toISOString()
      });

      // Log to security audit table
      await prisma.systemAuditLog.create({
        data: {
          action: 'SUSPICIOUS_ACTIVITY_DETECTED',
          entity: 'SECURITY',
          entity_id: clientIp,
          user_id: userId || null,
          details: {
            ip: clientIp,
            userAgent,
            url: req.url,
            method: req.method,
            suspiciousData: requestData
          },
          ip_address: clientIp,
          user_agent: userAgent
        }
      });

      // For now, just log and continue. In production, you might want to block
      // return next(createError('Suspicious activity detected', 400, 'SUSPICIOUS_ACTIVITY'));
    }

    next();
  } catch (error) {
    logger.error('Suspicious activity detection failed', error);
    next(); // Continue even if detection fails
  }
};

/**
 * CORS configuration for different environments
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin not allowed', { origin });
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Tenant-ID',
    'X-Request-ID',
    'X-API-Version'
  ],
  exposedHeaders: ['X-Request-ID', 'X-API-Version'],
  maxAge: 86400 // 24 hours
};

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return value * (units[unit] || 1);
}

export default {
  rateLimitConfigs,
  ipWhitelist,
  securityHeaders,
  requestSizeLimit,
  suspiciousActivityDetection,
  corsConfig
};
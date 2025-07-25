import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from '@/middleware/errorHandler';
import { TenantRequest } from '@/middleware/tenantMiddleware';

export interface AuthRequest extends TenantRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    permissions: string[];
    twoFactorEnabled?: boolean;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(
        'Access token is required',
        401,
        'TOKEN_REQUIRED'
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      throw createError(
        'JWT secret not configured',
        500,
        'JWT_SECRET_MISSING'
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Validate token structure
    if (!decoded.id || !decoded.email || !decoded.tenantId) {
      throw createError(
        'Invalid token structure',
        401,
        'INVALID_TOKEN'
      );
    }

    // Ensure user belongs to the current tenant
    if (req.tenantId && decoded.tenantId !== req.tenantId) {
      throw createError(
        'Token does not match tenant',
        403,
        'TENANT_MISMATCH'
      );
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
      permissions: decoded.permissions || [],
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError(
        'Invalid or expired token',
        401,
        'INVALID_TOKEN'
      ));
    } else {
      next(error);
    }
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    if (!req.user.permissions.includes(permission) && req.user.role !== 'SUPER_ADMIN') {
      return next(createError(
        `Permission '${permission}' required`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      ));
    }

    next();
  };
};
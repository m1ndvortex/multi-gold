import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/middleware/authMiddleware';
import { createError } from '@/middleware/errorHandler';
import { UserRole } from '@prisma/client';

/**
 * Permission-based access control
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    // Super admin has all permissions
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has the specific permission
    if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('*')) {
      return next(createError(
        `Permission '${permission}' required`,
        403,
        'INSUFFICIENT_PERMISSIONS',
        { requiredPermission: permission, userPermissions: req.user.permissions }
      ));
    }

    next();
  };
};

/**
 * Role-based access control
 */
export const requireRole = (roles: UserRole | UserRole[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(createError(
        `Role '${allowedRoles.join(' or ')}' required`,
        403,
        'INSUFFICIENT_ROLE',
        { requiredRoles: allowedRoles, userRole: req.user.role }
      ));
    }

    next();
  };
};

/**
 * Tenant admin or higher access control
 */
export const requireTenantAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(createError(
      'Authentication required',
      401,
      'AUTH_REQUIRED'
    ));
  }

  const adminRoles: UserRole[] = ['SUPER_ADMIN', 'TENANT_ADMIN'];
  
  if (!adminRoles.includes(req.user.role as UserRole)) {
    return next(createError(
      'Tenant admin access required',
      403,
      'TENANT_ADMIN_REQUIRED',
      { userRole: req.user.role }
    ));
  }

  next();
};

/**
 * Super admin only access control
 */
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(createError(
      'Authentication required',
      401,
      'AUTH_REQUIRED'
    ));
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return next(createError(
      'Super admin access required',
      403,
      'SUPER_ADMIN_REQUIRED',
      { userRole: req.user.role }
    ));
  }

  next();
};

/**
 * Resource ownership check
 * Ensures user can only access their own resources or tenant resources
 */
export const requireResourceOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    // Super admin and tenant admin can access all tenant resources
    if (['SUPER_ADMIN', 'TENANT_ADMIN'].includes(req.user.role)) {
      return next();
    }

    // Check if user is accessing their own resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return next(createError(
        'Access denied: You can only access your own resources',
        403,
        'RESOURCE_ACCESS_DENIED',
        { resourceUserId, userId: req.user.id }
      ));
    }

    next();
  };
};

/**
 * Tenant isolation check
 * Ensures user can only access resources from their tenant
 */
export const requireTenantIsolation = (resourceTenantIdField: string = 'tenantId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    // Super admin can access all tenants
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check tenant isolation
    const resourceTenantId = req.params[resourceTenantIdField] || 
                           req.body[resourceTenantIdField] || 
                           req.tenantId;
    
    if (resourceTenantId && resourceTenantId !== req.user.tenantId) {
      return next(createError(
        'Access denied: Cross-tenant access not allowed',
        403,
        'TENANT_ISOLATION_VIOLATION',
        { resourceTenantId, userTenantId: req.user.tenantId }
      ));
    }

    next();
  };
};

/**
 * Combined permission and role check
 */
export const requirePermissionOrRole = (permission: string, roles: UserRole | UserRole[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    // Check if user has required role
    if (allowedRoles.includes(req.user.role as UserRole)) {
      return next();
    }

    // Check if user has required permission
    if (req.user.permissions.includes(permission) || req.user.permissions.includes('*')) {
      return next();
    }

    return next(createError(
      `Permission '${permission}' or role '${allowedRoles.join(' or ')}' required`,
      403,
      'INSUFFICIENT_ACCESS',
      { 
        requiredPermission: permission, 
        requiredRoles: allowedRoles,
        userPermissions: req.user.permissions,
        userRole: req.user.role
      }
    ));
  };
};

/**
 * Time-based access control
 * Restricts access to certain hours
 */
export const requireBusinessHours = (startHour: number = 9, endHour: number = 17) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const currentHour = new Date().getHours();
    
    if (currentHour < startHour || currentHour >= endHour) {
      return next(createError(
        `Access restricted to business hours (${startHour}:00 - ${endHour}:00)`,
        403,
        'OUTSIDE_BUSINESS_HOURS',
        { currentHour, businessHours: `${startHour}:00 - ${endHour}:00` }
      ));
    }

    next();
  };
};

/**
 * Rate limiting per user
 */
export const requireUserRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError(
        'Authentication required',
        401,
        'AUTH_REQUIRED'
      ));
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize user limit
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return next(createError(
        'User rate limit exceeded',
        429,
        'USER_RATE_LIMIT_EXCEEDED',
        { 
          maxRequests, 
          windowMs,
          resetTime: new Date(userLimit.resetTime).toISOString()
        }
      ));
    }

    userLimit.count++;
    next();
  };
};

/**
 * Audit logging middleware
 * Logs all actions for compliance
 */
export const auditLog = (action: string, entity: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Store audit info in request for later logging
    req.auditInfo = {
      action,
      entity,
      entityId: req.params.id || req.body.id,
      userId: req.user?.id,
      tenantId: req.user?.tenantId || req.tenantId,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                 req.connection.remoteAddress || 
                 'unknown',
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    };

    next();
  };
};

// Extend AuthRequest interface to include audit info
declare module '@/middleware/authMiddleware' {
  interface AuthRequest {
    auditInfo?: {
      action: string;
      entity: string;
      entityId?: string;
      userId?: string;
      tenantId?: string;
      ipAddress: string;
      userAgent?: string;
      timestamp: Date;
    };
  }
}
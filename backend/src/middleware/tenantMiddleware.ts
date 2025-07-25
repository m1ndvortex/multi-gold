import { Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';
import { TenantService, TenantInfo } from '@/services/tenantService';
import { logger } from '@/utils/logger';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenant?: TenantInfo;
}

/**
 * Middleware to handle tenant identification and validation
 * Supports both subdomain-based and header-based tenant identification
 */
export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract tenant identifier from various sources
    let tenantIdentifier = await extractTenantIdentifier(req);
    
    // Define routes that don't require tenant context
    const publicRoutes = [
      '/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/system',
      '/api/v1/tenants/register', // Tenant registration endpoint
    ];
    
    const isPublicRoute = publicRoutes.some(route => 
      req.path === route || req.path.startsWith(route + '/')
    );

    // If no tenant identifier and not a public route, require it
    if (!tenantIdentifier && !isPublicRoute) {
      throw createError(
        'Tenant identification is required. Please provide X-Tenant-ID header or use tenant subdomain.',
        400,
        'TENANT_ID_REQUIRED'
      );
    }

    // If tenant identifier is provided, validate it
    if (tenantIdentifier) {
      try {
        const tenant = await TenantService.validateTenant(tenantIdentifier);
        req.tenantId = tenant.id;
        req.tenant = tenant;
        
        // Add tenant info to response headers for debugging
        if (process.env.NODE_ENV === 'development') {
          res.setHeader('X-Tenant-Name', tenant.name);
          res.setHeader('X-Tenant-Schema', tenant.schema_name);
        }
        
        logger.debug(`Request processed for tenant: ${tenant.name} (${tenant.id})`);
      } catch (error) {
        // If tenant validation fails, log and pass the error
        logger.warn(`Tenant validation failed for identifier: ${tenantIdentifier}`, error);
        throw error;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Extract tenant identifier from request
 * Priority: X-Tenant-ID header > subdomain > query parameter
 */
async function extractTenantIdentifier(req: Request): Promise<string | null> {
  // 1. Check X-Tenant-ID header
  let tenantId = req.headers['x-tenant-id'] as string;
  if (tenantId) {
    return tenantId.trim();
  }

  // 2. Check subdomain
  const host = req.headers.host;
  if (host) {
    const parts = host.split('.');
    if (parts.length > 2) { // e.g., tenant.example.com
      const subdomain = parts[0];
      if (subdomain && !['www', 'api', 'admin', 'app'].includes(subdomain.toLowerCase())) {
        return subdomain;
      }
    }
  }

  // 3. Check query parameter (for development/testing)
  if (req.query.tenant) {
    return req.query.tenant as string;
  }

  return null;
}

/**
 * Middleware to ensure tenant context is available
 * Use this for routes that absolutely require tenant context
 */
export const requireTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenant || !req.tenantId) {
    throw createError(
      'Tenant context is required for this operation',
      400,
      'TENANT_CONTEXT_REQUIRED'
    );
  }
  next();
};

/**
 * Middleware to validate tenant subscription status
 */
export const validateSubscription = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenant) {
    return next();
  }

  const tenant = req.tenant;
  
  // Check if tenant subscription allows this operation
  if (tenant.status === 'EXPIRED') {
    throw createError(
      'Subscription has expired. Please renew to continue using the service.',
      403,
      'SUBSCRIPTION_EXPIRED'
    );
  }

  if (tenant.status === 'SUSPENDED') {
    throw createError(
      'Account has been suspended. Please contact support.',
      403,
      'ACCOUNT_SUSPENDED'
    );
  }

  // Add subscription plan to request for feature gating
  req.headers['x-subscription-plan'] = tenant.subscription_plan;
  
  next();
};
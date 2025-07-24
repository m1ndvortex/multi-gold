import { Request, Response, NextFunction } from 'express';
import { createError } from '@/middleware/errorHandler';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    schema_name: string;
  };
}

export const tenantMiddleware = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract tenant ID from header or subdomain
    let tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      // Try to extract from subdomain
      const host = req.headers.host;
      if (host) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
          tenantId = subdomain;
        }
      }
    }

    // For now, we'll allow requests without tenant ID for health checks and auth endpoints
    const publicRoutes = ['/health', '/auth/login', '/auth/register'];
    const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));

    if (!tenantId && !isPublicRoute) {
      throw createError(
        'Tenant ID is required',
        400,
        'TENANT_ID_REQUIRED'
      );
    }

    if (tenantId) {
      req.tenantId = tenantId;
      // TODO: Validate tenant exists and is active
      // This will be implemented when we have the tenant service
    }

    next();
  } catch (error) {
    next(error);
  }
};
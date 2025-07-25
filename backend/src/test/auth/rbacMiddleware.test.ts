import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '@/middleware/authMiddleware';
import {
  requirePermission,
  requireRole,
  requireTenantAdmin,
  requireSuperAdmin,
  requireResourceOwnership,
  requireTenantIsolation,
  requirePermissionOrRole,
} from '@/middleware/rbacMiddleware';
import { createError } from '@/middleware/errorHandler';

describe('RBAC Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('requirePermission', () => {
    it('should allow access with correct permission', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: ['invoices.create', 'invoices.view'],
        twoFactorEnabled: false,
      };

      const middleware = requirePermission('invoices.create');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for super admin', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      const middleware = requirePermission('any.permission');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access with wildcard permission', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123',
        permissions: ['*'],
        twoFactorEnabled: false,
      };

      const middleware = requirePermission('any.permission');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without permission', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: ['invoices.view'],
        twoFactorEnabled: false,
      };

      const middleware = requirePermission('invoices.create');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'INSUFFICIENT_PERMISSIONS',
        })
      );
    });

    it('should deny access without authentication', () => {
      mockRequest.user = undefined;

      const middleware = requirePermission('invoices.create');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTH_REQUIRED',
        })
      );
    });
  });

  describe('requireRole', () => {
    it('should allow access with correct role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      const middleware = requireRole(UserRole.TENANT_ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access with one of multiple roles', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'cashier@example.com',
        role: 'CASHIER',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      const middleware = requireRole([UserRole.CASHIER, UserRole.ACCOUNTANT]);
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access with incorrect role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'employee@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      const middleware = requireRole(UserRole.TENANT_ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'INSUFFICIENT_ROLE',
        })
      );
    });
  });

  describe('requireTenantAdmin', () => {
    it('should allow access for tenant admin', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      requireTenantAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for super admin', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'superadmin@example.com',
        role: 'SUPER_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      requireTenantAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for regular employee', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'employee@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      requireTenantAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'TENANT_ADMIN_REQUIRED',
        })
      );
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow access for super admin', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'superadmin@example.com',
        role: 'SUPER_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      requireSuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for tenant admin', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      requireSuperAdmin(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'SUPER_ADMIN_REQUIRED',
        })
      );
    });
  });

  describe('requireResourceOwnership', () => {
    it('should allow access for resource owner', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };
      mockRequest.params = { userId: 'user-123' };

      const middleware = requireResourceOwnership('userId');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for tenant admin', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };
      mockRequest.params = { userId: 'user-123' };

      const middleware = requireResourceOwnership('userId');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for different user', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };
      mockRequest.params = { userId: 'other-user-456' };

      const middleware = requireResourceOwnership('userId');
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'RESOURCE_ACCESS_DENIED',
        })
      );
    });
  });

  describe('requireTenantIsolation', () => {
    it('should allow access for same tenant', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };
      mockRequest.tenantId = 'tenant-123';

      const middleware = requireTenantIsolation();
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for super admin', () => {
      mockRequest.user = {
        id: 'admin-123',
        email: 'superadmin@example.com',
        role: 'SUPER_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };
      mockRequest.tenantId = 'tenant-456';

      const middleware = requireTenantIsolation();
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny cross-tenant access', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };
      mockRequest.tenantId = 'tenant-456';

      const middleware = requireTenantIsolation();
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'TENANT_ISOLATION_VIOLATION',
        })
      );
    });
  });

  describe('requirePermissionOrRole', () => {
    it('should allow access with correct permission', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: ['invoices.create'],
        twoFactorEnabled: false,
      };

      const middleware = requirePermissionOrRole('invoices.create', UserRole.TENANT_ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access with correct role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123',
        permissions: [],
        twoFactorEnabled: false,
      };

      const middleware = requirePermissionOrRole('invoices.create', UserRole.TENANT_ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access without permission or role', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'TENANT_EMPLOYEE',
        tenantId: 'tenant-123',
        permissions: ['invoices.view'],
        twoFactorEnabled: false,
      };

      const middleware = requirePermissionOrRole('invoices.create', UserRole.TENANT_ADMIN);
      middleware(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'INSUFFICIENT_ACCESS',
        })
      );
    });
  });
});
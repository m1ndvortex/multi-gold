import { Request, Response, NextFunction } from 'express';
import { tenantMiddleware, requireTenant, validateSubscription, TenantRequest } from '@/middleware/tenantMiddleware';
import { TenantService } from '@/services/tenantService';

// Mock dependencies
jest.mock('@/services/tenantService');
jest.mock('@/utils/logger');

const mockTenantService = TenantService as jest.Mocked<typeof TenantService>;

describe('tenantMiddleware', () => {
  let mockReq: Partial<TenantRequest> & { path?: string };
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Jewelry Store',
    subdomain: 'teststore',
    schema_name: 'tenant_teststore',
    subscription_plan: 'BASIC',
    status: 'ACTIVE',
    is_active: true,
  };

  beforeEach(() => {
    mockReq = {
      headers: {},
      path: '/api/v1/customers',
      query: {},
    };
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('tenant identification', () => {
    it('should extract tenant ID from X-Tenant-ID header', async () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-123' };
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockTenantService.validateTenant).toHaveBeenCalledWith('tenant-123');
      expect(mockReq.tenantId).toBe('tenant-123');
      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract tenant from subdomain', async () => {
      mockReq.headers = { host: 'teststore.example.com' };
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockTenantService.validateTenant).toHaveBeenCalledWith('teststore');
      expect(mockReq.tenantId).toBe('tenant-123');
      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract tenant from query parameter', async () => {
      mockReq.query = { tenant: 'teststore' };
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockTenantService.validateTenant).toHaveBeenCalledWith('teststore');
      expect(mockReq.tenantId).toBe('tenant-123');
      expect(mockReq.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should prioritize X-Tenant-ID header over subdomain', async () => {
      mockReq.headers = { 
        'x-tenant-id': 'tenant-123',
        host: 'different.example.com'
      };
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockTenantService.validateTenant).toHaveBeenCalledWith('tenant-123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should ignore common subdomains', async () => {
      mockReq.headers = { host: 'www.example.com' };
      mockReq.path = '/api/v1/customers';

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockTenantService.validateTenant).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('public routes', () => {
    const publicRoutes = [
      '/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/system/status',
      '/api/v1/tenants/register',
    ];

    publicRoutes.forEach(route => {
      it(`should allow access to public route: ${route}`, async () => {
        mockReq.path = route;

        await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

        expect(mockTenantService.validateTenant).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    it('should allow access to nested public routes', async () => {
      mockReq.path = '/api/v1/auth/login/callback';

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockTenantService.validateTenant).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('tenant validation', () => {
    it('should pass validation for active tenant', async () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-123' };
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.tenant).toEqual(mockTenant);
    });

    it('should handle tenant validation errors', async () => {
      mockReq.headers = { 'x-tenant-id': 'invalid-tenant' };
      const error = new Error('Tenant not found');
      mockTenantService.validateTenant.mockRejectedValueOnce(error);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should require tenant ID for protected routes', async () => {
      mockReq.path = '/api/v1/customers';

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Tenant identification is required'),
      }));
    });
  });

  describe('development headers', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should add debug headers in development', async () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-123' };
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await tenantMiddleware(mockReq as TenantRequest, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Tenant-Name', 'Test Jewelry Store');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Tenant-Schema', 'tenant_teststore');
    });
  });
});

describe('requireTenant', () => {
  let mockReq: Partial<TenantRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should pass if tenant context is available', () => {
    mockReq.tenant = {
      id: 'tenant-123',
      name: 'Test Store',
      subdomain: 'teststore',
      schema_name: 'tenant_teststore',
      subscription_plan: 'BASIC',
      status: 'ACTIVE',
      is_active: true,
    };
    mockReq.tenantId = 'tenant-123';

    requireTenant(mockReq as TenantRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should throw error if tenant context is missing', () => {
    expect(() => {
      requireTenant(mockReq as TenantRequest, mockRes as Response, mockNext);
    }).toThrow('Tenant context is required for this operation');
  });
});

describe('validateSubscription', () => {
  let mockReq: Partial<TenantRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should pass if no tenant context', () => {
    validateSubscription(mockReq as TenantRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should pass for active tenant', () => {
    mockReq.tenant = {
      id: 'tenant-123',
      name: 'Test Store',
      subdomain: 'teststore',
      schema_name: 'tenant_teststore',
      subscription_plan: 'BASIC',
      status: 'ACTIVE',
      is_active: true,
    };

    validateSubscription(mockReq as TenantRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.headers!['x-subscription-plan']).toBe('BASIC');
  });

  it('should throw error for expired subscription', () => {
    mockReq.tenant = {
      id: 'tenant-123',
      name: 'Test Store',
      subdomain: 'teststore',
      schema_name: 'tenant_teststore',
      subscription_plan: 'BASIC',
      status: 'EXPIRED',
      is_active: true,
    };

    expect(() => {
      validateSubscription(mockReq as TenantRequest, mockRes as Response, mockNext);
    }).toThrow('Subscription has expired');
  });

  it('should throw error for suspended account', () => {
    mockReq.tenant = {
      id: 'tenant-123',
      name: 'Test Store',
      subdomain: 'teststore',
      schema_name: 'tenant_teststore',
      subscription_plan: 'BASIC',
      status: 'SUSPENDED',
      is_active: true,
    };

    expect(() => {
      validateSubscription(mockReq as TenantRequest, mockRes as Response, mockNext);
    }).toThrow('Account has been suspended');
  });

  it('should pass for trial status', () => {
    mockReq.tenant = {
      id: 'tenant-123',
      name: 'Test Store',
      subdomain: 'teststore',
      schema_name: 'tenant_teststore',
      subscription_plan: 'BASIC',
      status: 'TRIAL',
      is_active: true,
    };

    validateSubscription(mockReq as TenantRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.headers!['x-subscription-plan']).toBe('BASIC');
  });
});
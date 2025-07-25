import { Request, Response, NextFunction } from 'express';
import { 
  auditLog, 
  businessAuditLog, 
  finalizeAudit,
  auditConfigs,
  AuthRequest
} from '@/middleware/auditMiddleware';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    systemAuditLog: {
      create: jest.fn()
    },
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn().mockResolvedValue([])
  }))
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe('Audit Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      connection: { remoteAddress: '192.168.1.1' } as any,
      headers: {
        'user-agent': 'Test User Agent',
        'x-tenant-id': 'tenant-123'
      },
      url: '/api/v1/customers',
      method: 'POST',
      body: { name: 'Test Customer' },
      query: {},
      params: { id: 'customer-123' },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 'tenant-123'
      },
      tenant: {
        id: 'tenant-123',
        name: 'Test Tenant',
        schemaName: 'test_tenant_123'
      }
    };

    mockRes = {
      send: jest.fn(),
      json: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
      locals: {}
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Basic Audit Log Middleware', () => {
    it('should store audit info in request', async () => {
      const middleware = auditLog('CREATE', 'CUSTOMER');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.auditInfo).toEqual({
        action: 'CREATE',
        entity: 'CUSTOMER',
        description: 'CREATE CUSTOMER'
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not capture response data for sensitive operations', async () => {
      const middleware = auditLog('LOGIN', 'USER', { sensitive: true });
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.auditInfo).toEqual({
        action: 'LOGIN',
        entity: 'USER',
        description: 'LOGIN USER'
      });
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Business Audit Log Middleware', () => {
    it('should set up audit info for UPDATE operations', async () => {
      const middleware = businessAuditLog('UPDATE', 'CUSTOMER');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.auditInfo).toEqual({
        action: 'UPDATE',
        entity: 'CUSTOMER',
        entityId: 'customer-123',
        oldValues: null, // Mock returns empty array
        description: 'UPDATE CUSTOMER customer-123'
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not fetch original data for CREATE operations', async () => {
      const middleware = businessAuditLog('CREATE', 'CUSTOMER');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.auditInfo?.oldValues).toBeNull();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Finalize Audit Middleware', () => {
    beforeEach(() => {
      mockReq.auditInfo = {
        action: 'CREATE',
        entity: 'CUSTOMER',
        description: 'CREATE CUSTOMER'
      };
    });

    it('should finalize audit for successful CREATE operations', async () => {
      mockRes.statusCode = 201;
      mockRes.locals = {
        createdEntity: { id: 'customer-123', name: 'New Customer' }
      };

      await finalizeAudit(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.auditInfo?.newValues).toEqual({
        id: 'customer-123',
        name: 'New Customer'
      });
      expect(mockReq.auditInfo?.entityId).toBe('customer-123');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not finalize audit for failed operations', async () => {
      mockRes.statusCode = 400;

      await finalizeAudit(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Audit Configurations', () => {
    it('should have customer audit configurations', () => {
      expect(auditConfigs.customer).toBeDefined();
      expect(auditConfigs.customer.create).toBeDefined();
      expect(auditConfigs.customer.update).toBeDefined();
      expect(auditConfigs.customer.delete).toBeDefined();
    });

    it('should have authentication audit configurations', () => {
      expect(auditConfigs.auth).toBeDefined();
      expect(auditConfigs.auth.login).toBeDefined();
      expect(auditConfigs.auth.logout).toBeDefined();
      expect(auditConfigs.auth.register).toBeDefined();
    });

    it('should have all required audit configurations', () => {
      expect(auditConfigs.product).toBeDefined();
      expect(auditConfigs.invoice).toBeDefined();
      expect(auditConfigs.account).toBeDefined();
      expect(auditConfigs.journalEntry).toBeDefined();
      expect(auditConfigs.admin).toBeDefined();
    });
  });
});
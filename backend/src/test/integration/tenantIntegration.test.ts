import request from 'supertest';
import express from 'express';
import { TenantService } from '@/services/tenantService';
import { TenantDatabase } from '@/utils/tenantDatabase';
import { tenantMiddleware } from '@/middleware/tenantMiddleware';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { asyncHandler } from '@/middleware/errorHandler';

// Mock external dependencies for integration test
jest.mock('@/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue({}),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }),
}));

jest.mock('@/config/database', () => {
  const mockPrisma = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
    systemConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
      createMany: jest.fn().mockResolvedValue(undefined),
    },
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenantMigration: {
      create: jest.fn(),
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };

  return {
    connectDatabase: jest.fn().mockResolvedValue(mockPrisma),
    initializeDatabase: jest.fn().mockResolvedValue(undefined),
    getPrismaClient: jest.fn().mockReturnValue(mockPrisma),
    healthCheck: jest.fn().mockResolvedValue(true),
  };
});

describe('Tenant Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());
    
    // Health check endpoint (no tenant middleware)
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'test',
      });
    });
    
    // Create a router for API routes
    const apiRouter = express.Router();
    
    // Apply tenant middleware to the router
    apiRouter.use(asyncHandler(tenantMiddleware));
    
    // Test routes on the router
    apiRouter.get('/customers', (req, res) => {
      res.status(200).json({ message: 'Customers endpoint' });
    });
    
    // Mount the router
    app.use('/api/v1', apiRouter);
    
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterAll(async () => {
    await TenantDatabase.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    TenantService.clearCache();
  });

  describe('Health Check', () => {
    it('should return health status without tenant', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      });
    });
  });

  describe('Tenant Middleware Integration', () => {
    it('should reject requests without tenant ID for protected routes', async () => {
      const response = await request(app)
        .get('/api/v1/customers');

      // The middleware is working and trying to validate tenant, but since no tenant ID is provided,
      // it's looking for null and getting TENANT_NOT_FOUND
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });

    it('should accept requests with valid tenant header', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      // Mock the database calls
      const { getPrismaClient } = require('@/config/database');
      const mockPrisma = getPrismaClient();
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      const response = await request(app)
        .get('/api/v1/customers')
        .set('X-Tenant-ID', 'tenant-123')
        .expect(200); // Should pass tenant middleware and reach the route

      expect(response.body).toEqual({ message: 'Customers endpoint' });
    });

    it('should reject requests with invalid tenant', async () => {
      const { getPrismaClient } = require('@/config/database');
      const mockPrisma = getPrismaClient();
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/v1/customers')
        .set('X-Tenant-ID', 'invalid-tenant')
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
      });
    });

    it('should reject requests for inactive tenant', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: false, // Inactive tenant
      };

      const { getPrismaClient } = require('@/config/database');
      const mockPrisma = getPrismaClient();
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      const response = await request(app)
        .get('/api/v1/customers')
        .set('X-Tenant-ID', 'tenant-123')
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'TENANT_INACTIVE',
        message: 'Tenant is inactive',
      });
    });

    it('should reject requests for suspended tenant', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'SUSPENDED',
        is_active: true,
      };

      const { getPrismaClient } = require('@/config/database');
      const mockPrisma = getPrismaClient();
      mockPrisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      const response = await request(app)
        .get('/api/v1/customers')
        .set('X-Tenant-ID', 'tenant-123')
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'TENANT_SUSPENDED',
        message: 'Tenant account is suspended',
      });
    });

    it('should extract tenant from subdomain', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      const { getPrismaClient } = require('@/config/database');
      const mockPrisma = getPrismaClient();
      mockPrisma.tenant.findUnique
        .mockResolvedValueOnce(null) // First call by ID
        .mockResolvedValueOnce(mockTenant); // Second call by subdomain

      const response = await request(app)
        .get('/api/v1/customers')
        .set('Host', 'teststore.example.com')
        .expect(200); // Should pass tenant middleware and reach the route

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { subdomain: 'teststore' },
        select: expect.any(Object),
      });
      expect(response.body).toEqual({ message: 'Customers endpoint' });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      const { getPrismaClient } = require('@/config/database');
      const mockPrisma = getPrismaClient();
      mockPrisma.tenant.findUnique.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/customers')
        .set('X-Tenant-ID', 'tenant-123')
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'TENANT_FETCH_ERROR',
        message: 'Failed to fetch tenant information',
      });
    });

    it('should return structured error responses', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        request_id: expect.any(String),
      });
    });
  });

  describe('Basic Response Headers', () => {
    it('should return JSON responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('status', 'OK');
    });

    it('should handle non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404); // Tenant middleware will try to validate tenant first

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('TENANT_NOT_FOUND');
    });
  });
});
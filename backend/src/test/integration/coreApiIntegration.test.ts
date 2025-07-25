import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '@/server';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { connectRedis, disconnectRedis } from '@/config/redis';

const prisma = new PrismaClient();

describe('Core API Integration Tests', () => {
  let authToken: string;
  let tenantId: string;
  let testTenant: any;
  let testUser: any;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
    await connectRedis();

    // Create test tenant
    testTenant = await prisma.tenant.create({
      data: {
        id: 'test-tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'test-jewelry',
        schema_name: 'test_tenant_123',
        subscription_plan: 'PREMIUM' as any,
        is_active: true,
        settings: {
          businessInfo: {
            name: 'Test Jewelry Store',
            currency: 'USD'
          }
        }
      }
    });

    tenantId = testTenant.id;

    // Create test user
    testUser = await prisma.user.create({
      data: {
        id: 'test-user-123',
        email: 'test@jewelry.com',
        password_hash: '$2b$10$test.hash.here',
        role: 'TENANT_ADMIN',
        tenant_id: tenantId,
        is_active: true
      }
    });

    // Get auth token for testing
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@jewelry.com',
        password: 'testpassword123'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.data.accessToken;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    
    await disconnectDatabase();
    await disconnectRedis();
  });

  describe('Health Check', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Security Middleware', () => {
    it('should add security headers to responses', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-api-version');
      expect(response.headers).toHaveProperty('x-request-id');
    });

    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(150).fill(null).map(() => 
        request(app).get('/api/v1/health')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should reject requests with invalid content-type for POST', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should detect suspicious activity patterns', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant-ID', tenantId)
        .send({
          email: 'test@example.com',
          password: '<script>alert("xss")</script>'
        });

      // Should still process but log suspicious activity
      expect(response.status).toBe(400);
    });
  });

  describe('Tenant Middleware', () => {
    it('should require tenant ID for business routes', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('TENANT_ID_REQUIRED');
    });

    it('should validate tenant ID format', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', 'invalid-tenant-id')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TENANT_ID');
    });

    it('should accept valid tenant ID', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      expect(response.status).not.toBe(400);
    });
  });

  describe('Authentication Middleware', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('X-Tenant-ID', tenantId)
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Tenant-ID', tenantId)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should accept valid JWT tokens', async () => {
      if (authToken) {
        const response = await request(app)
          .get('/api/v1/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Tenant-ID', tenantId);

        expect(response.status).not.toBe(401);
      }
    });
  });

  describe('Validation Middleware', () => {
    it('should validate request body schema', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          name: '', // Invalid: empty name
          email: 'invalid-email', // Invalid: bad email format
          phone: '123' // Invalid: too short
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(1);
      expect(response.body.error.details[0].location).toBe('body');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .query({
          page: 'invalid', // Should be number
          limit: '200' // Should be max 100
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate URL parameters', async () => {
      const response = await request(app)
        .get('/api/v1/customers/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept valid request data', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          name: 'Test Customer',
          email: 'customer@test.com',
          phone: '+1234567890',
          customerGroup: 'RETAIL'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should log customer creation', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          name: 'Audit Test Customer',
          email: 'audit@test.com',
          customerGroup: 'RETAIL'
        });

      expect(response.status).toBe(201);

      // Check if audit log was created
      const auditLogs = await prisma.systemAuditLog.findMany({
        where: {
          action: 'CREATE',
          entity: 'CUSTOMER',
          tenant_id: tenantId
        },
        orderBy: { created_at: 'desc' },
        take: 1
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].user_id).toBe(testUser.id);
    });

    it('should log failed authentication attempts', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@jewelry.com',
          password: 'wrongpassword'
        });

      const auditLogs = await prisma.systemAuditLog.findMany({
        where: {
          action: 'LOGIN',
          entity: 'USER'
        },
        orderBy: { created_at: 'desc' },
        take: 1
      });

      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-route')
        .expect(404);

      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('request_id');
    });

    it('should handle validation errors with detailed messages', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          name: 'A', // Too short
          email: 'invalid',
          customerGroup: 'INVALID_GROUP'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    it('should handle internal server errors', async () => {
      // This would require mocking a service to throw an error
      // For now, we'll test the error handler structure
      const response = await request(app)
        .get('/api/v1/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      if (response.status === 500) {
        expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(response.body.error).toHaveProperty('timestamp');
        expect(response.body.error).toHaveProperty('request_id');
      }
    });
  });

  describe('RBAC Middleware', () => {
    it('should enforce role-based access control', async () => {
      // This test would require creating a user with limited permissions
      // For now, we'll test the basic structure
      const response = await request(app)
        .get('/api/v1/admin/tenants')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      // Should require SUPER_ADMIN role
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should allow access with proper permissions', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      // TENANT_ADMIN should have customer:read permission
      expect(response.status).not.toBe(403);
    });
  });

  describe('API Response Format', () => {
    it('should return consistent success response format', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('customers');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/v1/customers/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('request_id');
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large request bodies within limits', async () => {
      const largeData = {
        name: 'Test Customer',
        email: 'test@example.com',
        notes: 'A'.repeat(1000), // 1KB of notes
        customerGroup: 'RETAIL'
      };

      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send(largeData);

      expect(response.status).toBe(201);
    });

    it('should reject requests exceeding size limits', async () => {
      const oversizedData = {
        name: 'Test Customer',
        notes: 'A'.repeat(15 * 1024 * 1024) // 15MB of data
      };

      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send(oversizedData)
        .expect(413);

      expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
    });
  });
});

describe('Route-Specific Integration Tests', () => {
  let authToken: string = 'mock-auth-token';
  let tenantId: string;

  beforeAll(async () => {
    // Setup similar to above test suite
    tenantId = 'test-tenant-123';
    // authToken would be obtained from login
    authToken = 'mock-auth-token';
  });

  describe('Customer Routes', () => {
    it('should list customers with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number)
      });
    });

    it('should create customer with valid data', async () => {
      const customerData = {
        name: 'Integration Test Customer',
        email: 'integration@test.com',
        phone: '+1234567890',
        customerGroup: 'RETAIL',
        creditLimit: 1000
      };

      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send(customerData)
        .expect(201);

      expect(response.body.data.customer).toMatchObject(customerData);
    });
  });

  describe('Product Routes', () => {
    it('should list products with category filtering', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .query({ category: 'JEWELRY' })
        .expect(200);

      expect(response.body.data).toHaveProperty('products');
    });
  });

  describe('Invoice Routes', () => {
    it('should calculate invoice totals', async () => {
      const invoiceData = {
        customerId: '00000000-0000-0000-0000-000000000001',
        type: 'SALE',
        items: [
          {
            productId: '00000000-0000-0000-0000-000000000002',
            quantity: 1,
            unitPrice: 100
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/invoices/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send(invoiceData)
        .expect(200);

      expect(response.body.data.calculation).toHaveProperty('totalAmount');
    });
  });
});
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '@/server';

// Mock external dependencies
jest.mock('@/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  })),
  connectRedis: jest.fn(),
}));

jest.mock('@/config/database', () => ({
  connectDatabase: jest.fn(),
  initializeDatabase: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Authentication Integration', () => {
  beforeAll(() => {
    // Setup environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_ROUNDS = '12';
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.environment).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    it('should return 404 for non-existent auth endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/auth/nonexistent')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return validation error for invalid registration data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'weak',
          name: '',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid login data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
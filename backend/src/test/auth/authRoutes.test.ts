import request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '@/server';

// Mock dependencies
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

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
  },
  userSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  systemAuditLog: {
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  UserRole: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    TENANT_ADMIN: 'TENANT_ADMIN',
    TENANT_EMPLOYEE: 'TENANT_EMPLOYEE',
    CASHIER: 'CASHIER',
    ACCOUNTANT: 'ACCOUNTANT',
  },
}));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_ROUNDS = '12';
  });

  describe('POST /api/v1/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      tenantId: 'tenant-123',
      role: 'TENANT_EMPLOYEE',
    };

    it('should register a new user successfully', async () => {
      // Mock successful registration
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        is_active: true,
      });
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.TENANT_EMPLOYEE,
        tenant_id: 'tenant-123',
        permissions: ['invoices.create', 'invoices.view'],
        two_factor_enabled: false,
        last_login: null,
      };
      
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: UserRole.TENANT_EMPLOYEE,
            tenantId: 'tenant-123',
            permissions: ['invoices.create', 'invoices.view'],
            twoFactorEnabled: false,
            lastLogin: undefined,
          },
        },
      });
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for weak password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: 'weak',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      name: 'Test User',
      role: UserRole.TENANT_EMPLOYEE,
      tenant_id: 'tenant-123',
      permissions: ['invoices.create'],
      two_factor_enabled: false,
      two_factor_secret: null,
      failed_login_attempts: 0,
      locked_until: null,
      last_login: null,
      is_active: true,
      tenant: {
        id: 'tenant-123',
        is_active: true,
      },
    };

    it('should login user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-123',
        refresh_token: 'refresh-token',
      });

      // Mock bcrypt and jwt
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(jwt, 'sign')
        .mockReturnValueOnce('access-token' as never)
        .mockReturnValueOnce('refresh-token' as never);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBe('access-token');
    });

    it('should require 2FA when enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        two_factor_enabled: true,
        two_factor_secret: 'secret',
      };

      mockPrisma.user.findFirst.mockResolvedValue(userWith2FA);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.data.requiresTwoFactor).toBe(true);
    });

    it('should return validation error for invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for invalid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      
      const mockSession = {
        id: 'session-123',
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_active: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: UserRole.TENANT_EMPLOYEE,
          tenant_id: 'tenant-123',
          permissions: ['invoices.create'],
          is_active: true,
          tenant: {
            id: 'tenant-123',
            is_active: true,
          },
        },
      };

      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.userSession.update.mockResolvedValue({});
      mockPrisma.userSession.create.mockResolvedValue({});

      jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'user-123', type: 'refresh' } as never);
      jest.spyOn(jwt, 'sign')
        .mockReturnValueOnce('new-access-token' as never)
        .mockReturnValueOnce('new-refresh-token' as never);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBe('new-access-token');
    });

    it('should return validation error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const token = jwt.sign(
        {
          id: 'user-123',
          email: 'test@example.com',
          role: 'TENANT_EMPLOYEE',
          tenantId: 'tenant-123',
          permissions: ['invoices.create'],
        },
        process.env.JWT_SECRET!
      );

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    const validPasswordData = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    it('should change password successfully', async () => {
      const token = jwt.sign(
        {
          id: 'user-123',
          email: 'test@example.com',
          role: 'TENANT_EMPLOYEE',
          tenantId: 'tenant-123',
          permissions: ['invoices.create'],
        },
        process.env.JWT_SECRET!
      );

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'old-hashed-password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password' as never);

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(validPasswordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should return validation error for weak new password', async () => {
      const token = jwt.sign(
        {
          id: 'user-123',
          email: 'test@example.com',
          role: 'TENANT_EMPLOYEE',
          tenantId: 'tenant-123',
          permissions: ['invoices.create'],
        },
        process.env.JWT_SECRET!
      );

      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
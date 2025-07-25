import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService, RegisterData, LoginCredentials } from '@/services/authService';
import { createError } from '@/middleware/errorHandler';

// Mock dependencies
jest.mock('@/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('qrcode');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
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
        updateMany: jest.fn(),
      },
      systemAuditLog: {
        create: jest.fn(),
      },
    };

    authService = new AuthService(mockPrisma);

    // Setup environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_ROUNDS = '12';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData: RegisterData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      tenantId: 'tenant-123',
      role: UserRole.TENANT_EMPLOYEE,
    };

    it('should register a new user successfully', async () => {
      // Mock dependencies
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        is_active: true,
      } as any);
      
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      
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
      
      mockPrisma.user.create.mockResolvedValue(mockUser as any);

      // Execute
      const result = await authService.register(registerData);

      // Verify
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email_tenant_id: {
            email: 'test@example.com',
            tenant_id: 'tenant-123',
          },
        },
      });
      
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
      });
      
      expect(bcrypt.hash).toHaveBeenCalledWith('TestPassword123!', 12);
      
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password_hash: 'hashed-password',
          name: 'Test User',
          tenant_id: 'tenant-123',
          role: UserRole.TENANT_EMPLOYEE,
          permissions: expect.any(Array),
        },
      });

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.TENANT_EMPLOYEE,
        tenantId: 'tenant-123',
        permissions: ['invoices.create', 'invoices.view'],
        twoFactorEnabled: false,
        lastLogin: undefined,
      });
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      } as any);

      await expect(authService.register(registerData)).rejects.toThrow('User already exists');
    });

    it('should throw error if tenant is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(authService.register(registerData)).rejects.toThrow('Invalid tenant');
    });

    it('should throw error if tenant is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        is_active: false,
      } as any);

      await expect(authService.register(registerData)).rejects.toThrow('Invalid tenant');
    });
  });

  describe('login', () => {
    const loginCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!',
    };

    const deviceInfo = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop',
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

    it('should login user successfully without 2FA', async () => {
      // Mock dependencies
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-123',
        refresh_token: 'refresh-token',
      } as any);

      // Execute
      const result = await authService.login(loginCredentials, deviceInfo);

      // Verify
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          is_active: true,
        },
        include: {
          tenant: true,
        },
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('TestPassword123!', 'hashed-password');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          failed_login_attempts: 0,
          locked_until: null,
          last_login: expect.any(Date),
          last_login_ip: '192.168.1.1',
        },
      });

      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.TENANT_EMPLOYEE,
        tenantId: 'tenant-123',
        permissions: ['invoices.create'],
        twoFactorEnabled: false,
        lastLogin: null,
      });

      expect(result.tokens).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900, // 15 minutes in seconds
      });
    });

    it('should require 2FA when enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        two_factor_enabled: true,
        two_factor_secret: 'secret',
      };

      mockPrisma.user.findFirst.mockResolvedValue(userWith2FA as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(loginCredentials, deviceInfo);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tokens).toEqual({});
    });

    it('should throw error for invalid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await expect(authService.login(loginCredentials, deviceInfo)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        locked_until: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      };

      mockPrisma.user.findFirst.mockResolvedValue(lockedUser as any);

      await expect(authService.login(loginCredentials, deviceInfo)).rejects.toThrow('Account locked');
    });

    it('should throw error for inactive user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(authService.login(loginCredentials, deviceInfo)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive tenant', async () => {
      const userWithInactiveTenant = {
        ...mockUser,
        tenant: {
          id: 'tenant-123',
          is_active: false,
        },
      };

      mockPrisma.user.findFirst.mockResolvedValue(userWithInactiveTenant as any);

      await expect(authService.login(loginCredentials, deviceInfo)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';
    const deviceInfo = {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    const mockSession = {
      id: 'session-123',
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
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

    it('should refresh token successfully', async () => {
      // Mock dependencies
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-123', type: 'refresh' });
      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession as any);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      
      mockPrisma.userSession.update.mockResolvedValue({} as any);
      mockPrisma.userSession.create.mockResolvedValue({} as any);

      // Execute
      const result = await authService.refreshToken(refreshToken, deviceInfo);

      // Verify
      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, process.env.JWT_REFRESH_SECRET);
      expect(mockPrisma.userSession.findUnique).toHaveBeenCalledWith({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        include: {
          user: {
            include: {
              tenant: true,
            },
          },
        },
      });

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });
    });

    it('should throw error for invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken, deviceInfo)).rejects.toThrow();
    });

    it('should throw error for expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: new Date(Date.now() - 1000), // 1 second ago
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-123', type: 'refresh' });
      mockPrisma.userSession.findUnique.mockResolvedValue(expiredSession as any);

      await expect(authService.refreshToken(refreshToken, deviceInfo)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 } as any);

      await authService.logout(refreshToken);

      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const currentPassword = 'OldPassword123!';
    const newPassword = 'NewPassword123!';

    const mockUser = {
      id: userId,
      email: 'test@example.com',
      password_hash: 'old-hashed-password',
    };

    it('should change password successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 } as any);

      await authService.changePassword(userId, currentPassword, newPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'old-hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          password_hash: 'new-hashed-password',
        },
      });
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });
    });

    it('should throw error for incorrect current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword(userId, currentPassword, newPassword))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.changePassword(userId, currentPassword, newPassword))
        .rejects.toThrow('User not found');
    });
  });
});
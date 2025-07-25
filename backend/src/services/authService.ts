import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  tenantId: string;
  role?: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  permissions: string[];
  twoFactorEnabled: boolean;
  lastLogin?: Date;
}

export interface DeviceInfo {
  userAgent?: string;
  ip: string;
  browser?: string;
  os?: string;
  device?: string;
  [key: string]: any; // Allow additional properties for JSON storage
}

export class AuthService {
  private prisma: PrismaClient;
  private redis: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.redis = getRedisClient();
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<UserProfile> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email_tenant_id: {
            email: data.email,
            tenant_id: data.tenantId,
          },
        },
      });

      if (existingUser) {
        throw createError('User already exists', 409, 'USER_EXISTS');
      }

      // Validate tenant exists
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: data.tenantId },
      });

      if (!tenant || !tenant.is_active) {
        throw createError('Invalid tenant', 400, 'INVALID_TENANT');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(data.password, saltRounds);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          password_hash: passwordHash,
          name: data.name,
          tenant_id: data.tenantId,
          role: data.role || UserRole.TENANT_EMPLOYEE,
          permissions: this.getDefaultPermissions(data.role || UserRole.TENANT_EMPLOYEE),
        },
      });

      logger.info(`User registered: ${user.email} for tenant: ${data.tenantId}`);

      return this.mapUserToProfile(user);
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user and return tokens
   */
  async login(credentials: LoginCredentials, deviceInfo: DeviceInfo): Promise<{ user: UserProfile; tokens: AuthTokens; requiresTwoFactor?: boolean }> {
    try {
      // Find user
      const user = await this.prisma.user.findFirst({
        where: {
          email: credentials.email,
          is_active: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!user || !user.tenant.is_active) {
        throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        const lockTimeRemaining = Math.ceil((user.locked_until.getTime() - Date.now()) / 1000 / 60);
        throw createError(
          `Account locked. Try again in ${lockTimeRemaining} minutes`,
          423,
          'ACCOUNT_LOCKED'
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
      
      if (!isPasswordValid) {
        await this.handleFailedLogin(user.id);
        throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check 2FA if enabled
      if (user.two_factor_enabled) {
        if (!credentials.twoFactorCode) {
          return {
            user: this.mapUserToProfile(user),
            tokens: {} as AuthTokens,
            requiresTwoFactor: true,
          };
        }

        const isValidTwoFactor = speakeasy.totp.verify({
          secret: user.two_factor_secret!,
          encoding: 'base32',
          token: credentials.twoFactorCode,
          window: 2, // Allow 2 time steps before/after
        });

        if (!isValidTwoFactor) {
          throw createError('Invalid two-factor code', 401, 'INVALID_2FA_CODE');
        }
      }

      // Reset failed login attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date(),
          last_login_ip: deviceInfo.ip,
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user, deviceInfo);

      logger.info(`User logged in: ${user.email} from IP: ${deviceInfo.ip}`);

      return {
        user: this.mapUserToProfile(user),
        tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string, deviceInfo: DeviceInfo): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

      // Find session
      const session = await this.prisma.userSession.findUnique({
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

      if (!session || session.expires_at < new Date()) {
        throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      if (!session.user.is_active || !session.user.tenant.is_active) {
        throw createError('User or tenant inactive', 401, 'USER_INACTIVE');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(session.user, deviceInfo);

      // Invalidate old refresh token
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { is_active: false },
      });

      logger.info(`Token refreshed for user: ${session.user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await this.prisma.userSession.updateMany({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      // Remove from Redis cache
      await this.redis.del(`session:${refreshToken}`);

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });

      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${user.tenant.name} (${user.email})`,
        issuer: 'Jewelry SaaS Platform',
        length: 32,
      });

      // Generate QR code
      const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

      // Save secret (not enabled yet)
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          two_factor_secret: secret.base32,
        },
      });

      logger.info(`2FA setup initiated for user: ${user.email}`);

      return {
        secret: secret.base32!,
        qrCode,
      };
    } catch (error) {
      logger.error('2FA setup failed:', error);
      throw error;
    }
  }

  /**
   * Verify and enable two-factor authentication
   */
  async verifyAndEnableTwoFactor(userId: string, token: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.two_factor_secret) {
        throw createError('2FA not set up', 400, 'TWO_FACTOR_NOT_SETUP');
      }

      // Verify token
      const isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!isValid) {
        throw createError('Invalid verification code', 400, 'INVALID_2FA_CODE');
      }

      // Enable 2FA
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          two_factor_enabled: true,
        },
      });

      logger.info(`2FA enabled for user: ${user.email}`);
    } catch (error) {
      logger.error('2FA verification failed:', error);
      throw error;
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId: string, password: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('Invalid password', 401, 'INVALID_PASSWORD');
      }

      // Disable 2FA
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          two_factor_enabled: false,
          two_factor_secret: null,
        },
      });

      logger.info(`2FA disabled for user: ${user.email}`);
    } catch (error) {
      logger.error('2FA disable failed:', error);
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await this.prisma.userSession.findMany({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: {
            gt: new Date(),
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return sessions.map(session => ({
        id: session.id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
      }));
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  /**
   * Revoke user session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    try {
      await this.prisma.userSession.updateMany({
        where: {
          id: sessionId,
          user_id: userId,
        },
        data: {
          is_active: false,
        },
      });

      logger.info(`Session revoked: ${sessionId} for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to revoke session:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: newPasswordHash,
        },
      });

      // Invalidate all sessions except current one
      await this.prisma.userSession.updateMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User, deviceInfo: DeviceInfo): Promise<AuthTokens> {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      permissions: user.permissions || [],
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.userSession.create({
      data: {
        user_id: user.id,
        session_id: this.generateSessionId(),
        refresh_token: refreshToken,
        device_info: deviceInfo as any,
        ip_address: deviceInfo.ip,
        expires_at: expiresAt,
      },
    });

    // Cache session in Redis
    await this.redis.setEx(
      `session:${refreshToken}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      JSON.stringify({ userId: user.id, tenantId: user.tenant_id })
    );

    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN?.replace('m', '') || '15') * 60; // Convert minutes to seconds

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const failedAttempts = user.failed_login_attempts + 1;
    const updateData: any = {
      failed_login_attempts: failedAttempts,
    };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Lock for 30 minutes
      updateData.locked_until = lockUntil;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.warn(`Failed login attempt ${failedAttempts} for user: ${user.email}`);
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      SUPER_ADMIN: ['*'], // All permissions
      TENANT_ADMIN: [
        'users.manage',
        'settings.manage',
        'reports.view',
        'invoices.manage',
        'customers.manage',
        'inventory.manage',
        'accounting.manage',
      ],
      TENANT_EMPLOYEE: [
        'invoices.create',
        'invoices.view',
        'customers.view',
        'inventory.view',
      ],
      CASHIER: [
        'invoices.create',
        'invoices.view',
        'customers.view',
        'inventory.view',
      ],
      ACCOUNTANT: [
        'invoices.view',
        'customers.view',
        'inventory.view',
        'accounting.manage',
        'reports.view',
      ],
    };

    return permissions[role] || [];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map User entity to UserProfile
   */
  private mapUserToProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      permissions: (user.permissions as string[]) || [],
      twoFactorEnabled: user.two_factor_enabled,
      lastLogin: user.last_login || undefined,
    };
  }
}
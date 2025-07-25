import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { TenantService } from '@/services/tenantService';

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  permissions?: string[];
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  permissions?: string[];
  is_active?: boolean;
}

export interface UserListFilters {
  search?: string;
  role?: UserRole;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface UserWithProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export class UserManagementService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new user within a tenant
   */
  async createUser(tenantId: string, userData: CreateUserData, createdBy: string): Promise<UserWithProfile> {
    try {
      // Validate tenant exists and is active
      await TenantService.validateTenant(tenantId);

      // Check if user already exists in this tenant
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email_tenant_id: {
            email: userData.email,
            tenant_id: tenantId,
          },
        },
      });

      if (existingUser) {
        throw createError('User already exists in this tenant', 409, 'USER_EXISTS');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Set default permissions if not provided
      const permissions = userData.permissions || this.getDefaultPermissions(userData.role);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          password_hash: passwordHash,
          name: userData.name,
          tenant_id: tenantId,
          role: userData.role,
          permissions: permissions,
        },
      });

      logger.info(`User created: ${user.email} in tenant: ${tenantId} by: ${createdBy}`);

      return this.mapUserToProfile(user);
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID within tenant
   */
  async getUserById(tenantId: string, userId: string): Promise<UserWithProfile | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenant_id: tenantId,
        },
      });

      return user ? this.mapUserToProfile(user) : null;
    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      throw error;
    }
  }

  /**
   * List users within a tenant with filtering and pagination
   */
  async listUsers(tenantId: string, filters: UserListFilters = {}): Promise<{
    users: UserWithProfile[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        tenant_id: tenantId,
      };

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.role) {
        where.role = filters.role;
      }

      if (typeof filters.is_active === 'boolean') {
        where.is_active = filters.is_active;
      }

      // Get total count
      const total = await this.prisma.user.count({ where });

      // Get users
      const users = await this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { created_at: 'desc' },
          { name: 'asc' },
        ],
      });

      return {
        users: users.map(user => this.mapUserToProfile(user)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(tenantId: string, userId: string, updateData: UpdateUserData, updatedBy: string): Promise<UserWithProfile> {
    try {
      // Check if user exists in tenant
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenant_id: tenantId,
        },
      });

      if (!existingUser) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prepare update data
      const updatePayload: any = {};

      if (updateData.name !== undefined) {
        updatePayload.name = updateData.name;
      }

      if (updateData.role !== undefined) {
        updatePayload.role = updateData.role;
        // Update permissions when role changes
        updatePayload.permissions = updateData.permissions || this.getDefaultPermissions(updateData.role);
      } else if (updateData.permissions !== undefined) {
        updatePayload.permissions = updateData.permissions;
      }

      if (updateData.is_active !== undefined) {
        updatePayload.is_active = updateData.is_active;
      }

      // Update user
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updatePayload,
      });

      logger.info(`User updated: ${user.email} in tenant: ${tenantId} by: ${updatedBy}`);

      return this.mapUserToProfile(user);
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(tenantId: string, userId: string, deletedBy: string): Promise<void> {
    try {
      // Check if user exists in tenant
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenant_id: tenantId,
        },
      });

      if (!existingUser) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Prevent deleting the last admin
      if (existingUser.role === UserRole.TENANT_ADMIN) {
        const adminCount = await this.prisma.user.count({
          where: {
            tenant_id: tenantId,
            role: UserRole.TENANT_ADMIN,
            is_active: true,
          },
        });

        if (adminCount <= 1) {
          throw createError('Cannot delete the last admin user', 400, 'LAST_ADMIN_USER');
        }
      }

      // Soft delete by deactivating
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          is_active: false,
        },
      });

      // Invalidate all user sessions
      await this.prisma.userSession.updateMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      logger.info(`User deleted: ${existingUser.email} in tenant: ${tenantId} by: ${deletedBy}`);
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(tenantId: string, userId: string, newPassword: string, resetBy: string): Promise<void> {
    try {
      // Check if user exists in tenant
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenant_id: tenantId,
        },
      });

      if (!existingUser) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: passwordHash,
          failed_login_attempts: 0,
          locked_until: null,
        },
      });

      // Invalidate all user sessions except current one
      await this.prisma.userSession.updateMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      logger.info(`Password reset for user: ${existingUser.email} in tenant: ${tenantId} by: ${resetBy}`);
    } catch (error) {
      logger.error('Failed to reset user password:', error);
      throw error;
    }
  }

  /**
   * Get user roles and permissions summary
   */
  async getUserRolesSummary(tenantId: string): Promise<{
    roles: Array<{
      role: UserRole;
      count: number;
      permissions: string[];
    }>;
    totalUsers: number;
    activeUsers: number;
  }> {
    try {
      // Get user counts by role
      const roleCounts = await this.prisma.user.groupBy({
        by: ['role'],
        where: {
          tenant_id: tenantId,
        },
        _count: {
          role: true,
        },
      });

      // Get total and active user counts
      const [totalUsers, activeUsers] = await Promise.all([
        this.prisma.user.count({
          where: { tenant_id: tenantId },
        }),
        this.prisma.user.count({
          where: { tenant_id: tenantId, is_active: true },
        }),
      ]);

      const roles = roleCounts.map(roleCount => ({
        role: roleCount.role,
        count: roleCount._count.role,
        permissions: this.getDefaultPermissions(roleCount.role),
      }));

      return {
        roles,
        totalUsers,
        activeUsers,
      };
    } catch (error) {
      logger.error('Failed to get user roles summary:', error);
      throw error;
    }
  }

  /**
   * Get default permissions for a role
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
   * Map User entity to UserWithProfile
   */
  private mapUserToProfile(user: User): UserWithProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: (user.permissions as string[]) || [],
      is_active: user.is_active,
      two_factor_enabled: user.two_factor_enabled,
      last_login: user.last_login || undefined,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
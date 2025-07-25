import { PrismaClient, UserRole } from '@prisma/client';
import { UserManagementService, CreateUserData, UpdateUserData } from '@/services/userManagementService';
import { TenantService } from '@/services/tenantService';

// Mock dependencies
jest.mock('@/services/tenantService');
jest.mock('@/utils/logger');
jest.mock('bcryptjs');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn(),
  },
  userSession: {
    updateMany: jest.fn(),
  },
} as unknown as PrismaClient;

const mockTenantService = TenantService as jest.Mocked<typeof TenantService>;

describe('UserManagementService', () => {
  let userManagementService: UserManagementService;

  beforeEach(() => {
    userManagementService = new UserManagementService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const tenantId = 'tenant-123';
    const userData: CreateUserData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
      role: UserRole.TENANT_EMPLOYEE,
    };
    const createdBy = 'admin-123';

    it('should create a new user successfully', async () => {
      // Mock tenant validation
      mockTenantService.validateTenant.mockResolvedValue({
        id: tenantId,
        name: 'Test Tenant',
        subdomain: 'test',
        schema_name: 'tenant_test',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      });

      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Mock user creation
      const mockCreatedUser = {
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenant_id: tenantId,
        permissions: ['invoices.create', 'invoices.view', 'customers.view', 'inventory.view'],
        is_active: true,
        two_factor_enabled: false,
        password_hash: 'hashed-password',
        last_login: null,
        created_at: new Date(),
        updated_at: new Date(),
        failed_login_attempts: 0,
        locked_until: null,
        two_factor_secret: null,
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await userManagementService.createUser(tenantId, userData, createdBy);

      expect(mockTenantService.validateTenant).toHaveBeenCalledWith(tenantId);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email_tenant_id: {
            email: userData.email,
            tenant_id: tenantId,
          },
        },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          password_hash: expect.any(String),
          name: userData.name,
          tenant_id: tenantId,
          role: userData.role,
          permissions: expect.any(Array),
        },
      });
      expect(result).toEqual({
        id: mockCreatedUser.id,
        email: mockCreatedUser.email,
        name: mockCreatedUser.name,
        role: mockCreatedUser.role,
        permissions: mockCreatedUser.permissions,
        is_active: mockCreatedUser.is_active,
        two_factor_enabled: mockCreatedUser.two_factor_enabled,
        last_login: undefined,
        created_at: mockCreatedUser.created_at,
        updated_at: mockCreatedUser.updated_at,
      });
    });

    it('should throw error if user already exists', async () => {
      mockTenantService.validateTenant.mockResolvedValue({
        id: tenantId,
        name: 'Test Tenant',
        subdomain: 'test',
        schema_name: 'tenant_test',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      });

      // Mock user already exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: userData.email,
        tenant_id: tenantId,
      } as any);

      await expect(
        userManagementService.createUser(tenantId, userData, createdBy)
      ).rejects.toThrow('User already exists in this tenant');
    });
  });

  describe('listUsers', () => {
    const tenantId = 'tenant-123';

    it('should list users with pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: UserRole.TENANT_EMPLOYEE,
          permissions: [],
          is_active: true,
          two_factor_enabled: false,
          last_login: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: UserRole.CASHIER,
          permissions: [],
          is_active: true,
          two_factor_enabled: true,
          last_login: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await userManagementService.listUsers(tenantId, {
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
        skip: 0,
        take: 20,
        orderBy: [
          { created_at: 'desc' },
          { name: 'asc' },
        ],
      });
      expect(result.users).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter users by search term', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await userManagementService.listUsers(tenantId, {
        search: 'john',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          tenant_id: tenantId,
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('should filter users by role', async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await userManagementService.listUsers(tenantId, {
        role: UserRole.TENANT_ADMIN,
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          tenant_id: tenantId,
          role: UserRole.TENANT_ADMIN,
        },
      });
    });
  });

  describe('updateUser', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const updatedBy = 'admin-123';

    it('should update user successfully', async () => {
      const existingUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Old Name',
        role: UserRole.TENANT_EMPLOYEE,
        tenant_id: tenantId,
        is_active: true,
      };

      const updateData: UpdateUserData = {
        name: 'New Name',
        role: UserRole.CASHIER,
        is_active: true,
      };

      const updatedUser = {
        ...existingUser,
        ...updateData,
        permissions: ['invoices.create', 'invoices.view', 'customers.view', 'inventory.view'],
        updated_at: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser as any);
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      const result = await userManagementService.updateUser(tenantId, userId, updateData, updatedBy);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: userId,
          tenant_id: tenantId,
        },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: updateData.name,
          role: updateData.role,
          permissions: expect.any(Array),
          is_active: updateData.is_active,
        },
      });
      expect(result.name).toBe(updateData.name);
      expect(result.role).toBe(updateData.role);
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        userManagementService.updateUser(tenantId, userId, { name: 'New Name' }, updatedBy)
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const deletedBy = 'admin-123';

    it('should delete user successfully', async () => {
      const existingUser = {
        id: userId,
        email: 'user@example.com',
        name: 'User Name',
        role: UserRole.TENANT_EMPLOYEE,
        tenant_id: tenantId,
        is_active: true,
      };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser as any);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, is_active: false } as any);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 } as any);

      await userManagementService.deleteUser(tenantId, userId, deletedBy);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { is_active: false },
      });
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: { is_active: false },
      });
    });

    it('should prevent deleting the last admin user', async () => {
      const existingUser = {
        id: userId,
        email: 'admin@example.com',
        name: 'Admin User',
        role: UserRole.TENANT_ADMIN,
        tenant_id: tenantId,
        is_active: true,
      };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser as any);
      mockPrisma.user.count.mockResolvedValue(1); // Only one admin

      await expect(
        userManagementService.deleteUser(tenantId, userId, deletedBy)
      ).rejects.toThrow('Cannot delete the last admin user');
    });
  });

  describe('getUserRolesSummary', () => {
    const tenantId = 'tenant-123';

    it('should return roles summary', async () => {
      const mockRoleCounts = [
        { role: UserRole.TENANT_ADMIN, _count: { role: 1 } },
        { role: UserRole.TENANT_EMPLOYEE, _count: { role: 3 } },
        { role: UserRole.CASHIER, _count: { role: 2 } },
      ];

      mockPrisma.user.groupBy.mockResolvedValue(mockRoleCounts as any);
      mockPrisma.user.count
        .mockResolvedValueOnce(6) // total users
        .mockResolvedValueOnce(5); // active users

      const result = await userManagementService.getUserRolesSummary(tenantId);

      expect(result.totalUsers).toBe(6);
      expect(result.activeUsers).toBe(5);
      expect(result.roles).toHaveLength(3);
      expect(result.roles[0]).toEqual({
        role: UserRole.TENANT_ADMIN,
        count: 1,
        permissions: expect.any(Array),
      });
    });
  });
});
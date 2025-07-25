import { TenantMigrationManager, Migration } from '@/utils/tenantMigrations';
import { TenantService } from '@/services/tenantService';
import { getPrismaClient } from '@/config/database';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@/services/tenantService');
jest.mock('@/config/database');
jest.mock('@/utils/logger');

const mockTenantService = TenantService as jest.Mocked<typeof TenantService>;
const mockGetPrismaClient = getPrismaClient as jest.Mock;

const mockPrisma = {
  tenantMigration: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  },
  tenant: {
    findMany: jest.fn(),
  },
  $executeRawUnsafe: jest.fn(),
} as any;

describe('TenantMigrationManager', () => {
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
    jest.clearAllMocks();
    mockGetPrismaClient.mockReturnValue(mockPrisma);
    
    // Clear registered migrations
    (TenantMigrationManager as any).migrations = [];
  });

  describe('registerMigration', () => {
    it('should register a migration', () => {
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration description',
        up: jest.fn(),
        down: jest.fn(),
      };

      TenantMigrationManager.registerMigration(migration);

      const migrations = TenantMigrationManager.getMigrations();
      expect(migrations).toHaveLength(1);
      expect(migrations[0]).toEqual(migration);
    });

    it('should sort migrations by version', () => {
      const migration1: Migration = {
        version: 'v1.2.0',
        name: 'Migration 2',
        description: 'Second migration',
        up: jest.fn(),
      };

      const migration2: Migration = {
        version: 'v1.1.0',
        name: 'Migration 1',
        description: 'First migration',
        up: jest.fn(),
      };

      TenantMigrationManager.registerMigration(migration1);
      TenantMigrationManager.registerMigration(migration2);

      const migrations = TenantMigrationManager.getMigrations();
      expect(migrations).toHaveLength(2);
      expect(migrations[0].version).toBe('v1.1.0');
      expect(migrations[1].version).toBe('v1.2.0');
    });
  });

  describe('runMigrations', () => {
    it('should run pending migrations for a tenant', async () => {
      const upMock = jest.fn().mockResolvedValue(undefined);
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: upMock,
      };

      TenantMigrationManager.registerMigration(migration);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValueOnce([]);
      (mockPrisma.tenantMigration.create as jest.Mock).mockResolvedValueOnce({});

      await TenantMigrationManager.runMigrations('tenant-123');

      expect(mockTenantService.validateTenant).toHaveBeenCalledWith('tenant-123');
      expect(upMock).toHaveBeenCalledWith('tenant_teststore', mockPrisma);
      expect(mockPrisma.tenantMigration.create).toHaveBeenCalledWith({
        data: {
          tenant_id: 'tenant-123',
          migration: 'v1.0.0',
        },
      });
    });

    it('should skip already executed migrations', async () => {
      const upMock = jest.fn().mockResolvedValue(undefined);
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: upMock,
      };

      TenantMigrationManager.registerMigration(migration);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValueOnce([
        { migration: 'v1.0.0' }
      ]);

      await TenantMigrationManager.runMigrations('tenant-123');

      expect(upMock).not.toHaveBeenCalled();
      expect(mockPrisma.tenantMigration.create).not.toHaveBeenCalled();
    });

    it('should handle migration failures', async () => {
      const error = new Error('Migration failed');
      const upMock = jest.fn().mockRejectedValueOnce(error);
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: upMock,
      };

      TenantMigrationManager.registerMigration(migration);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValueOnce([]);

      await expect(TenantMigrationManager.runMigrations('tenant-123')).rejects.toThrow('Migration v1.0.0 failed');
    });

    it('should run multiple migrations in order', async () => {
      const upMock1 = jest.fn().mockResolvedValue(undefined);
      const upMock2 = jest.fn().mockResolvedValue(undefined);

      const migration1: Migration = {
        version: 'v1.1.0',
        name: 'Migration 1',
        description: 'First migration',
        up: upMock1,
      };

      const migration2: Migration = {
        version: 'v1.2.0',
        name: 'Migration 2',
        description: 'Second migration',
        up: upMock2,
      };

      TenantMigrationManager.registerMigration(migration2);
      TenantMigrationManager.registerMigration(migration1);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValueOnce([]);
      (mockPrisma.tenantMigration.create as jest.Mock).mockResolvedValue({});

      await TenantMigrationManager.runMigrations('tenant-123');

      // Verify both migrations were called
      expect(upMock1).toHaveBeenCalled();
      expect(upMock2).toHaveBeenCalled();
      expect(mockPrisma.tenantMigration.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('runMigrationsForAllTenants', () => {
    it('should run migrations for all active tenants', async () => {
      const upMock = jest.fn().mockResolvedValue(undefined);
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: upMock,
      };

      TenantMigrationManager.registerMigration(migration);

      const tenants = [
        { id: 'tenant-1', name: 'Store 1' },
        { id: 'tenant-2', name: 'Store 2' },
      ];

      (mockPrisma.tenant.findMany as jest.Mock).mockResolvedValueOnce(tenants);
      mockTenantService.validateTenant
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-1' })
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-2' });
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.tenantMigration.create as jest.Mock).mockResolvedValue({});

      await TenantMigrationManager.runMigrationsForAllTenants();

      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        select: { id: true, name: true },
      });
      expect(upMock).toHaveBeenCalledTimes(2);
    });

    it('should continue with other tenants if one fails', async () => {
      const upMock = jest.fn()
        .mockRejectedValueOnce(new Error('Migration failed'))
        .mockResolvedValueOnce(undefined);

      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: upMock,
      };

      TenantMigrationManager.registerMigration(migration);

      const tenants = [
        { id: 'tenant-1', name: 'Store 1' },
        { id: 'tenant-2', name: 'Store 2' },
      ];

      (mockPrisma.tenant.findMany as jest.Mock).mockResolvedValueOnce(tenants);
      mockTenantService.validateTenant
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-1' })
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-2' });
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.tenantMigration.create as jest.Mock).mockResolvedValue({});

      await expect(TenantMigrationManager.runMigrationsForAllTenants()).resolves.not.toThrow();
      expect(upMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback specified migration', async () => {
      const downMock = jest.fn().mockResolvedValue(undefined);
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: jest.fn(),
        down: downMock,
      };

      TenantMigrationManager.registerMigration(migration);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.deleteMany as jest.Mock).mockResolvedValueOnce({});

      await TenantMigrationManager.rollbackMigration('tenant-123', 'v1.0.0');

      expect(downMock).toHaveBeenCalledWith('tenant_teststore', mockPrisma);
      expect(mockPrisma.tenantMigration.deleteMany).toHaveBeenCalledWith({
        where: {
          tenant_id: 'tenant-123',
          migration: 'v1.0.0',
        },
      });
    });

    it('should rollback last migration if no version specified', async () => {
      const downMock = jest.fn().mockResolvedValue(undefined);
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: jest.fn(),
        down: downMock,
      };

      TenantMigrationManager.registerMigration(migration);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.findFirst as jest.Mock).mockResolvedValueOnce({
        migration: 'v1.0.0',
      });
      (mockPrisma.tenantMigration.deleteMany as jest.Mock).mockResolvedValueOnce({});

      await TenantMigrationManager.rollbackMigration('tenant-123');

      expect(mockPrisma.tenantMigration.findFirst).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-123' },
        orderBy: { executed_at: 'desc' },
      });
      expect(downMock).toHaveBeenCalled();
    });

    it('should throw error if migration does not support rollback', async () => {
      const migration: Migration = {
        version: 'v1.0.0',
        name: 'Test Migration',
        description: 'Test migration',
        up: jest.fn(),
        // No down method
      };

      TenantMigrationManager.registerMigration(migration);

      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await expect(
        TenantMigrationManager.rollbackMigration('tenant-123', 'v1.0.0')
      ).rejects.toThrow('Migration v1.0.0 does not support rollback');
    });

    it('should throw error if no migrations to rollback', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrisma.tenantMigration.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        TenantMigrationManager.rollbackMigration('tenant-123')
      ).rejects.toThrow('No migrations to rollback');
    });
  });

  describe('getMigrationStatus', () => {
    it('should return migration status for tenant', async () => {
      const migration1: Migration = {
        version: 'v1.0.0',
        name: 'Migration 1',
        description: 'First migration',
        up: jest.fn(),
      };

      const migration2: Migration = {
        version: 'v1.1.0',
        name: 'Migration 2',
        description: 'Second migration',
        up: jest.fn(),
      };

      TenantMigrationManager.registerMigration(migration1);
      TenantMigrationManager.registerMigration(migration2);

      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValueOnce([
        { migration: 'v1.0.0' }
      ]);

      const status = await TenantMigrationManager.getMigrationStatus('tenant-123');

      expect(status).toEqual({
        executed: ['v1.0.0'],
        pending: ['v1.1.0'],
        total: 2,
      });
    });

    it('should handle empty migration list', async () => {
      (mockPrisma.tenantMigration.findMany as jest.Mock).mockResolvedValueOnce([]);

      const status = await TenantMigrationManager.getMigrationStatus('tenant-123');

      expect(status).toEqual({
        executed: [],
        pending: [],
        total: 0,
      });
    });
  });
});
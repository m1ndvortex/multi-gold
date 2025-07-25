import { TenantService } from '@/services/tenantService';
import { getPrismaClient } from '@/config/database';
import { PrismaClient } from '@prisma/client';

// Mock the database connection
jest.mock('@/config/database');
jest.mock('@/utils/logger');

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  tenantMigration: {
    create: jest.fn(),
  },
  $executeRawUnsafe: jest.fn(),
} as any;

(getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

describe('TenantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TenantService.clearCache();
  });

  describe('getTenant', () => {
    it('should find tenant by ID', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValueOnce(mockTenant);

      const result = await TenantService.getTenant('tenant-123');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-123' },
        select: {
          id: true,
          name: true,
          subdomain: true,
          schema_name: true,
          subscription_plan: true,
          status: true,
          is_active: true,
        },
      });
    });

    it('should find tenant by subdomain if ID not found', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First call by ID returns null
        .mockResolvedValueOnce(mockTenant); // Second call by subdomain returns tenant

      const result = await TenantService.getTenant('teststore');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should return null if tenant not found', async () => {
      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await TenantService.getTenant('nonexistent');

      expect(result).toBeNull();
    });

    it('should cache tenant information', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValueOnce(mockTenant);

      // First call
      await TenantService.getTenant('tenant-123');
      
      // Second call should use cache
      const result = await TenantService.getTenant('tenant-123');

      expect(result).toEqual(mockTenant);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateTenant', () => {
    it('should return tenant if active', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValueOnce(mockTenant);

      const result = await TenantService.validateTenant('tenant-123');

      expect(result).toEqual(mockTenant);
    });

    it('should throw error if tenant not found', async () => {
      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TenantService.validateTenant('nonexistent')).rejects.toThrow('Tenant not found');
    });

    it('should throw error if tenant is inactive', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: false,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValueOnce(mockTenant);

      await expect(TenantService.validateTenant('tenant-123')).rejects.toThrow('Tenant is inactive');
    });

    it('should throw error if tenant is suspended', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'SUSPENDED',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValueOnce(mockTenant);

      await expect(TenantService.validateTenant('tenant-123')).rejects.toThrow('Tenant account is suspended');
    });

    it('should throw error if tenant subscription expired', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Jewelry Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'EXPIRED',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValueOnce(mockTenant);

      await expect(TenantService.validateTenant('tenant-123')).rejects.toThrow('Tenant subscription has expired');
    });
  });

  describe('createTenant', () => {
    it('should create tenant with schema', async () => {
      const tenantData = {
        name: 'New Jewelry Store',
        subdomain: 'newstore',
        contact_email: 'owner@newstore.com',
        contact_phone: '+1234567890',
      };

      const mockCreatedTenant = {
        id: 'tenant-456',
        name: 'New Jewelry Store',
        subdomain: 'newstore',
        schema_name: 'tenant_newstore',
        subscription_plan: 'BASIC',
        status: 'TRIAL',
        is_active: true,
      };

      (mockPrisma.tenant.create as jest.Mock).mockResolvedValueOnce(mockCreatedTenant);
      (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);
      (mockPrisma.tenantMigration.create as jest.Mock).mockResolvedValue(undefined);

      const result = await TenantService.createTenant(tenantData);

      expect(result).toEqual(mockCreatedTenant);
      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: {
          name: tenantData.name,
          subdomain: tenantData.subdomain,
          schema_name: 'tenant_newstore',
          contact_email: tenantData.contact_email,
          contact_phone: tenantData.contact_phone,
          subscription_plan: 'BASIC',
          status: 'TRIAL',
          trial_ends_at: expect.any(Date),
        },
        select: {
          id: true,
          name: true,
          subdomain: true,
          schema_name: true,
          subscription_plan: true,
          status: true,
          is_active: true,
        },
      });

      // Verify schema creation was called
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'CREATE SCHEMA IF NOT EXISTS `tenant_newstore`'
      );
    });

    it('should generate correct schema name from subdomain', async () => {
      const tenantData = {
        name: 'Test Store',
        subdomain: 'test-store-123',
        contact_email: 'test@example.com',
      };

      const mockCreatedTenant = {
        id: 'tenant-789',
        name: 'Test Store',
        subdomain: 'test-store-123',
        schema_name: 'tenant_test_store_123',
        subscription_plan: 'BASIC',
        status: 'TRIAL',
        is_active: true,
      };

      (mockPrisma.tenant.create as jest.Mock).mockResolvedValueOnce(mockCreatedTenant);
      (mockPrisma.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);
      (mockPrisma.tenantMigration.create as jest.Mock).mockResolvedValue(undefined);

      await TenantService.createTenant(tenantData);

      expect(mockPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schema_name: 'tenant_test_store_123',
          }),
        })
      );
    });
  });

  describe('cache management', () => {
    it('should clear specific tenant from cache', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      // Cache the tenant
      await TenantService.getTenant('tenant-123');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);

      // Clear cache for specific tenant
      TenantService.clearCache('tenant-123');

      // Next call should hit database again
      await TenantService.getTenant('tenant-123');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Store',
        subdomain: 'teststore',
        schema_name: 'tenant_teststore',
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        is_active: true,
      };

      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      // Cache the tenant (this will make 1 call and cache by id, subdomain)
      await TenantService.getTenant('tenant-123');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(1);

      // Clear all cache
      TenantService.clearCache();

      // Next call should hit database again
      await TenantService.getTenant('tenant-123');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
import { PrismaClient } from '@prisma/client';
import { TenantSettingsService, TenantSettings } from '@/services/tenantSettingsService';

// Mock dependencies
jest.mock('@/utils/logger');

const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('TenantSettingsService', () => {
  let tenantSettingsService: TenantSettingsService;

  beforeEach(() => {
    tenantSettingsService = new TenantSettingsService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getTenantProfile', () => {
    const tenantId = 'tenant-123';

    it('should return tenant profile successfully', async () => {
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        subdomain: 'test',
        contact_email: 'test@example.com',
        contact_phone: '+1234567890',
        subscription_plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        trial_ends_at: null,
        is_active: true,
        settings: {
          business: {
            name: 'Test Business',
            contact: {
              email: 'test@example.com',
              phone: '+1234567890',
            },
          },
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await tenantSettingsService.getTenantProfile(tenantId);

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
      expect(result).toEqual({
        id: mockTenant.id,
        name: mockTenant.name,
        subdomain: mockTenant.subdomain,
        contact_email: mockTenant.contact_email,
        contact_phone: mockTenant.contact_phone,
        subscription_plan: mockTenant.subscription_plan,
        status: mockTenant.status,
        trial_ends_at: undefined,
        is_active: mockTenant.is_active,
        settings: expect.any(Object),
        created_at: mockTenant.created_at,
        updated_at: mockTenant.updated_at,
      });
    });

    it('should throw error if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        tenantSettingsService.getTenantProfile(tenantId)
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('updateTenantInfo', () => {
    const tenantId = 'tenant-123';
    const updatedBy = 'admin-123';

    it('should update tenant info successfully', async () => {
      const existingTenant = {
        id: tenantId,
        name: 'Old Name',
        contact_email: 'old@example.com',
        contact_phone: null,
        address: null,
      };

      const updateData = {
        name: 'New Name',
        contact_email: 'new@example.com',
        contact_phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'Test City',
        },
      };

      const updatedTenant = {
        ...existingTenant,
        ...updateData,
        updated_at: new Date(),
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      mockPrisma.tenant.update.mockResolvedValue(updatedTenant as any);

      const result = await tenantSettingsService.updateTenantInfo(tenantId, updateData, updatedBy);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          name: updateData.name,
          contact_email: updateData.contact_email,
          contact_phone: updateData.contact_phone,
          address: updateData.address,
        },
      });
      expect(result.name).toBe(updateData.name);
      expect(result.contact_email).toBe(updateData.contact_email);
    });
  });

  describe('updateTenantSettings', () => {
    const tenantId = 'tenant-123';
    const updatedBy = 'admin-123';

    it('should update tenant settings successfully', async () => {
      const existingTenant = {
        id: tenantId,
        settings: {
          business: {
            name: 'Old Business Name',
          },
          financial: {
            default_currency: 'USD',
          },
        },
      };

      const settingsUpdate: Partial<TenantSettings> = {
        business: {
          name: 'New Business Name',
          logo: 'https://example.com/logo.png',
          address: {
            street: '123 Main St',
          },
          contact: {
            email: 'contact@example.com',
          },
          tax_info: {
            tax_id: '123456789',
          },
        },
        financial: {
          default_currency: 'IRR',
          gold_pricing: {
            default_markup_percentage: 15,
            auto_update_prices: true,
          },
          tax_settings: {
            default_tax_rate: 9,
            tax_inclusive: false,
          },
          payment_terms: {
            default_payment_days: 30,
            late_fee_percentage: 2,
          },
        },
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(existingTenant as any);
      mockPrisma.tenant.update.mockResolvedValue({
        ...existingTenant,
        settings: expect.any(Object),
      } as any);

      const result = await tenantSettingsService.updateTenantSettings(
        tenantId,
        settingsUpdate,
        updatedBy
      );

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          settings: expect.any(Object),
        },
      });
      expect(result).toBeDefined();
    });

    it('should validate settings before updating', async () => {
      const existingTenant = {
        id: tenantId,
        settings: {},
      };

      const invalidSettings: Partial<TenantSettings> = {
        business: {
          name: '', // Invalid: empty name
          contact: {},
          tax_info: {},
        },
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(existingTenant as any);

      await expect(
        tenantSettingsService.updateTenantSettings(tenantId, invalidSettings, updatedBy)
      ).rejects.toThrow('Business name is required');
    });
  });

  describe('resetTenantSettings', () => {
    const tenantId = 'tenant-123';
    const resetBy = 'admin-123';

    it('should reset tenant settings to defaults', async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        id: tenantId,
        settings: expect.any(Object),
      } as any);

      const result = await tenantSettingsService.resetTenantSettings(tenantId, resetBy);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          settings: expect.any(Object),
        },
      });
      expect(result).toBeDefined();
      expect(result.business).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.notifications).toBeDefined();
      expect(result.features).toBeDefined();
      expect(result.customization).toBeDefined();
    });
  });

  describe('getTenantSubscription', () => {
    const tenantId = 'tenant-123';

    it('should return subscription info for BASIC plan', async () => {
      const mockTenant = {
        subscription_plan: 'BASIC',
        status: 'ACTIVE',
        trial_ends_at: null,
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await tenantSettingsService.getTenantSubscription(tenantId);

      expect(result).toEqual({
        plan: 'BASIC',
        status: 'ACTIVE',
        trial_ends_at: undefined,
        features: [
          'invoicing',
          'customer_management',
          'basic_inventory',
          'basic_reports',
        ],
        limits: {
          users: 3,
          storage_gb: 1,
          api_calls_per_month: 1000,
        },
      });
    });

    it('should return subscription info for PROFESSIONAL plan', async () => {
      const mockTenant = {
        subscription_plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        trial_ends_at: null,
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await tenantSettingsService.getTenantSubscription(tenantId);

      expect(result).toEqual({
        plan: 'PROFESSIONAL',
        status: 'ACTIVE',
        trial_ends_at: undefined,
        features: [
          'invoicing',
          'customer_management',
          'advanced_inventory',
          'accounting_module',
          'advanced_reports',
          'multi_currency',
          'api_access',
        ],
        limits: {
          users: 10,
          storage_gb: 10,
          api_calls_per_month: 10000,
        },
      });
    });

    it('should return subscription info for ENTERPRISE plan', async () => {
      const mockTenant = {
        subscription_plan: 'ENTERPRISE',
        status: 'TRIAL',
        trial_ends_at: new Date('2024-12-31'),
      };

      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant as any);

      const result = await tenantSettingsService.getTenantSubscription(tenantId);

      expect(result).toEqual({
        plan: 'ENTERPRISE',
        status: 'TRIAL',
        trial_ends_at: new Date('2024-12-31'),
        features: [
          'invoicing',
          'customer_management',
          'advanced_inventory',
          'accounting_module',
          'advanced_reports',
          'multi_currency',
          'api_access',
          'custom_integrations',
          'priority_support',
          'advanced_security',
        ],
        limits: {
          users: -1, // Unlimited
          storage_gb: 100,
          api_calls_per_month: 100000,
        },
      });
    });
  });

  describe('updateTenantLogo', () => {
    const tenantId = 'tenant-123';
    const logoUrl = 'https://example.com/logo.png';
    const updatedBy = 'admin-123';

    it('should update tenant logo successfully', async () => {
      mockPrisma.tenant.update.mockResolvedValue({
        id: tenantId,
        logo: logoUrl,
      } as any);

      await tenantSettingsService.updateTenantLogo(tenantId, logoUrl, updatedBy);

      expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: { logo: logoUrl },
      });
    });
  });
});
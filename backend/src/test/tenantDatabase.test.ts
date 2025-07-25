import { TenantDatabase } from '@/utils/tenantDatabase';
import { TenantService } from '@/services/tenantService';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@/services/tenantService');
jest.mock('@/utils/logger');

const mockTenantService = TenantService as jest.Mocked<typeof TenantService>;

const mockPrismaClient = {
  $executeRawUnsafe: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
} as unknown as PrismaClient;

// Mock PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

describe('TenantDatabase', () => {
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
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test_db';
  });

  afterEach(async () => {
    await TenantDatabase.cleanup();
  });

  describe('getConnection', () => {
    it('should create and return tenant connection', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);

      const connection = await TenantDatabase.getConnection('tenant-123');

      expect(connection).toBe(mockPrismaClient);
      expect(mockTenantService.validateTenant).toHaveBeenCalledWith('tenant-123');
      expect(mockPrismaClient.$executeRawUnsafe).toHaveBeenCalledWith('USE `tenant_teststore`');
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
    });

    it('should return cached connection on subsequent calls', async () => {
      mockTenantService.validateTenant.mockResolvedValue(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValue(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      // First call
      const connection1 = await TenantDatabase.getConnection('tenant-123');
      
      // Second call should return cached connection
      const connection2 = await TenantDatabase.getConnection('tenant-123');

      expect(connection1).toBe(connection2);
      expect(mockTenantService.validateTenant).toHaveBeenCalledTimes(1);
    });

    it('should throw error if tenant validation fails', async () => {
      const error = new Error('Tenant not found');
      mockTenantService.validateTenant.mockRejectedValueOnce(error);

      await expect(TenantDatabase.getConnection('invalid-tenant')).rejects.toThrow('Tenant not found');
    });

    it('should throw error if DATABASE_URL is not configured', async () => {
      delete process.env.DATABASE_URL;
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);

      await expect(TenantDatabase.getConnection('tenant-123')).rejects.toThrow('Database URL not configured');
    });
  });

  describe('executeInTenantContext', () => {
    it('should execute operation with tenant connection', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);

      const mockOperation = jest.fn().mockResolvedValueOnce('operation result');

      const result = await TenantDatabase.executeInTenantContext('tenant-123', mockOperation);

      expect(result).toBe('operation result');
      expect(mockOperation).toHaveBeenCalledWith(mockPrismaClient);
    });

    it('should propagate operation errors', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);

      const operationError = new Error('Operation failed');
      const mockOperation = jest.fn().mockRejectedValueOnce(operationError);

      await expect(
        TenantDatabase.executeInTenantContext('tenant-123', mockOperation)
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('executeRawInTenant', () => {
    it('should execute raw SQL with tenant schema context', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      const query = 'SELECT * FROM customers';
      await TenantDatabase.executeRawInTenant('tenant-123', query);

      expect(mockPrismaClient.$executeRawUnsafe).toHaveBeenCalledWith(
        'USE `tenant_teststore`; SELECT * FROM customers'
      );
    });

    it('should execute raw SQL with parameters', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      const query = 'SELECT * FROM customers WHERE id = ?';
      const params = ['customer-123'];
      
      await TenantDatabase.executeRawInTenant('tenant-123', query, params);

      expect(mockPrismaClient.$executeRawUnsafe).toHaveBeenCalledWith(
        'USE `tenant_teststore`; SELECT * FROM customers WHERE id = ?',
        'customer-123'
      );
    });

    it('should not modify query if it already contains USE statement', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      const query = 'USE `other_schema`; SELECT * FROM customers';
      await TenantDatabase.executeRawInTenant('tenant-123', query);

      expect(mockPrismaClient.$executeRawUnsafe).toHaveBeenCalledWith(query);
    });
  });

  describe('healthCheck', () => {
    it('should return true for healthy connection', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$queryRaw as jest.Mock).mockResolvedValueOnce([{ '1': 1 }]);

      const isHealthy = await TenantDatabase.healthCheck('tenant-123');

      expect(isHealthy).toBe(true);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should return false for unhealthy connection', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const isHealthy = await TenantDatabase.healthCheck('tenant-123');

      expect(isHealthy).toBe(false);
    });
  });

  describe('getTenantStats', () => {
    it('should return tenant database statistics', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
      
      // Mock the statistics queries
      (mockPrismaClient.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ count: 5 }]) // table count
        .mockResolvedValueOnce([{ total_records: 1000 }]) // total records
        .mockResolvedValueOnce([{ size_mb: 25.5 }]); // schema size

      const stats = await TenantDatabase.getTenantStats('tenant-123');

      expect(stats).toEqual({
        tables: 5,
        totalRecords: 1000,
        schemaSize: '25.5 MB',
      });

      expect(mockPrismaClient.$queryRawUnsafe).toHaveBeenCalledTimes(3);
    });

    it('should handle missing statistics gracefully', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
      
      // Mock empty results
      (mockPrismaClient.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([]) // empty table count
        .mockResolvedValueOnce([{}]) // empty records
        .mockResolvedValueOnce([{}]); // empty size

      const stats = await TenantDatabase.getTenantStats('tenant-123');

      expect(stats).toEqual({
        tables: 0,
        totalRecords: 0,
        schemaSize: '0 MB',
      });
    });
  });

  describe('cleanup', () => {
    it('should disconnect all cached connections', async () => {
      mockTenantService.validateTenant.mockResolvedValue(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValue(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);
      (mockPrismaClient.$disconnect as jest.Mock).mockResolvedValue(undefined);

      // Create some connections
      await TenantDatabase.getConnection('tenant-123');
      await TenantDatabase.getConnection('tenant-456');

      await TenantDatabase.cleanup();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(2);
    });

    it('should handle disconnect errors gracefully', async () => {
      mockTenantService.validateTenant.mockResolvedValueOnce(mockTenant);
      (mockPrismaClient.$connect as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$executeRawUnsafe as jest.Mock).mockResolvedValueOnce(undefined);
      (mockPrismaClient.$disconnect as jest.Mock).mockRejectedValueOnce(new Error('Disconnect failed'));

      // Create a connection
      await TenantDatabase.getConnection('tenant-123');

      // Cleanup should not throw even if disconnect fails
      await expect(TenantDatabase.cleanup()).resolves.not.toThrow();
    });
  });
});
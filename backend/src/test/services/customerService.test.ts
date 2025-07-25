import { CustomerService, CreateCustomerData, UpdateCustomerData, CustomerSearchFilters } from '../../services/customerService';
import { CustomerGroup, CustomerStatus, LedgerEntryType } from '@prisma/client';
import { TenantDatabase } from '../../utils/tenantDatabase';
import { Decimal } from '@prisma/client/runtime/library';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the tenant database utility
jest.mock('../../utils/tenantDatabase');
const mockTenantDatabase = TenantDatabase as jest.MockedClass<typeof TenantDatabase>;

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockPrisma: any;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      customer: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      customerLedgerEntry: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      customerTag: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      customerImportLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockTenantDatabase.getConnection = jest.fn().mockResolvedValue(mockPrisma);
    customerService = new CustomerService(tenantId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a customer with auto-generated customer code', async () => {
      const customerData: CreateCustomerData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        customer_group: CustomerGroup.REGULAR,
        credit_limit: 1000,
        opening_balance: 500
      };

      const mockCustomer = {
        id: 'customer-id',
        customer_code: 'CUS000001',
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        customer_group: customerData.customer_group,
        credit_limit: new Decimal(customerData.credit_limit || 0),
        opening_balance: new Decimal(customerData.opening_balance || 0),
        current_balance: new Decimal(customerData.opening_balance || 0),
        tenant_id: tenantId,
        created_by: userId
      };

      // Mock finding last customer for code generation
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);
      mockPrisma.customer.create.mockResolvedValueOnce(mockCustomer);
      
      // Mock the customer lookup in createLedgerEntry (for opening balance)
      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrisma.$transaction.mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          customerLedgerEntry: {
            create: jest.fn().mockResolvedValue({})
          },
          customer: {
            update: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx);
      });

      const result = await customerService.createCustomer(tenantId, customerData, userId);

      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: tenantId,
          customer_code: 'CUS000001',
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          customer_group: CustomerGroup.REGULAR,
          credit_limit: new Decimal(1000),
          opening_balance: new Decimal(500),
          current_balance: new Decimal(500),
          created_by: userId
        })
      });

      expect(result).toEqual(mockCustomer);
    });

    it('should generate incremental customer codes', async () => {
      const customerData: CreateCustomerData = {
        name: 'Jane Doe'
      };

      // Mock finding last customer with code CUS000005
      mockPrisma.customer.findFirst.mockResolvedValueOnce({
        customer_code: 'CUS000005'
      });

      mockPrisma.customer.create.mockResolvedValueOnce({
        id: 'customer-id',
        customer_code: 'CUS000006'
      });

      await customerService.createCustomer(tenantId, customerData, userId);

      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customer_code: 'CUS000006'
        })
      });
    });

    it('should create opening balance ledger entry when opening balance > 0', async () => {
      const customerData: CreateCustomerData = {
        name: 'John Doe',
        opening_balance: 1000
      };

      const mockCustomer = {
        id: 'customer-id',
        customer_code: 'CUS000001',
        current_balance: new Decimal(1000)
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);
      mockPrisma.customer.create.mockResolvedValueOnce(mockCustomer);
      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrisma.$transaction.mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          customerLedgerEntry: {
            create: jest.fn().mockResolvedValue({})
          },
          customer: {
            update: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx);
      });

      await customerService.createCustomer(tenantId, customerData, userId);

      // Verify that createLedgerEntry was called (through the transaction)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateCustomer', () => {
    it('should update customer information', async () => {
      const updateData: UpdateCustomerData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        status: CustomerStatus.INACTIVE
      };

      const mockUpdatedCustomer = {
        id: 'customer-id',
        ...updateData,
        updated_at: new Date()
      };

      mockPrisma.customer.update.mockResolvedValueOnce(mockUpdatedCustomer);

      const result = await customerService.updateCustomer(tenantId, 'customer-id', updateData, userId);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: {
          id: 'customer-id',
          tenant_id: tenantId,
          deleted_at: null
        },
        data: expect.objectContaining({
          name: 'Updated Name',
          email: 'updated@example.com',
          status: CustomerStatus.INACTIVE
        })
      });

      expect(result).toEqual(mockUpdatedCustomer);
    });

    it('should handle partial updates', async () => {
      const updateData: UpdateCustomerData = {
        phone: '987654321'
      };

      mockPrisma.customer.update.mockResolvedValueOnce({
        id: 'customer-id',
        phone: '987654321'
      });

      await customerService.updateCustomer(tenantId, 'customer-id', updateData, userId);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: {
          id: 'customer-id',
          tenant_id: tenantId,
          deleted_at: null
        },
        data: expect.objectContaining({
          phone: '987654321',
          updated_at: expect.any(Date)
        })
      });
    });
  });

  describe('getCustomerById', () => {
    it('should return customer with ledger entries', async () => {
      const mockCustomer = {
        id: 'customer-id',
        name: 'John Doe',
        ledger_entries: [
          { id: 'entry-1', amount: new Decimal(100) },
          { id: 'entry-2', amount: new Decimal(200) }
        ]
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const result = await customerService.getCustomerById(tenantId, 'customer-id');

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'customer-id',
          tenant_id: tenantId,
          deleted_at: null
        },
        include: {
          ledger_entries: {
            orderBy: { entry_date: 'desc' },
            take: 10
          }
        }
      });

      expect(result).toEqual(mockCustomer);
    });

    it('should return null for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);

      const result = await customerService.getCustomerById(tenantId, 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('searchCustomers', () => {
    it('should search customers with filters', async () => {
      const filters: CustomerSearchFilters = {
        search: 'John',
        customer_group: CustomerGroup.VIP,
        status: CustomerStatus.ACTIVE
      };

      const mockCustomers = [
        { id: 'customer-1', name: 'John Doe' },
        { id: 'customer-2', name: 'John Smith' }
      ];

      mockPrisma.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrisma.customer.count.mockResolvedValueOnce(2);

      const result = await customerService.searchCustomers(tenantId, filters, 1, 20);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: tenantId,
          deleted_at: null,
          customer_group: CustomerGroup.VIP,
          status: CustomerStatus.ACTIVE,
          OR: expect.arrayContaining([
            { name: { contains: 'John' } },
            { customer_code: { contains: 'John' } },
            { phone: { contains: 'John' } },
            { mobile: { contains: 'John' } },
            { email: { contains: 'John' } },
            { tax_id: { contains: 'John' } }
          ])
        }),
        orderBy: { created_at: 'desc' },
        skip: 0,
        take: 20
      });

      expect(result).toEqual({
        customers: mockCustomers,
        total: 2,
        totalPages: 1
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.customer.findMany.mockResolvedValueOnce([]);
      mockPrisma.customer.count.mockResolvedValueOnce(50);

      const result = await customerService.searchCustomers(tenantId, {}, 3, 10);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: { created_at: 'desc' },
        skip: 20, // (3-1) * 10
        take: 10
      });

      expect(result.totalPages).toBe(5); // Math.ceil(50/10)
    });
  });

  describe('createLedgerEntry', () => {
    it('should create ledger entry and update customer balance for debit', async () => {
      const mockCustomer = {
        id: 'customer-id',
        current_balance: new Decimal(100)
      };

      const ledgerData = {
        customer_id: 'customer-id',
        entry_type: LedgerEntryType.DEBIT,
        amount: 50,
        description: 'Test debit entry'
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrisma.$transaction.mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          customerLedgerEntry: {
            create: jest.fn().mockResolvedValue({})
          },
          customer: {
            update: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx);
      });

      await customerService.createLedgerEntry(tenantId, ledgerData, userId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should create ledger entry and update customer balance for credit', async () => {
      const mockCustomer = {
        id: 'customer-id',
        current_balance: new Decimal(100)
      };

      const ledgerData = {
        customer_id: 'customer-id',
        entry_type: LedgerEntryType.CREDIT,
        amount: 30,
        description: 'Test credit entry'
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrisma.$transaction.mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          customerLedgerEntry: {
            create: jest.fn().mockResolvedValue({})
          },
          customer: {
            update: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx);
      });

      await customerService.createLedgerEntry(tenantId, ledgerData, userId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);

      const ledgerData = {
        customer_id: 'non-existent-id',
        entry_type: LedgerEntryType.DEBIT,
        amount: 50,
        description: 'Test entry'
      };

      await expect(
        customerService.createLedgerEntry(tenantId, ledgerData, userId)
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('checkCreditLimit', () => {
    it('should return allowed true when within credit limit', async () => {
      const mockCustomer = {
        id: 'customer-id',
        current_balance: new Decimal(500),
        credit_limit: new Decimal(1000)
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const result = await customerService.checkCreditLimit(tenantId, 'customer-id', 300);

      expect(result).toEqual({
        allowed: true,
        availableCredit: 500 // 1000 - 500
      });
    });

    it('should return allowed false when exceeding credit limit', async () => {
      const mockCustomer = {
        id: 'customer-id',
        current_balance: new Decimal(800),
        credit_limit: new Decimal(1000)
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const result = await customerService.checkCreditLimit(tenantId, 'customer-id', 300);

      expect(result).toEqual({
        allowed: false,
        availableCredit: 200 // 1000 - 800
      });
    });

    it('should throw error for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);

      await expect(
        customerService.checkCreditLimit(tenantId, 'non-existent-id', 100)
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer', async () => {
      mockPrisma.customer.update.mockResolvedValueOnce({});

      await customerService.deleteCustomer(tenantId, 'customer-id');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: {
          id: 'customer-id',
          tenant_id: tenantId
        },
        data: {
          deleted_at: expect.any(Date),
          is_active: false
        }
      });
    });
  });

  describe('getCustomerTags', () => {
    it('should return active customer tags', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'VIP', color: '#ff0000' },
        { id: 'tag-2', name: 'Wholesale', color: '#00ff00' }
      ];

      mockPrisma.customerTag.findMany.mockResolvedValueOnce(mockTags);

      const result = await customerService.getCustomerTags(tenantId);

      expect(mockPrisma.customerTag.findMany).toHaveBeenCalledWith({
        where: {
          tenant_id: tenantId,
          is_active: true
        },
        orderBy: { name: 'asc' }
      });

      expect(result).toEqual(mockTags);
    });
  });

  describe('createCustomerTag', () => {
    it('should create a new customer tag', async () => {
      const mockTag = {
        id: 'tag-id',
        name: 'Premium',
        color: '#gold',
        description: 'Premium customers'
      };

      mockPrisma.customerTag.create.mockResolvedValueOnce(mockTag);

      const result = await customerService.createCustomerTag(
        tenantId,
        'Premium',
        '#gold',
        'Premium customers'
      );

      expect(mockPrisma.customerTag.create).toHaveBeenCalledWith({
        data: {
          tenant_id: tenantId,
          name: 'Premium',
          color: '#gold',
          description: 'Premium customers'
        }
      });

      expect(result).toEqual(mockTag);
    });
  });

  describe('getCustomerStatistics', () => {
    it('should return customer statistics', async () => {
      // Mock all the count queries
      mockPrisma.customer.count
        .mockResolvedValueOnce(100) // totalCustomers
        .mockResolvedValueOnce(85)  // activeCustomers
        .mockResolvedValueOnce(15)  // vipCustomers
        .mockResolvedValueOnce(25)  // customersWithBalance
        .mockResolvedValueOnce(12); // recentCustomers

      // Mock the raw query for credit limit exceeded
      mockPrisma.$queryRaw = jest.fn().mockResolvedValueOnce([{ count: 5 }]);

      const result = await customerService.getCustomerStatistics(tenantId);

      expect(result).toEqual({
        totalCustomers: 100,
        activeCustomers: 85,
        vipCustomers: 15,
        customersWithBalance: 25,
        customersOverCreditLimit: 5,
        recentCustomers: 12
      });
    });
  });

  describe('exportCustomersToCSV', () => {
    it('should export customers to CSV format', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          tenant_id: 'test-tenant-id',
          customer_code: 'CUS000001',
          name: 'John Doe',
          contact_person: 'Jane Doe',
          phone: '123456789',
          mobile: '987654321',
          email: 'john@example.com',
          address: JSON.stringify({ street: '123 Main St', city: 'Tehran' }),
          tax_id: 'TAX123',
          customer_group: CustomerGroup.VIP,
          status: CustomerStatus.ACTIVE,
          credit_limit: new Decimal(1000),
          current_balance: new Decimal(500),
          opening_balance: new Decimal(0),
          tags: JSON.stringify(['VIP', 'Premium']),
          notes: 'Important customer',
          birthday: new Date('1990-01-01'),
          anniversary: new Date('2020-06-15'),
          preferred_language: 'fa',
          communication_preferences: null,
          is_active: true,
          created_by: 'user-1',
          created_at: new Date('2023-01-01T00:00:00Z'),
          updated_at: new Date('2023-01-01T00:00:00Z'),
          deleted_at: null
        }
      ];

      // Mock the searchCustomers method
      jest.spyOn(customerService, 'searchCustomers').mockResolvedValueOnce({
        customers: mockCustomers,
        total: 1,
        totalPages: 1
      });

      const result = await customerService.exportCustomersToCSV(tenantId);

      expect(result).toContain('"Customer Code","Name","Contact Person"');
      expect(result).toContain('"CUS000001","John Doe","Jane Doe"');
      expect(result).toContain('"VIP","ACTIVE","1000","500"');
      expect(result).toContain('"VIP, Premium"');
    });
  });
});
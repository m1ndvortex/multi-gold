import request from 'supertest';
import app from '../../server';
import { CustomerGroup, CustomerStatus, LedgerEntryType } from '@prisma/client';
import { TenantDatabase } from '../../utils/tenantDatabase';

// Mock dependencies
jest.mock('../../utils/tenantDatabase');
jest.mock('../../middleware/tenantMiddleware', () => ({
  tenantMiddleware: (req: any, res: any, next: any) => {
    req.tenant = { id: 'test-tenant-id', name: 'Test Tenant' };
    next();
  }
}));

jest.mock('../../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      tenant_id: 'test-tenant-id',
      role: 'TENANT_ADMIN',
      permissions: ['customer:read', 'customer:create', 'customer:update', 'customer:delete']
    };
    next();
  }
}));

const mockTenantDatabase = TenantDatabase as jest.MockedClass<typeof TenantDatabase>;

describe('Customer Integration Tests', () => {
  let mockPrisma: any;

  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/customers', () => {
    it('should return paginated list of customers', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          customer_code: 'CUS000001',
          name: 'John Doe',
          email: 'john@example.com',
          customer_group: CustomerGroup.REGULAR,
          status: CustomerStatus.ACTIVE
        },
        {
          id: 'customer-2',
          customer_code: 'CUS000002',
          name: 'Jane Smith',
          email: 'jane@example.com',
          customer_group: CustomerGroup.VIP,
          status: CustomerStatus.ACTIVE
        }
      ];

      mockPrisma.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrisma.customer.count.mockResolvedValueOnce(2);

      const response = await request(app)
        .get('/api/v1/customers')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          customers: mockCustomers,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        }
      });
    });

    it('should filter customers by search term', async () => {
      mockPrisma.customer.findMany.mockResolvedValueOnce([]);
      mockPrisma.customer.count.mockResolvedValueOnce(0);

      await request(app)
        .get('/api/v1/customers')
        .query({ search: 'John', customer_group: 'VIP' })
        .expect(200);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: 'test-tenant-id',
          deleted_at: null,
          customer_group: CustomerGroup.VIP,
          OR: expect.arrayContaining([
            { name: { contains: 'John' } },
            { customer_code: { contains: 'John' } }
          ])
        }),
        orderBy: { created_at: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should return customer by ID', async () => {
      const mockCustomer = {
        id: 'customer-1',
        customer_code: 'CUS000001',
        name: 'John Doe',
        email: 'john@example.com',
        ledger_entries: []
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const response = await request(app)
        .get('/api/v1/customers/customer-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          customer: mockCustomer
        }
      });
    });

    it('should return 404 for non-existent customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/v1/customers/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found'
        }
      });
    });
  });

  describe('POST /api/v1/customers', () => {
    it('should create a new customer', async () => {
      const customerData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        customer_group: CustomerGroup.REGULAR,
        credit_limit: 1000
      };

      const mockCreatedCustomer = {
        id: 'customer-1',
        customer_code: 'CUS000001',
        ...customerData,
        tenant_id: 'test-tenant-id',
        created_by: 'test-user-id'
      };

      // Mock customer code generation
      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);
      mockPrisma.customer.create.mockResolvedValueOnce(mockCreatedCustomer);

      const response = await request(app)
        .post('/api/v1/customers')
        .send(customerData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          customer: mockCreatedCustomer
        }
      });

      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: 'test-tenant-id',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '123456789',
          customer_group: CustomerGroup.REGULAR,
          created_by: 'test-user-id'
        })
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({}) // Missing required name field
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({
          name: 'John Doe',
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/customers/:id', () => {
    it('should update customer information', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        status: CustomerStatus.INACTIVE
      };

      const mockUpdatedCustomer = {
        id: 'customer-1',
        ...updateData
      };

      mockPrisma.customer.update.mockResolvedValueOnce(mockUpdatedCustomer);

      const response = await request(app)
        .put('/api/v1/customers/customer-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          customer: mockUpdatedCustomer
        }
      });
    });

    it('should return 404 for non-existent customer', async () => {
      const updateData = { name: 'Updated Name' };

      mockPrisma.customer.update.mockRejectedValueOnce({ code: 'P2025' });

      const response = await request(app)
        .put('/api/v1/customers/non-existent-id')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found'
        }
      });
    });
  });

  describe('DELETE /api/v1/customers/:id', () => {
    it('should soft delete customer', async () => {
      mockPrisma.customer.update.mockResolvedValueOnce({});

      const response = await request(app)
        .delete('/api/v1/customers/customer-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Customer deleted successfully'
      });

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: {
          id: 'customer-1',
          tenant_id: 'test-tenant-id'
        },
        data: {
          deleted_at: expect.any(Date),
          is_active: false
        }
      });
    });
  });

  describe('GET /api/v1/customers/:id/ledger', () => {
    it('should return customer ledger entries', async () => {
      const mockCustomer = {
        id: 'customer-1',
        name: 'John Doe',
        current_balance: 500,
        credit_limit: 1000
      };

      const mockLedgerEntries = [
        {
          id: 'entry-1',
          entry_type: LedgerEntryType.DEBIT,
          amount: 100,
          description: 'Sale invoice',
          entry_date: new Date()
        },
        {
          id: 'entry-2',
          entry_type: LedgerEntryType.CREDIT,
          amount: 50,
          description: 'Payment received',
          entry_date: new Date()
        }
      ];

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrisma.customerLedgerEntry.findMany.mockResolvedValueOnce(mockLedgerEntries);
      mockPrisma.customerLedgerEntry.count.mockResolvedValueOnce(2);

      const response = await request(app)
        .get('/api/v1/customers/customer-1/ledger')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ledger: mockLedgerEntries,
          customer: {
            id: 'customer-1',
            name: 'John Doe',
            current_balance: 500,
            credit_limit: 1000
          },
          pagination: {
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 1
          }
        }
      });
    });
  });

  describe('POST /api/v1/customers/:id/ledger', () => {
    it('should create ledger entry', async () => {
      const ledgerData = {
        entry_type: LedgerEntryType.DEBIT,
        amount: 100,
        description: 'Manual adjustment'
      };

      const mockCustomer = {
        id: 'customer-1',
        current_balance: 500
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);
      mockPrisma.$transaction.mockResolvedValueOnce([{}, {}]);

      const response = await request(app)
        .post('/api/v1/customers/customer-1/ledger')
        .send(ledgerData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Ledger entry created successfully'
      });
    });

    it('should return 404 for non-existent customer', async () => {
      const ledgerData = {
        entry_type: LedgerEntryType.DEBIT,
        amount: 100,
        description: 'Manual adjustment'
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/v1/customers/customer-1/ledger')
        .send(ledgerData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found'
        }
      });
    });
  });

  describe('GET /api/v1/customers/:id/credit-check', () => {
    it('should check credit limit and return allowed status', async () => {
      const mockCustomer = {
        id: 'customer-1',
        current_balance: 500,
        credit_limit: 1000
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const response = await request(app)
        .get('/api/v1/customers/customer-1/credit-check')
        .query({ amount: 300 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: true,
          availableCredit: 500
        }
      });
    });

    it('should return not allowed when exceeding credit limit', async () => {
      const mockCustomer = {
        id: 'customer-1',
        current_balance: 800,
        credit_limit: 1000
      };

      mockPrisma.customer.findFirst.mockResolvedValueOnce(mockCustomer);

      const response = await request(app)
        .get('/api/v1/customers/customer-1/credit-check')
        .query({ amount: 300 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          allowed: false,
          availableCredit: 200
        }
      });
    });
  });

  describe('GET /api/v1/customers/tags', () => {
    it('should return customer tags', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'VIP', color: '#ff0000' },
        { id: 'tag-2', name: 'Wholesale', color: '#00ff00' }
      ];

      mockPrisma.customerTag.findMany.mockResolvedValueOnce(mockTags);

      const response = await request(app)
        .get('/api/v1/customers/tags')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          tags: mockTags
        }
      });
    });
  });

  describe('POST /api/v1/customers/tags', () => {
    it('should create a new customer tag', async () => {
      const tagData = {
        name: 'Premium',
        color: '#gold',
        description: 'Premium customers'
      };

      const mockTag = {
        id: 'tag-1',
        ...tagData
      };

      mockPrisma.customerTag.create.mockResolvedValueOnce(mockTag);

      const response = await request(app)
        .post('/api/v1/customers/tags')
        .send(tagData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          tag: mockTag
        }
      });
    });

    it('should return 409 for duplicate tag name', async () => {
      const tagData = {
        name: 'Existing Tag'
      };

      mockPrisma.customerTag.create.mockRejectedValueOnce({ code: 'P2002' });

      const response = await request(app)
        .post('/api/v1/customers/tags')
        .send(tagData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'TAG_EXISTS',
          message: 'Tag with this name already exists'
        }
      });
    });
  });

  describe('GET /api/v1/customers/statistics', () => {
    it('should return customer statistics', async () => {
      const mockStats = {
        totalCustomers: 100,
        activeCustomers: 85,
        vipCustomers: 15,
        customersWithBalance: 25,
        customersOverCreditLimit: 5,
        recentCustomers: 12
      };

      // Mock all the count queries
      mockPrisma.customer.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(85)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(12);

      const response = await request(app)
        .get('/api/v1/customers/statistics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });
    });
  });

  describe('GET /api/v1/customers/export', () => {
    it('should export customers to CSV', async () => {
      const mockCustomers = [
        {
          customer_code: 'CUS000001',
          name: 'John Doe',
          contact_person: null,
          phone: '123456789',
          mobile: null,
          email: 'john@example.com',
          tax_id: null,
          customer_group: CustomerGroup.REGULAR,
          status: CustomerStatus.ACTIVE,
          credit_limit: { toString: () => '1000' },
          current_balance: { toString: () => '500' },
          address: null,
          tags: null,
          notes: null,
          birthday: null,
          anniversary: null,
          created_at: new Date('2023-01-01T00:00:00Z')
        }
      ];

      // Mock the searchCustomers method by mocking the underlying Prisma calls
      mockPrisma.customer.findMany.mockResolvedValueOnce(mockCustomers);
      mockPrisma.customer.count.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/api/v1/customers/export')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment; filename=');
      expect(response.text).toContain('Customer Code,Name,Contact Person');
      expect(response.text).toContain('CUS000001,"John Doe"');
    });
  });

  describe('POST /api/v1/customers/import', () => {
    it('should import customers from CSV file', async () => {
      const csvContent = `name,email,phone,customer_group
John Doe,john@example.com,123456789,REGULAR
Jane Smith,jane@example.com,987654321,VIP`;

      // Mock customer code generation and creation
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create
        .mockResolvedValueOnce({ id: 'customer-1', customer_code: 'CUS000001' })
        .mockResolvedValueOnce({ id: 'customer-2', customer_code: 'CUS000002' });

      // Mock import log creation
      mockPrisma.customerImportLog.create.mockResolvedValueOnce({
        id: 'import-log-1'
      });

      const response = await request(app)
        .post('/api/v1/customers/import')
        .attach('file', Buffer.from(csvContent), 'customers.csv')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(2);
      expect(response.body.data.errors).toEqual([]);
      expect(response.body.data.importLogId).toBe('import-log-1');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/api/v1/customers/import')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'CSV file is required'
        }
      });
    });
  });
});
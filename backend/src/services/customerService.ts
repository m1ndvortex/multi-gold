import { PrismaClient, Customer, CustomerGroup, CustomerStatus, LedgerEntryType, Prisma } from '@prisma/client';
import { TenantDatabase } from '../utils/tenantDatabase';
import { Decimal } from '@prisma/client/runtime/library';
import csv from 'csv-parser';
import * as fs from 'fs';
import { Readable } from 'stream';

export interface CreateCustomerData {
  name: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  tax_id?: string;
  customer_group?: CustomerGroup;
  credit_limit?: number;
  opening_balance?: number;
  tags?: string[];
  notes?: string;
  birthday?: Date;
  anniversary?: Date;
  preferred_language?: string;
  communication_preferences?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: CustomerStatus;
}

export interface CustomerSearchFilters {
  search?: string;
  customer_group?: CustomerGroup;
  status?: CustomerStatus;
  tags?: string[];
  has_balance?: boolean;
  credit_limit_exceeded?: boolean;
  created_from?: Date;
  created_to?: Date;
}

export interface CustomerLedgerEntryData {
  customer_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  currency?: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  entry_date?: Date;
}

export interface CustomerImportData {
  name: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
  tax_id?: string;
  customer_group?: string;
  credit_limit?: string;
  opening_balance?: string;
  tags?: string;
  notes?: string;
  birthday?: string;
  anniversary?: string;
}

export class CustomerService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  private async getPrisma(): Promise<PrismaClient> {
    return await TenantDatabase.getConnection(this.tenantId);
  }

  /**
   * Generate unique customer code for tenant
   */
  private async generateCustomerCode(tenantId: string): Promise<string> {
    const prisma = await this.getPrisma();
    const lastCustomer = await prisma.customer.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      select: { customer_code: true }
    });

    let nextNumber = 1;
    if (lastCustomer?.customer_code) {
      const match = lastCustomer.customer_code.match(/CUS(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `CUS${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Create a new customer
   */
  async createCustomer(tenantId: string, data: CreateCustomerData, createdBy: string): Promise<Customer> {
    const prisma = await this.getPrisma();
    const customerCode = await this.generateCustomerCode(tenantId);

    const customer = await prisma.customer.create({
      data: {
        tenant_id: tenantId,
        customer_code: customerCode,
        name: data.name,
        contact_person: data.contact_person,
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        address: data.address ? JSON.stringify(data.address) : undefined,
        tax_id: data.tax_id,
        customer_group: data.customer_group || CustomerGroup.REGULAR,
        credit_limit: new Decimal(data.credit_limit || 0),
        opening_balance: new Decimal(data.opening_balance || 0),
        current_balance: new Decimal(data.opening_balance || 0),
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        notes: data.notes,
        birthday: data.birthday,
        anniversary: data.anniversary,
        preferred_language: data.preferred_language || 'fa',
        communication_preferences: data.communication_preferences ? JSON.stringify(data.communication_preferences) : undefined,
        created_by: createdBy
      }
    });

    // Create opening balance ledger entry if opening balance > 0
    if (data.opening_balance && data.opening_balance !== 0) {
      await this.createLedgerEntry(tenantId, {
        customer_id: customer.id,
        entry_type: LedgerEntryType.OPENING_BALANCE,
        amount: data.opening_balance,
        description: 'Opening Balance',
        reference_type: 'OPENING_BALANCE'
      }, createdBy);
    }

    return customer;
  }

  /**
   * Update customer information
   */
  async updateCustomer(tenantId: string, customerId: string, data: UpdateCustomerData, updatedBy: string): Promise<Customer> {
    const prisma = await this.getPrisma();
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.contact_person !== undefined) updateData.contact_person = data.contact_person;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address ? JSON.stringify(data.address) : undefined;
    if (data.tax_id !== undefined) updateData.tax_id = data.tax_id;
    if (data.customer_group !== undefined) updateData.customer_group = data.customer_group;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.credit_limit !== undefined) updateData.credit_limit = new Decimal(data.credit_limit);
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : undefined;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.birthday !== undefined) updateData.birthday = data.birthday;
    if (data.anniversary !== undefined) updateData.anniversary = data.anniversary;
    if (data.preferred_language !== undefined) updateData.preferred_language = data.preferred_language;
    if (data.communication_preferences !== undefined) updateData.communication_preferences = data.communication_preferences ? JSON.stringify(data.communication_preferences) : undefined;

    return await prisma.customer.update({
      where: {
        id: customerId,
        tenant_id: tenantId,
        deleted_at: null
      },
      data: updateData
    });
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(tenantId: string, customerId: string): Promise<Customer | null> {
    const prisma = await this.getPrisma();
    return await prisma.customer.findFirst({
      where: {
        id: customerId,
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
  }

  /**
   * Get customer by customer code
   */
  async getCustomerByCode(tenantId: string, customerCode: string): Promise<Customer | null> {
    const prisma = await this.getPrisma();
    return await prisma.customer.findFirst({
      where: {
        customer_code: customerCode,
        tenant_id: tenantId,
        deleted_at: null
      }
    });
  }

  /**
   * Search and filter customers
   */
  async searchCustomers(
    tenantId: string,
    filters: CustomerSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ customers: Customer[]; total: number; totalPages: number }> {
    const where: Prisma.CustomerWhereInput = {
      tenant_id: tenantId,
      deleted_at: null
    };

    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { customer_code: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { mobile: { contains: filters.search } },
        { email: { contains: filters.search } },
        { tax_id: { contains: filters.search } }
      ];
    }

    // Group filter
    if (filters.customer_group) {
      where.customer_group = filters.customer_group;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Balance filters
    if (filters.has_balance) {
      where.current_balance = { not: 0 };
    }

    if (filters.credit_limit_exceeded) {
      // Use raw SQL for comparing current_balance with credit_limit
      where.AND = where.AND || [];
      (where.AND as any[]).push({
        current_balance: { gt: { _ref: 'credit_limit' } }
      });
    }

    // Date range filter
    if (filters.created_from || filters.created_to) {
      where.created_at = {};
      if (filters.created_from) where.created_at.gte = filters.created_from;
      if (filters.created_to) where.created_at.lte = filters.created_to;
    }

    // Tags filter (JSON contains)
    if (filters.tags && filters.tags.length > 0) {
      // For MySQL JSON queries, we need to use raw SQL
      where.AND = filters.tags.map(tag => ({
        tags: {
          path: '$',
          string_contains: tag
        }
      }));
    }

    const prisma = await this.getPrisma();
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.customer.count({ where })
    ]);

    return {
      customers,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Create customer ledger entry
   */
  async createLedgerEntry(tenantId: string, data: CustomerLedgerEntryData, createdBy: string): Promise<void> {
    const prisma = await this.getPrisma();
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customer_id,
        tenant_id: tenantId,
        deleted_at: null
      }
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate new balance
    let newBalance = new Decimal(customer.current_balance);
    const amount = new Decimal(data.amount);

    if (data.entry_type === LedgerEntryType.DEBIT) {
      newBalance = newBalance.plus(amount);
    } else if (data.entry_type === LedgerEntryType.CREDIT) {
      newBalance = newBalance.minus(amount);
    } else if (data.entry_type === LedgerEntryType.OPENING_BALANCE) {
      newBalance = amount;
    } else if (data.entry_type === LedgerEntryType.ADJUSTMENT) {
      newBalance = newBalance.plus(amount); // Amount can be negative for adjustments
    }

    // Create ledger entry and update customer balance in transaction
    await prisma.$transaction(async (tx) => {
      await tx.customerLedgerEntry.create({
        data: {
          tenant_id: tenantId,
          customer_id: data.customer_id,
          entry_type: data.entry_type,
          amount: amount,
          currency: data.currency || 'IRR',
          description: data.description,
          reference_type: data.reference_type,
          reference_id: data.reference_id,
          balance_after: newBalance,
          entry_date: data.entry_date || new Date(),
          created_by: createdBy
        }
      });

      await tx.customer.update({
        where: { id: data.customer_id },
        data: { current_balance: newBalance }
      });
    });
  }

  /**
   * Get customer ledger entries
   */
  async getCustomerLedger(
    tenantId: string,
    customerId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ entries: any[]; total: number; totalPages: number }> {
    const prisma = await this.getPrisma();
    const where = {
      tenant_id: tenantId,
      customer_id: customerId
    };

    const [entries, total] = await Promise.all([
      prisma.customerLedgerEntry.findMany({
        where,
        orderBy: { entry_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.customerLedgerEntry.count({ where })
    ]);

    return {
      entries,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Check credit limit
   */
  async checkCreditLimit(tenantId: string, customerId: string, additionalAmount: number): Promise<{ allowed: boolean; availableCredit: number }> {
    const prisma = await this.getPrisma();
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenant_id: tenantId,
        deleted_at: null
      }
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentBalance = new Decimal(customer.current_balance);
    const creditLimit = new Decimal(customer.credit_limit);
    const additional = new Decimal(additionalAmount);
    
    const newBalance = currentBalance.plus(additional);
    const availableCredit = creditLimit.minus(currentBalance);

    return {
      allowed: newBalance.lte(creditLimit),
      availableCredit: availableCredit.toNumber()
    };
  }

  /**
   * Soft delete customer
   */
  async deleteCustomer(tenantId: string, customerId: string): Promise<void> {
    const prisma = await this.getPrisma();
    await prisma.customer.update({
      where: {
        id: customerId,
        tenant_id: tenantId
      },
      data: {
        deleted_at: new Date(),
        is_active: false
      }
    });
  }

  /**
   * Get customer tags
   */
  async getCustomerTags(tenantId: string): Promise<any[]> {
    const prisma = await this.getPrisma();
    return await prisma.customerTag.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Create customer tag
   */
  async createCustomerTag(tenantId: string, name: string, color?: string, description?: string): Promise<any> {
    const prisma = await this.getPrisma();
    return await prisma.customerTag.create({
      data: {
        tenant_id: tenantId,
        name,
        color,
        description
      }
    });
  }

  /**
   * Import customers from CSV
   */
  async importCustomersFromCSV(
    tenantId: string,
    csvContent: string,
    filename: string,
    importedBy: string
  ): Promise<{ success: number; errors: any[]; importLogId: string }> {
    const results: CustomerImportData[] = [];
    const errors: any[] = [];
    let successCount = 0;

    // Parse CSV content
    return new Promise((resolve, reject) => {
      const stream = Readable.from([csvContent]);
      
      stream
        .pipe(csv())
        .on('data', (data: CustomerImportData) => {
          results.push(data);
        })
        .on('end', async () => {
          // Process each row
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              // Validate required fields
              if (!row.name || row.name.trim() === '') {
                errors.push({
                  row: i + 2, // +2 because CSV is 1-indexed and has header
                  field: 'name',
                  error: 'Name is required'
                });
                continue;
              }

              // Prepare customer data
              const customerData: CreateCustomerData = {
                name: row.name.trim(),
                contact_person: row.contact_person?.trim(),
                phone: row.phone?.trim(),
                mobile: row.mobile?.trim(),
                email: row.email?.trim(),
                tax_id: row.tax_id?.trim(),
                notes: row.notes?.trim(),
                preferred_language: 'fa'
              };

              // Parse address
              if (row.address_street || row.address_city || row.address_state || row.address_postal_code || row.address_country) {
                customerData.address = {
                  street: row.address_street?.trim(),
                  city: row.address_city?.trim(),
                  state: row.address_state?.trim(),
                  postal_code: row.address_postal_code?.trim(),
                  country: row.address_country?.trim()
                };
              }

              // Parse customer group
              if (row.customer_group) {
                const group = row.customer_group.toUpperCase() as CustomerGroup;
                if (Object.values(CustomerGroup).includes(group)) {
                  customerData.customer_group = group;
                }
              }

              // Parse numeric fields
              if (row.credit_limit) {
                const creditLimit = parseFloat(row.credit_limit);
                if (!isNaN(creditLimit)) {
                  customerData.credit_limit = creditLimit;
                }
              }

              if (row.opening_balance) {
                const openingBalance = parseFloat(row.opening_balance);
                if (!isNaN(openingBalance)) {
                  customerData.opening_balance = openingBalance;
                }
              }

              // Parse tags
              if (row.tags) {
                customerData.tags = row.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
              }

              // Parse dates
              if (row.birthday) {
                const birthday = new Date(row.birthday);
                if (!isNaN(birthday.getTime())) {
                  customerData.birthday = birthday;
                }
              }

              if (row.anniversary) {
                const anniversary = new Date(row.anniversary);
                if (!isNaN(anniversary.getTime())) {
                  customerData.anniversary = anniversary;
                }
              }

              // Create customer
              await this.createCustomer(tenantId, customerData, importedBy);
              successCount++;

            } catch (error: any) {
              errors.push({
                row: i + 2,
                error: error.message || 'Unknown error'
              });
            }
          }

          // Create import log
          const prisma = await this.getPrisma();
          const importLog = await prisma.customerImportLog.create({
            data: {
              tenant_id: tenantId,
              filename,
              total_records: results.length,
              success_count: successCount,
              error_count: errors.length,
              errors: errors.length > 0 ? JSON.stringify(errors) : undefined,
              imported_by: importedBy
            }
          });

          resolve({
            success: successCount,
            errors,
            importLogId: importLog.id
          });
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Export customers to CSV
   */
  async exportCustomersToCSV(tenantId: string, filters?: CustomerSearchFilters): Promise<string> {
    const { customers } = await this.searchCustomers(tenantId, filters || {}, 1, 10000);

    const csvHeaders = [
      'Customer Code',
      'Name',
      'Contact Person',
      'Phone',
      'Mobile',
      'Email',
      'Tax ID',
      'Customer Group',
      'Status',
      'Credit Limit',
      'Current Balance',
      'Address Street',
      'Address City',
      'Address State',
      'Address Postal Code',
      'Address Country',
      'Tags',
      'Notes',
      'Birthday',
      'Anniversary',
      'Created At'
    ];

    const csvRows = customers.map(customer => {
      const address = customer.address ? JSON.parse(customer.address as string) : {};
      const tags = customer.tags ? JSON.parse(customer.tags as string) : [];

      return [
        customer.customer_code,
        customer.name,
        customer.contact_person || '',
        customer.phone || '',
        customer.mobile || '',
        customer.email || '',
        customer.tax_id || '',
        customer.customer_group,
        customer.status,
        customer.credit_limit.toString(),
        customer.current_balance.toString(),
        address.street || '',
        address.city || '',
        address.state || '',
        address.postal_code || '',
        address.country || '',
        Array.isArray(tags) ? tags.join(', ') : '',
        customer.notes || '',
        customer.birthday ? customer.birthday.toISOString().split('T')[0] : '',
        customer.anniversary ? customer.anniversary.toISOString().split('T')[0] : '',
        customer.created_at.toISOString()
      ];
    });

    // Convert to CSV format
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(tenantId: string): Promise<any> {
    const prisma = await this.getPrisma();
    
    const [
      totalCustomers,
      activeCustomers,
      vipCustomers,
      customersWithBalance,
      customersOverCreditLimit,
      recentCustomers
    ] = await Promise.all([
      prisma.customer.count({
        where: { tenant_id: tenantId, deleted_at: null }
      }),
      prisma.customer.count({
        where: { tenant_id: tenantId, deleted_at: null, status: CustomerStatus.ACTIVE }
      }),
      prisma.customer.count({
        where: { tenant_id: tenantId, deleted_at: null, customer_group: CustomerGroup.VIP }
      }),
      prisma.customer.count({
        where: { tenant_id: tenantId, deleted_at: null, current_balance: { not: 0 } }
      }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM customers 
        WHERE tenant_id = ${tenantId} 
        AND deleted_at IS NULL 
        AND current_balance > credit_limit
      `,
      prisma.customer.count({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          created_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      })
    ]);

    return {
      totalCustomers,
      activeCustomers,
      vipCustomers,
      customersWithBalance,
      customersOverCreditLimit: Number((customersOverCreditLimit as any)[0]?.count || 0),
      recentCustomers
    };
  }
}
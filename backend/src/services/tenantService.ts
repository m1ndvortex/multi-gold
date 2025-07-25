import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { createError } from '@/middleware/errorHandler';

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  subscription_plan: string;
  status: string;
  is_active: boolean;
}

export class TenantService {
  private static tenantCache = new Map<string, TenantInfo>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get tenant information by ID or subdomain
   */
  static async getTenant(identifier: string): Promise<TenantInfo | null> {
    try {
      // Check cache first
      const cached = this.getCachedTenant(identifier);
      if (cached) {
        return cached;
      }

      const prisma = getPrismaClient();
      
      // Try to find by ID first, then by subdomain
      let tenant = await prisma.tenant.findUnique({
        where: { id: identifier },
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

      if (!tenant) {
        tenant = await prisma.tenant.findUnique({
          where: { subdomain: identifier },
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
      }

      if (tenant) {
        const tenantInfo: TenantInfo = {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          schema_name: tenant.schema_name,
          subscription_plan: tenant.subscription_plan,
          status: tenant.status,
          is_active: tenant.is_active,
        };

        // Cache the result
        this.cacheTenant(identifier, tenantInfo);
        this.cacheTenant(tenant.id, tenantInfo);
        this.cacheTenant(tenant.subdomain, tenantInfo);

        return tenantInfo;
      }

      return null;
    } catch (error) {
      logger.error('Error fetching tenant:', error);
      throw createError('Failed to fetch tenant information', 500, 'TENANT_FETCH_ERROR');
    }
  }

  /**
   * Validate tenant exists and is active
   */
  static async validateTenant(identifier: string): Promise<TenantInfo> {
    const tenant = await this.getTenant(identifier);
    
    if (!tenant) {
      throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    }

    if (!tenant.is_active) {
      throw createError('Tenant is inactive', 403, 'TENANT_INACTIVE');
    }

    if (tenant.status === 'SUSPENDED') {
      throw createError('Tenant account is suspended', 403, 'TENANT_SUSPENDED');
    }

    if (tenant.status === 'EXPIRED') {
      throw createError('Tenant subscription has expired', 403, 'TENANT_EXPIRED');
    }

    return tenant;
  }

  /**
   * Create a new tenant with schema
   */
  static async createTenant(tenantData: {
    name: string;
    subdomain: string;
    contact_email: string;
    contact_phone?: string;
    subscription_plan?: string;
  }): Promise<TenantInfo> {
    const prisma = getPrismaClient();
    
    try {
      // Generate schema name
      const schema_name = `tenant_${tenantData.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      // Create tenant record
      const tenant = await prisma.tenant.create({
        data: {
          name: tenantData.name,
          subdomain: tenantData.subdomain,
          schema_name,
          contact_email: tenantData.contact_email,
          contact_phone: tenantData.contact_phone,
          subscription_plan: tenantData.subscription_plan as any || 'BASIC',
          status: 'TRIAL',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
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

      // Create tenant schema
      await this.createTenantSchema(schema_name);

      // Run tenant-specific migrations
      await this.runTenantMigrations(tenant.id, schema_name);

      const tenantInfo: TenantInfo = {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        schema_name: tenant.schema_name,
        subscription_plan: tenant.subscription_plan,
        status: tenant.status,
        is_active: tenant.is_active,
      };

      // Cache the new tenant
      this.cacheTenant(tenant.id, tenantInfo);
      this.cacheTenant(tenant.subdomain, tenantInfo);

      logger.info(`Created new tenant: ${tenant.name} (${tenant.subdomain})`);
      return tenantInfo;
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw createError('Failed to create tenant', 500, 'TENANT_CREATION_ERROR');
    }
  }

  /**
   * Create database schema for tenant
   */
  private static async createTenantSchema(schemaName: string): Promise<void> {
    const prisma = getPrismaClient();
    
    try {
      // Create the schema
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS \`${schemaName}\``);
      
      // Create tenant-specific tables
      await this.createTenantTables(schemaName);
      
      logger.info(`Created schema: ${schemaName}`);
    } catch (error) {
      logger.error(`Error creating schema ${schemaName}:`, error);
      throw error;
    }
  }

  /**
   * Create tenant-specific tables
   */
  private static async createTenantTables(schemaName: string): Promise<void> {
    const prisma = getPrismaClient();
    
    const tables = [
      // Customers table
      `CREATE TABLE \`${schemaName}\`.\`customers\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`email\` VARCHAR(255),
        \`phone\` VARCHAR(50),
        \`address\` JSON,
        \`tax_id\` VARCHAR(100),
        \`customer_group\` VARCHAR(100) DEFAULT 'REGULAR',
        \`credit_limit\` DECIMAL(15,2) DEFAULT 0.00,
        \`current_balance\` DECIMAL(15,2) DEFAULT 0.00,
        \`tags\` JSON,
        \`notes\` TEXT,
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`created_by\` VARCHAR(191),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_customers_name\` (\`name\`),
        INDEX \`idx_customers_email\` (\`email\`),
        INDEX \`idx_customers_phone\` (\`phone\`)
      )`,

      // Products table
      `CREATE TABLE \`${schemaName}\`.\`products\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`sku\` VARCHAR(100) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`category\` ENUM('RAW_GOLD', 'JEWELRY', 'COINS', 'STONES') NOT NULL,
        \`weight\` DECIMAL(10,4),
        \`purity\` INT,
        \`manufacturing_cost\` DECIMAL(15,2) DEFAULT 0.00,
        \`current_stock\` INT DEFAULT 0,
        \`minimum_stock\` INT DEFAULT 0,
        \`barcode\` VARCHAR(255),
        \`description\` TEXT,
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`created_by\` VARCHAR(191),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_products_sku\` (\`sku\`),
        INDEX \`idx_products_category\` (\`category\`),
        INDEX \`idx_products_barcode\` (\`barcode\`)
      )`,

      // Audit log table for tenant-specific operations
      `CREATE TABLE \`${schemaName}\`.\`audit_logs\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`entity\` VARCHAR(100) NOT NULL,
        \`entity_id\` VARCHAR(191),
        \`old_values\` JSON,
        \`new_values\` JSON,
        \`user_id\` VARCHAR(191),
        \`ip_address\` VARCHAR(45),
        \`user_agent\` TEXT,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_audit_logs_entity\` (\`entity\`, \`entity_id\`),
        INDEX \`idx_audit_logs_user\` (\`user_id\`),
        INDEX \`idx_audit_logs_created\` (\`created_at\`)
      )`
    ];

    for (const tableSQL of tables) {
      try {
        await prisma.$executeRawUnsafe(tableSQL);
      } catch (error) {
        logger.error(`Error creating table in schema ${schemaName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Run tenant-specific migrations
   */
  private static async runTenantMigrations(tenantId: string, schemaName: string): Promise<void> {
    const prisma = getPrismaClient();
    
    try {
      // Record initial migration
      await prisma.tenantMigration.create({
        data: {
          tenant_id: tenantId,
          migration: 'initial_schema_v1.0.0',
        },
      });

      logger.info(`Completed migrations for tenant schema: ${schemaName}`);
    } catch (error) {
      logger.error(`Error running migrations for ${schemaName}:`, error);
      throw error;
    }
  }

  /**
   * Get cached tenant
   */
  private static getCachedTenant(identifier: string): TenantInfo | null {
    const cached = this.tenantCache.get(identifier);
    const expiry = this.cacheExpiry.get(identifier);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache
    if (cached) {
      this.tenantCache.delete(identifier);
      this.cacheExpiry.delete(identifier);
    }
    
    return null;
  }

  /**
   * Cache tenant information
   */
  private static cacheTenant(identifier: string, tenant: TenantInfo): void {
    this.tenantCache.set(identifier, tenant);
    this.cacheExpiry.set(identifier, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear tenant cache
   */
  static clearCache(identifier?: string): void {
    if (identifier) {
      this.tenantCache.delete(identifier);
      this.cacheExpiry.delete(identifier);
    } else {
      this.tenantCache.clear();
      this.cacheExpiry.clear();
    }
  }
}
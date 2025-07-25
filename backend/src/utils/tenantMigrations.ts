import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { TenantService } from '@/services/tenantService';
import { createError } from '@/middleware/errorHandler';

export interface Migration {
  version: string;
  name: string;
  description: string;
  up: (schemaName: string, prisma: PrismaClient) => Promise<void>;
  down?: (schemaName: string, prisma: PrismaClient) => Promise<void>;
}

/**
 * Tenant-specific migration system
 * Manages schema changes for individual tenant databases
 */
export class TenantMigrationManager {
  private static migrations: Migration[] = [];

  /**
   * Register a migration
   */
  static registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    // Sort migrations by version
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Run pending migrations for a specific tenant
   */
  static async runMigrations(tenantId: string): Promise<void> {
    try {
      const tenant = await TenantService.validateTenant(tenantId);
      const prisma = getPrismaClient();

      logger.info(`Running migrations for tenant: ${tenant.name} (${tenant.schema_name})`);

      // Get executed migrations for this tenant
      const executedMigrations = await prisma.tenantMigration.findMany({
        where: { tenant_id: tenantId },
        select: { migration: true },
      });

      const executedVersions = new Set(executedMigrations.map(m => m.migration));

      // Run pending migrations
      for (const migration of this.migrations) {
        if (!executedVersions.has(migration.version)) {
          logger.info(`Running migration ${migration.version}: ${migration.name}`);
          
          try {
            await migration.up(tenant.schema_name, prisma);
            
            // Record successful migration
            await prisma.tenantMigration.create({
              data: {
                tenant_id: tenantId,
                migration: migration.version,
              },
            });

            logger.info(`Completed migration ${migration.version} for tenant ${tenant.name}`);
          } catch (error) {
            logger.error(`Failed migration ${migration.version} for tenant ${tenant.name}:`, error);
            throw createError(
              `Migration ${migration.version} failed: ${error}`,
              500,
              'MIGRATION_FAILED'
            );
          }
        }
      }

      logger.info(`All migrations completed for tenant: ${tenant.name}`);
    } catch (error) {
      logger.error(`Error running migrations for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Run migrations for all tenants
   */
  static async runMigrationsForAllTenants(): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      // Get all active tenants
      const tenants = await prisma.tenant.findMany({
        where: { is_active: true },
        select: { id: true, name: true },
      });

      logger.info(`Running migrations for ${tenants.length} tenants`);

      for (const tenant of tenants) {
        try {
          await this.runMigrations(tenant.id);
        } catch (error) {
          logger.error(`Failed to run migrations for tenant ${tenant.name}:`, error);
          // Continue with other tenants
        }
      }

      logger.info('Completed migrations for all tenants');
    } catch (error) {
      logger.error('Error running migrations for all tenants:', error);
      throw error;
    }
  }

  /**
   * Rollback last migration for a tenant
   */
  static async rollbackMigration(tenantId: string, version?: string): Promise<void> {
    try {
      const tenant = await TenantService.validateTenant(tenantId);
      const prisma = getPrismaClient();

      // Get the migration to rollback
      let migrationToRollback: string;
      
      if (version) {
        migrationToRollback = version;
      } else {
        // Get the last executed migration
        const lastMigration = await prisma.tenantMigration.findFirst({
          where: { tenant_id: tenantId },
          orderBy: { executed_at: 'desc' },
        });

        if (!lastMigration) {
          throw createError('No migrations to rollback', 400, 'NO_MIGRATIONS');
        }

        migrationToRollback = lastMigration.migration;
      }

      // Find the migration definition
      const migration = this.migrations.find(m => m.version === migrationToRollback);
      if (!migration || !migration.down) {
        throw createError(
          `Migration ${migrationToRollback} does not support rollback`,
          400,
          'ROLLBACK_NOT_SUPPORTED'
        );
      }

      logger.info(`Rolling back migration ${migrationToRollback} for tenant ${tenant.name}`);

      try {
        await migration.down(tenant.schema_name, prisma);
        
        // Remove migration record
        await prisma.tenantMigration.deleteMany({
          where: {
            tenant_id: tenantId,
            migration: migrationToRollback,
          },
        });

        logger.info(`Rolled back migration ${migrationToRollback} for tenant ${tenant.name}`);
      } catch (error) {
        logger.error(`Failed to rollback migration ${migrationToRollback}:`, error);
        throw createError(
          `Rollback failed: ${error}`,
          500,
          'ROLLBACK_FAILED'
        );
      }
    } catch (error) {
      logger.error(`Error rolling back migration for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get migration status for a tenant
   */
  static async getMigrationStatus(tenantId: string): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    try {
      const prisma = getPrismaClient();

      // Get executed migrations
      const executedMigrations = await prisma.tenantMigration.findMany({
        where: { tenant_id: tenantId },
        select: { migration: true },
        orderBy: { executed_at: 'asc' },
      });

      const executed = executedMigrations.map(m => m.migration);
      const allMigrations = this.migrations.map(m => m.version);
      const pending = allMigrations.filter(v => !executed.includes(v));

      return {
        executed,
        pending,
        total: allMigrations.length,
      };
    } catch (error) {
      logger.error(`Error getting migration status for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get all registered migrations
   */
  static getMigrations(): Migration[] {
    return [...this.migrations];
  }
}

// Register initial migrations
TenantMigrationManager.registerMigration({
  version: 'v1.1.0_add_invoice_tables',
  name: 'Add Invoice Tables',
  description: 'Create invoice, invoice_items, and payment tables',
  up: async (schemaName: string, prisma: PrismaClient) => {
    // Invoices table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`${schemaName}\`.\`invoices\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`invoice_number\` VARCHAR(100) NOT NULL,
        \`type\` ENUM('SALE', 'PURCHASE', 'TRADE') NOT NULL,
        \`customer_id\` VARCHAR(191) NOT NULL,
        \`subtotal\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`tax_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`discount_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`total_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`currency\` VARCHAR(3) DEFAULT 'USD',
        \`status\` ENUM('DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'CANCELLED') DEFAULT 'DRAFT',
        \`due_date\` DATE,
        \`notes\` TEXT,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`created_by\` VARCHAR(191),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_invoices_number\` (\`invoice_number\`),
        INDEX \`idx_invoices_customer\` (\`customer_id\`),
        INDEX \`idx_invoices_status\` (\`status\`),
        INDEX \`idx_invoices_type\` (\`type\`)
      )
    `);

    // Invoice items table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`${schemaName}\`.\`invoice_items\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`invoice_id\` VARCHAR(191) NOT NULL,
        \`product_id\` VARCHAR(191),
        \`description\` VARCHAR(255) NOT NULL,
        \`quantity\` DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
        \`weight\` DECIMAL(10,4),
        \`gold_price\` DECIMAL(15,2),
        \`unit_price\` DECIMAL(15,2) NOT NULL,
        \`total_price\` DECIMAL(15,2) NOT NULL,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_invoice_items_invoice\` (\`invoice_id\`),
        INDEX \`idx_invoice_items_product\` (\`product_id\`)
      )
    `);

    // Payments table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`${schemaName}\`.\`payments\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`invoice_id\` VARCHAR(191) NOT NULL,
        \`amount\` DECIMAL(15,2) NOT NULL,
        \`method\` ENUM('CASH', 'CARD', 'CHEQUE', 'TRANSFER', 'CREDIT') NOT NULL,
        \`reference\` VARCHAR(255),
        \`notes\` TEXT,
        \`payment_date\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`created_by\` VARCHAR(191),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_payments_invoice\` (\`invoice_id\`),
        INDEX \`idx_payments_method\` (\`method\`)
      )
    `);
  },
  down: async (schemaName: string, prisma: PrismaClient) => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${schemaName}\`.\`payments\``);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${schemaName}\`.\`invoice_items\``);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${schemaName}\`.\`invoices\``);
  },
});

TenantMigrationManager.registerMigration({
  version: 'v1.2.0_add_accounting_tables',
  name: 'Add Accounting Tables',
  description: 'Create chart of accounts, journal entries, and ledger tables',
  up: async (schemaName: string, prisma: PrismaClient) => {
    // Chart of accounts
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`${schemaName}\`.\`accounts\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(20) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`type\` ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
        \`parent_id\` VARCHAR(191),
        \`is_active\` BOOLEAN DEFAULT TRUE,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_accounts_code\` (\`code\`),
        INDEX \`idx_accounts_type\` (\`type\`),
        INDEX \`idx_accounts_parent\` (\`parent_id\`)
      )
    `);

    // Journal entries
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`${schemaName}\`.\`journal_entries\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`entry_number\` VARCHAR(100) NOT NULL,
        \`description\` VARCHAR(255) NOT NULL,
        \`reference\` VARCHAR(255),
        \`entry_date\` DATE NOT NULL,
        \`total_debit\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`total_credit\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('DRAFT', 'POSTED', 'REVERSED') DEFAULT 'DRAFT',
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`created_by\` VARCHAR(191),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_journal_entries_number\` (\`entry_number\`),
        INDEX \`idx_journal_entries_date\` (\`entry_date\`),
        INDEX \`idx_journal_entries_status\` (\`status\`)
      )
    `);

    // Journal entry lines
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`${schemaName}\`.\`journal_lines\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`journal_entry_id\` VARCHAR(191) NOT NULL,
        \`account_id\` VARCHAR(191) NOT NULL,
        \`description\` VARCHAR(255),
        \`debit_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`credit_amount\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`created_at\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`idx_journal_lines_entry\` (\`journal_entry_id\`),
        INDEX \`idx_journal_lines_account\` (\`account_id\`)
      )
    `);
  },
  down: async (schemaName: string, prisma: PrismaClient) => {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${schemaName}\`.\`journal_lines\``);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${schemaName}\`.\`journal_entries\``);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${schemaName}\`.\`accounts\``);
  },
});
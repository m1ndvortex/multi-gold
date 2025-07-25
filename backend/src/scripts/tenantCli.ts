#!/usr/bin/env node

import 'module-alias/register';
import dotenv from 'dotenv';
import { Command } from 'commander';
import { connectDatabase, initializeDatabase } from '@/config/database';
import { TenantService } from '@/services/tenantService';
import { TenantMigrationManager } from '@/utils/tenantMigrations';
import { TenantDatabase } from '@/utils/tenantDatabase';
import { logger } from '@/utils/logger';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('tenant-cli')
  .description('CLI for managing tenants in the Jewelry SaaS Platform')
  .version('1.0.0');

// Create tenant command
program
  .command('create')
  .description('Create a new tenant')
  .requiredOption('-n, --name <name>', 'Tenant name')
  .requiredOption('-s, --subdomain <subdomain>', 'Tenant subdomain')
  .requiredOption('-e, --email <email>', 'Contact email')
  .option('-p, --phone <phone>', 'Contact phone')
  .option('--plan <plan>', 'Subscription plan (BASIC, PROFESSIONAL, ENTERPRISE)', 'BASIC')
  .action(async (options) => {
    try {
      await connectDatabase();
      
      logger.info(`Creating tenant: ${options.name}`);
      
      const tenant = await TenantService.createTenant({
        name: options.name,
        subdomain: options.subdomain,
        contact_email: options.email,
        contact_phone: options.phone,
        subscription_plan: options.plan,
      });

      logger.info(`✅ Tenant created successfully:`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Schema: ${tenant.schema_name}`);
      console.log(`   Plan: ${tenant.subscription_plan}`);
      console.log(`   Status: ${tenant.status}`);
      
    } catch (error) {
      logger.error('❌ Failed to create tenant:', error);
      process.exit(1);
    }
  });

// List tenants command
program
  .command('list')
  .description('List all tenants')
  .option('--active-only', 'Show only active tenants')
  .action(async (options) => {
    try {
      await connectDatabase();
      const prisma = (await import('@/config/database')).getPrismaClient();
      
      const tenants = await prisma.tenant.findMany({
        where: options.activeOnly ? { is_active: true } : undefined,
        select: {
          id: true,
          name: true,
          subdomain: true,
          subscription_plan: true,
          status: true,
          is_active: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      });

      if (tenants.length === 0) {
        console.log('No tenants found.');
        return;
      }

      console.log('\n📋 Tenants:');
      console.log('─'.repeat(80));
      
      tenants.forEach((tenant, index) => {
        const status = tenant.is_active ? '🟢' : '🔴';
        console.log(`${index + 1}. ${status} ${tenant.name}`);
        console.log(`   ID: ${tenant.id}`);
        console.log(`   Subdomain: ${tenant.subdomain}`);
        console.log(`   Plan: ${tenant.subscription_plan}`);
        console.log(`   Status: ${tenant.status}`);
        console.log(`   Created: ${tenant.created_at.toISOString()}`);
        console.log('');
      });
      
    } catch (error) {
      logger.error('❌ Failed to list tenants:', error);
      process.exit(1);
    }
  });

// Migrate tenant command
program
  .command('migrate')
  .description('Run migrations for tenants')
  .option('-t, --tenant <tenantId>', 'Specific tenant ID or subdomain')
  .option('--all', 'Run migrations for all tenants')
  .action(async (options) => {
    try {
      await connectDatabase();
      
      if (options.tenant) {
        logger.info(`Running migrations for tenant: ${options.tenant}`);
        await TenantMigrationManager.runMigrations(options.tenant);
        logger.info('✅ Migrations completed successfully');
      } else if (options.all) {
        logger.info('Running migrations for all tenants');
        await TenantMigrationManager.runMigrationsForAllTenants();
        logger.info('✅ Migrations completed for all tenants');
      } else {
        console.log('Please specify --tenant <id> or --all');
        process.exit(1);
      }
      
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    }
  });

// Migration status command
program
  .command('migration-status')
  .description('Check migration status for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID or subdomain')
  .action(async (options) => {
    try {
      await connectDatabase();
      
      const status = await TenantMigrationManager.getMigrationStatus(options.tenant);
      
      console.log(`\n📊 Migration Status for tenant: ${options.tenant}`);
      console.log('─'.repeat(50));
      console.log(`Total migrations: ${status.total}`);
      console.log(`Executed: ${status.executed.length}`);
      console.log(`Pending: ${status.pending.length}`);
      
      if (status.executed.length > 0) {
        console.log('\n✅ Executed migrations:');
        status.executed.forEach(migration => console.log(`   - ${migration}`));
      }
      
      if (status.pending.length > 0) {
        console.log('\n⏳ Pending migrations:');
        status.pending.forEach(migration => console.log(`   - ${migration}`));
      }
      
    } catch (error) {
      logger.error('❌ Failed to get migration status:', error);
      process.exit(1);
    }
  });

// Tenant stats command
program
  .command('stats')
  .description('Get database statistics for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID or subdomain')
  .action(async (options) => {
    try {
      await connectDatabase();
      
      const stats = await TenantDatabase.getTenantStats(options.tenant);
      
      console.log(`\n📈 Database Statistics for tenant: ${options.tenant}`);
      console.log('─'.repeat(50));
      console.log(`Tables: ${stats.tables}`);
      console.log(`Total Records: ${stats.totalRecords}`);
      console.log(`Schema Size: ${stats.schemaSize}`);
      
    } catch (error) {
      logger.error('❌ Failed to get tenant stats:', error);
      process.exit(1);
    }
  });

// Health check command
program
  .command('health')
  .description('Check tenant database health')
  .option('-t, --tenant <tenantId>', 'Specific tenant ID or subdomain')
  .option('--all', 'Check all tenants')
  .action(async (options) => {
    try {
      await connectDatabase();
      
      if (options.tenant) {
        const isHealthy = await TenantDatabase.healthCheck(options.tenant);
        console.log(`Tenant ${options.tenant}: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      } else if (options.all) {
        const prisma = (await import('@/config/database')).getPrismaClient();
        const tenants = await prisma.tenant.findMany({
          where: { is_active: true },
          select: { id: true, name: true, subdomain: true },
        });
        
        console.log('\n🏥 Health Check Results:');
        console.log('─'.repeat(50));
        
        for (const tenant of tenants) {
          const isHealthy = await TenantDatabase.healthCheck(tenant.id);
          const status = isHealthy ? '✅' : '❌';
          console.log(`${status} ${tenant.name} (${tenant.subdomain})`);
        }
      } else {
        // Check main database
        const { healthCheck } = await import('@/config/database');
        const isHealthy = await healthCheck();
        console.log(`Main Database: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      }
      
    } catch (error) {
      logger.error('❌ Health check failed:', error);
      process.exit(1);
    }
  });

// Initialize system command
program
  .command('init')
  .description('Initialize the system database')
  .action(async () => {
    try {
      await connectDatabase();
      await initializeDatabase();
      logger.info('✅ System initialized successfully');
    } catch (error) {
      logger.error('❌ System initialization failed:', error);
      process.exit(1);
    }
  });

// Rollback migration command
program
  .command('rollback')
  .description('Rollback last migration for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID or subdomain')
  .option('-v, --version <version>', 'Specific migration version to rollback')
  .action(async (options) => {
    try {
      await connectDatabase();
      
      logger.info(`Rolling back migration for tenant: ${options.tenant}`);
      await TenantMigrationManager.rollbackMigration(options.tenant, options.version);
      logger.info('✅ Migration rolled back successfully');
      
    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      process.exit(1);
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error: any) {
  // Don't log help display as an error
  if (error.code !== 'commander.helpDisplayed') {
    logger.error('CLI error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await TenantDatabase.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await TenantDatabase.cleanup();
  process.exit(0);
});
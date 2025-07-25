import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { TenantService, TenantInfo } from '@/services/tenantService';
import { createError } from '@/middleware/errorHandler';

/**
 * Tenant-aware database connection utility
 * Provides isolated database access per tenant using separate schemas
 */
export class TenantDatabase {
  private static connections = new Map<string, PrismaClient>();
  private static connectionExpiry = new Map<string, number>();
  private static readonly CONNECTION_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get a tenant-specific database connection
   */
  static async getConnection(tenantId: string): Promise<PrismaClient> {
    try {
      // Check if we have a cached connection
      const cached = this.getCachedConnection(tenantId);
      if (cached) {
        return cached;
      }

      // Validate tenant and get schema info
      const tenant = await TenantService.validateTenant(tenantId);
      
      // Create new connection for tenant schema
      const connection = await this.createTenantConnection(tenant);
      
      // Cache the connection
      this.cacheConnection(tenantId, connection);
      
      return connection;
    } catch (error) {
      logger.error(`Error getting tenant database connection for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a query within tenant context
   */
  static async executeInTenantContext<T>(
    tenantId: string,
    operation: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection(tenantId);
    return await operation(connection);
  }

  /**
   * Execute raw SQL within tenant schema
   */
  static async executeRawInTenant(
    tenantId: string,
    query: string,
    params?: any[]
  ): Promise<any> {
    const tenant = await TenantService.validateTenant(tenantId);
    const connection = await this.getConnection(tenantId);
    
    // Ensure query is executed in tenant schema context
    const schemaQuery = query.includes('USE ') ? query : `USE \`${tenant.schema_name}\`; ${query}`;
    
    if (params) {
      return await connection.$executeRawUnsafe(schemaQuery, ...params);
    } else {
      return await connection.$executeRawUnsafe(schemaQuery);
    }
  }

  /**
   * Create a new tenant-specific connection
   */
  private static async createTenantConnection(tenant: TenantInfo): Promise<PrismaClient> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw createError('Database URL not configured', 500, 'DATABASE_CONFIG_ERROR');
    }

    // Create connection with tenant schema as default
    const connection = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });

    // Set default schema for this connection
    await connection.$executeRawUnsafe(`USE \`${tenant.schema_name}\``);

    // Test the connection
    await connection.$connect();

    logger.debug(`Created tenant database connection for: ${tenant.name} (${tenant.schema_name})`);
    return connection;
  }

  /**
   * Get cached connection if valid
   */
  private static getCachedConnection(tenantId: string): PrismaClient | null {
    const connection = this.connections.get(tenantId);
    const expiry = this.connectionExpiry.get(tenantId);
    
    if (connection && expiry && Date.now() < expiry) {
      return connection;
    }
    
    // Clean up expired connection
    if (connection) {
      this.cleanupConnection(tenantId);
    }
    
    return null;
  }

  /**
   * Cache database connection
   */
  private static cacheConnection(tenantId: string, connection: PrismaClient): void {
    this.connections.set(tenantId, connection);
    this.connectionExpiry.set(tenantId, Date.now() + this.CONNECTION_TTL);
  }

  /**
   * Clean up a specific connection
   */
  private static async cleanupConnection(tenantId: string): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (connection) {
      try {
        await connection.$disconnect();
      } catch (error) {
        logger.error(`Error disconnecting tenant connection ${tenantId}:`, error);
      }
      this.connections.delete(tenantId);
      this.connectionExpiry.delete(tenantId);
    }
  }

  /**
   * Clean up all connections
   */
  static async cleanup(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(tenantId => 
      this.cleanupConnection(tenantId)
    );
    
    await Promise.all(promises);
    logger.info('Cleaned up all tenant database connections');
  }

  /**
   * Health check for tenant database
   */
  static async healthCheck(tenantId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(tenantId);
      await connection.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error(`Tenant database health check failed for ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Get tenant database statistics
   */
  static async getTenantStats(tenantId: string): Promise<{
    tables: number;
    totalRecords: number;
    schemaSize: string;
  }> {
    try {
      const tenant = await TenantService.validateTenant(tenantId);
      const connection = await this.getConnection(tenantId);

      // Get table count
      const tables = await connection.$queryRawUnsafe(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = '${tenant.schema_name}'
      `) as any[];

      // Get total records (approximate)
      const records = await connection.$queryRawUnsafe(`
        SELECT SUM(table_rows) as total_records
        FROM information_schema.tables 
        WHERE table_schema = '${tenant.schema_name}'
      `) as any[];

      // Get schema size
      const size = await connection.$queryRawUnsafe(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables 
        WHERE table_schema = '${tenant.schema_name}'
      `) as any[];

      return {
        tables: tables[0]?.count || 0,
        totalRecords: records[0]?.total_records || 0,
        schemaSize: `${size[0]?.size_mb || 0} MB`,
      };
    } catch (error) {
      logger.error(`Error getting tenant stats for ${tenantId}:`, error);
      throw createError('Failed to get tenant statistics', 500, 'TENANT_STATS_ERROR');
    }
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await TenantDatabase.cleanup();
});

process.on('SIGINT', async () => {
  await TenantDatabase.cleanup();
});
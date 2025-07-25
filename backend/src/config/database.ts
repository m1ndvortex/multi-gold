import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

let prisma: PrismaClient;

export const connectDatabase = async (): Promise<PrismaClient> => {
  try {
    if (!prisma) {
      prisma = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
        errorFormat: 'pretty',
      });

      // Log database queries in development
      if (process.env.NODE_ENV === 'development') {
        (prisma as any).$on('query', (e: any) => {
          logger.debug(`Query: ${e.query}`);
          logger.debug(`Params: ${JSON.stringify(e.params)}`);
          logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      (prisma as any).$on('error', (e: any) => {
        logger.error('Database error:', e);
      });

      (prisma as any).$on('warn', (e: any) => {
        logger.warn('Database warning:', e);
      });

      (prisma as any).$on('info', (e: any) => {
        logger.info('Database info:', e);
      });

      // Test the connection
      await prisma.$connect();
      logger.info('Database connection established');

      // Verify database schema exists
      await verifyDatabaseSchema();
    }

    return prisma;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  }
};

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
};

/**
 * Verify that the main database schema exists and has required tables
 */
async function verifyDatabaseSchema(): Promise<void> {
  try {
    // Check if main tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name IN ('tenants', 'users', 'user_sessions', 'tenant_migrations', 'system_config', 'system_audit_logs')
    ` as any[];

    const existingTables = tables.map((t: any) => t.table_name || t.TABLE_NAME);
    const requiredTables = ['tenants', 'users', 'user_sessions', 'tenant_migrations', 'system_config', 'system_audit_logs'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      logger.warn(`Missing database tables: ${missingTables.join(', ')}`);
      logger.warn('Please run database migrations: npx prisma migrate dev');
    } else {
      logger.info('Database schema verification completed successfully');
    }
  } catch (error) {
    logger.warn('Could not verify database schema:', error);
  }
}

/**
 * Initialize database with system configuration
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    const prisma = getPrismaClient();

    // Check if system is already initialized
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { key: 'system_initialized' },
    });

    if (!existingConfig) {
      // Create initial system configuration
      await prisma.systemConfig.createMany({
        data: [
          {
            key: 'system_initialized',
            value: { initialized: true, version: '1.0.0', timestamp: new Date().toISOString() },
          },
          {
            key: 'default_subscription_plan',
            value: { plan: 'BASIC', trial_days: 30 },
          },
          {
            key: 'system_maintenance',
            value: { enabled: false, message: '' },
          },
        ],
      });

      logger.info('Database initialized with system configuration');
    }
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Health check for database connection
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

export { prisma };
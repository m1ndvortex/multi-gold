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
      });

      // Log database queries in development
      if (process.env.NODE_ENV === 'development') {
        (prisma as any).$on('query', (e: any) => {
          logger.debug(`Query: ${e.query}`);
          logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      (prisma as any).$on('error', (e: any) => {
        logger.error('Database error:', e);
      });

      // Test the connection
      await prisma.$connect();
      logger.info('Database connection established');
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

export { prisma };
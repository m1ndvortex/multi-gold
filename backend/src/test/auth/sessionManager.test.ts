import { PrismaClient } from '@prisma/client';
import { SessionManager, SessionData } from '@/utils/sessionManager';

// Mock dependencies
jest.mock('@/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    pipeline: jest.fn(() => ({
      del: jest.fn(),
      exec: jest.fn(),
    })),
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      userSession: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      systemAuditLog: {
        create: jest.fn(),
      },
    };

    // Create mock Redis client
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      pipeline: jest.fn(() => ({
        del: jest.fn(),
        exec: jest.fn(),
      })),
    };

    // Mock getRedisClient to return our mock
    const { getRedisClient } = require('@/config/redis');
    getRedisClient.mockReturnValue(mockRedis);

    sessionManager = new SessionManager(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    const refreshToken = 'test-refresh-token';

    it('should return session from Redis cache', async () => {
      const testDate = new Date('2023-01-01T00:00:00.000Z');
      const cachedSession: SessionData = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        deviceInfo: { device: 'Desktop' },
        ipAddress: '192.168.1.1',
        lastActivity: testDate,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSession));

      const result = await sessionManager.getSession(refreshToken);

      expect(mockRedis.get).toHaveBeenCalledWith(`session:${refreshToken}`);
      expect(result).toEqual({
        ...cachedSession,
        lastActivity: testDate.toISOString(), // JSON.parse converts dates to strings
      });
      expect(mockPrisma.userSession.findUnique).not.toHaveBeenCalled();
    });

    it('should return session from database when not in cache', async () => {
      const dbSession = {
        id: 'session-123',
        user_id: 'user-123',
        refresh_token: refreshToken,
        device_info: { device: 'Desktop' },
        ip_address: '192.168.1.1',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
        is_active: true,
        user: {
          tenant_id: 'tenant-123',
        },
      };

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.userSession.findUnique.mockResolvedValue(dbSession as any);

      const result = await sessionManager.getSession(refreshToken);

      expect(mockRedis.get).toHaveBeenCalledWith(`session:${refreshToken}`);
      expect(mockPrisma.userSession.findUnique).toHaveBeenCalledWith({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        include: {
          user: true,
        },
      });

      expect(result).toEqual({
        userId: 'user-123',
        tenantId: 'tenant-123',
        deviceInfo: { device: 'Desktop' },
        ipAddress: '192.168.1.1',
        lastActivity: dbSession.updated_at,
      });

      // Should cache the result
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${refreshToken}`,
        7 * 24 * 60 * 60,
        JSON.stringify(result)
      );
    });

    it('should return null for expired session', async () => {
      const expiredSession = {
        id: 'session-123',
        user_id: 'user-123',
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() - 1000), // 1 second ago
        is_active: true,
        user: {
          tenant_id: 'tenant-123',
        },
      };

      mockRedis.get.mockResolvedValue(null);
      mockPrisma.userSession.findUnique.mockResolvedValue(expiredSession as any);

      const result = await sessionManager.getSession(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      const result = await sessionManager.getSession(refreshToken);

      expect(result).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    const refreshToken = 'test-refresh-token';

    it('should update session activity in database and cache', async () => {
      const cachedSession = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        deviceInfo: { device: 'Desktop' },
        ipAddress: '192.168.1.1',
        lastActivity: new Date('2023-01-01'),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSession));
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 } as any);

      await sessionManager.updateSessionActivity(refreshToken);

      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        data: {
          updated_at: expect.any(Date),
        },
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `session:${refreshToken}`,
        7 * 24 * 60 * 60,
        expect.stringContaining('"userId":"user-123"')
      );
    });
  });

  describe('invalidateSession', () => {
    const refreshToken = 'test-refresh-token';

    it('should invalidate session in database and remove from cache', async () => {
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 } as any);

      await sessionManager.invalidateSession(refreshToken);

      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          refresh_token: refreshToken,
        },
        data: {
          is_active: false,
        },
      });

      expect(mockRedis.del).toHaveBeenCalledWith(`session:${refreshToken}`);
    });
  });

  describe('invalidateAllUserSessions', () => {
    const userId = 'user-123';

    it('should invalidate all user sessions', async () => {
      const userSessions = [
        { refresh_token: 'token-1' },
        { refresh_token: 'token-2' },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(userSessions as any);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 } as any);

      const mockPipeline = {
        del: jest.fn(),
        exec: jest.fn(),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await sessionManager.invalidateAllUserSessions(userId);

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      expect(mockPipeline.del).toHaveBeenCalledWith('session:token-1');
      expect(mockPipeline.del).toHaveBeenCalledWith('session:token-2');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const expiredSessions = [
        { refresh_token: 'expired-token-1' },
        { refresh_token: 'expired-token-2' },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(expiredSessions as any);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 2 } as any);

      const mockPipeline = {
        del: jest.fn(),
        exec: jest.fn(),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await sessionManager.cleanupExpiredSessions();

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expires_at: { lt: expect.any(Date) } },
            { is_active: false },
          ],
        },
      });

      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expires_at: { lt: expect.any(Date) } },
            { is_active: false },
          ],
        },
      });

      expect(result).toBe(2);
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const sessions = [
        {
          user_id: 'user-1',
          device_info: { device: 'Desktop' },
          ip_address: '192.168.1.1',
          user: { tenant_id: 'tenant-1' },
        },
        {
          user_id: 'user-2',
          device_info: { device: 'Mobile' },
          ip_address: '192.168.1.2',
          user: { tenant_id: 'tenant-1' },
        },
        {
          user_id: 'user-1',
          device_info: { device: 'Desktop' },
          ip_address: '192.168.1.3',
          user: { tenant_id: 'tenant-2' },
        },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(sessions as any);

      const result = await sessionManager.getSessionStats();

      expect(result).toEqual({
        totalActiveSessions: 3,
        userActiveSessions: 2,
        tenantActiveSessions: 2,
        deviceBreakdown: {
          Desktop: 2,
          Mobile: 1,
        },
        locationBreakdown: {
          'Local Network': 3,
        },
      });
    });

    it('should return tenant-specific statistics', async () => {
      const sessions = [
        {
          user_id: 'user-1',
          device_info: { device: 'Desktop' },
          ip_address: '192.168.1.1',
          user: { tenant_id: 'tenant-1' },
        },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(sessions as any);

      const result = await sessionManager.getSessionStats('tenant-1');

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          is_active: true,
          expires_at: { gt: expect.any(Date) },
          user: {
            tenant_id: 'tenant-1',
          },
        },
        include: {
          user: true,
        },
      });

      expect(result.tenantActiveSessions).toBe(1);
    });
  });

  describe('checkSessionLimit', () => {
    const userId = 'user-123';

    it('should return true when session limit exceeded', async () => {
      mockPrisma.userSession.count.mockResolvedValue(6);

      const result = await sessionManager.checkSessionLimit(userId, 5);

      expect(result).toBe(true);
      expect(mockPrisma.userSession.count).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gt: expect.any(Date) },
        },
      });
    });

    it('should return false when session limit not exceeded', async () => {
      mockPrisma.userSession.count.mockResolvedValue(3);

      const result = await sessionManager.checkSessionLimit(userId, 5);

      expect(result).toBe(false);
    });
  });

  describe('enforceSessionLimit', () => {
    const userId = 'user-123';

    it('should remove oldest sessions when limit exceeded', async () => {
      const sessions = [
        { refresh_token: 'oldest-token', updated_at: new Date('2023-01-01') },
        { refresh_token: 'old-token', updated_at: new Date('2023-01-02') },
        { refresh_token: 'newer-token', updated_at: new Date('2023-01-03') },
        { refresh_token: 'newest-token', updated_at: new Date('2023-01-04') },
        { refresh_token: 'current-token', updated_at: new Date('2023-01-05') },
        { refresh_token: 'latest-token', updated_at: new Date('2023-01-06') },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(sessions as any);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 } as any);

      await sessionManager.enforceSessionLimit(userId, 5);

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gt: expect.any(Date) },
        },
        orderBy: {
          updated_at: 'asc',
        },
      });

      // Should invalidate 2 oldest sessions (6 - 5 + 1 = 2)
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('session:oldest-token');
      expect(mockRedis.del).toHaveBeenCalledWith('session:old-token');
    });

    it('should not remove sessions when limit not exceeded', async () => {
      const sessions = [
        { refresh_token: 'token-1', updated_at: new Date('2023-01-01') },
        { refresh_token: 'token-2', updated_at: new Date('2023-01-02') },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(sessions as any);

      await sessionManager.enforceSessionLimit(userId, 5);

      expect(mockPrisma.userSession.updateMany).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
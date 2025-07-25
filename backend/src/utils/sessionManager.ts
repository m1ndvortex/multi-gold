import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';

export interface SessionData {
  userId: string;
  tenantId: string;
  deviceInfo: any;
  ipAddress: string;
  lastActivity: Date;
}

export interface SessionStats {
  totalActiveSessions: number;
  userActiveSessions: number;
  tenantActiveSessions: number;
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}

export class SessionManager {
  private prisma: PrismaClient;
  private redis: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.redis = getRedisClient();
  }

  /**
   * Get active session by refresh token
   */
  async getSession(refreshToken: string): Promise<SessionData | null> {
    try {
      // Try Redis first for performance
      const cachedSession = await this.redis.get(`session:${refreshToken}`);
      if (cachedSession) {
        return JSON.parse(cachedSession);
      }

      // Fallback to database
      const session = await this.prisma.userSession.findUnique({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        include: {
          user: true,
        },
      });

      if (!session || session.expires_at < new Date()) {
        return null;
      }

      const sessionData: SessionData = {
        userId: session.user_id,
        tenantId: session.user.tenant_id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        lastActivity: session.updated_at,
      };

      // Cache in Redis
      await this.redis.setEx(
        `session:${refreshToken}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(sessionData)
      );

      return sessionData;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(refreshToken: string): Promise<void> {
    try {
      const now = new Date();

      // Update database
      await this.prisma.userSession.updateMany({
        where: {
          refresh_token: refreshToken,
          is_active: true,
        },
        data: {
          updated_at: now,
        },
      });

      // Update Redis cache
      const cachedSession = await this.redis.get(`session:${refreshToken}`);
      if (cachedSession) {
        const sessionData = JSON.parse(cachedSession);
        sessionData.lastActivity = now;
        await this.redis.setEx(
          `session:${refreshToken}`,
          7 * 24 * 60 * 60,
          JSON.stringify(sessionData)
        );
      }
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(refreshToken: string): Promise<void> {
    try {
      // Remove from database
      await this.prisma.userSession.updateMany({
        where: {
          refresh_token: refreshToken,
        },
        data: {
          is_active: false,
        },
      });

      // Remove from Redis
      await this.redis.del(`session:${refreshToken}`);

      logger.info(`Session invalidated: ${refreshToken.substring(0, 10)}...`);
    } catch (error) {
      logger.error('Failed to invalidate session:', error);
      throw error;
    }
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      // Get all user sessions
      const sessions = await this.prisma.userSession.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      // Invalidate in database
      await this.prisma.userSession.updateMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      // Remove from Redis
      const pipeline = this.redis.pipeline();
      sessions.forEach(session => {
        pipeline.del(`session:${session.refresh_token}`);
      });
      await pipeline.exec();

      logger.info(`All sessions invalidated for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to invalidate all user sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();

      // Get expired sessions
      const expiredSessions = await this.prisma.userSession.findMany({
        where: {
          OR: [
            { expires_at: { lt: now } },
            { is_active: false },
          ],
        },
      });

      // Remove from Redis
      if (expiredSessions.length > 0) {
        const pipeline = this.redis.pipeline();
        expiredSessions.forEach(session => {
          pipeline.del(`session:${session.refresh_token}`);
        });
        await pipeline.exec();
      }

      // Delete from database
      const deleteResult = await this.prisma.userSession.deleteMany({
        where: {
          OR: [
            { expires_at: { lt: now } },
            { is_active: false },
          ],
        },
      });

      logger.info(`Cleaned up ${deleteResult.count} expired sessions`);
      return deleteResult.count;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(tenantId?: string): Promise<SessionStats> {
    try {
      const whereClause: any = {
        is_active: true,
        expires_at: { gt: new Date() },
      };

      if (tenantId) {
        whereClause.user = {
          tenant_id: tenantId,
        };
      }

      const sessions = await this.prisma.userSession.findMany({
        where: whereClause,
        include: {
          user: true,
        },
      });

      const deviceBreakdown: Record<string, number> = {};
      const locationBreakdown: Record<string, number> = {};

      sessions.forEach(session => {
        const deviceInfo = session.device_info as any;
        const device = deviceInfo?.device || 'Unknown';
        const location = this.getLocationFromIP(session.ip_address);

        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
        locationBreakdown[location] = (locationBreakdown[location] || 0) + 1;
      });

      return {
        totalActiveSessions: sessions.length,
        userActiveSessions: new Set(sessions.map(s => s.user_id)).size,
        tenantActiveSessions: tenantId ? sessions.length : new Set(sessions.map(s => s.user.tenant_id)).size,
        deviceBreakdown,
        locationBreakdown,
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      throw error;
    }
  }

  /**
   * Detect suspicious sessions
   */
  async detectSuspiciousSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await this.prisma.userSession.findMany({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gt: new Date() },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      const suspiciousSessions = [];
      const ipAddresses = new Set<string>();
      const locations = new Set<string>();

      for (const session of sessions) {
        const deviceInfo = session.device_info as any;
        const location = this.getLocationFromIP(session.ip_address);
        
        // Check for multiple locations
        if (locations.size > 0 && !locations.has(location)) {
          suspiciousSessions.push({
            ...session,
            reason: 'Multiple locations detected',
            severity: 'medium',
          });
        }

        // Check for multiple IP addresses
        if (ipAddresses.size > 0 && !ipAddresses.has(session.ip_address)) {
          suspiciousSessions.push({
            ...session,
            reason: 'Multiple IP addresses detected',
            severity: 'low',
          });
        }

        // Check for unusual device
        if (deviceInfo?.device && deviceInfo.device !== 'Desktop' && deviceInfo.device !== 'Mobile') {
          suspiciousSessions.push({
            ...session,
            reason: 'Unusual device type',
            severity: 'low',
          });
        }

        ipAddresses.add(session.ip_address);
        locations.add(location);
      }

      return suspiciousSessions;
    } catch (error) {
      logger.error('Failed to detect suspicious sessions:', error);
      throw error;
    }
  }

  /**
   * Force logout user from all devices
   */
  async forceLogoutUser(userId: string, reason: string): Promise<void> {
    try {
      await this.invalidateAllUserSessions(userId);

      // Log the action
      await this.prisma.systemAuditLog.create({
        data: {
          action: 'FORCE_LOGOUT',
          entity: 'USER',
          entity_id: userId,
          details: { reason },
          created_at: new Date(),
        },
      });

      logger.warn(`User ${userId} force logged out: ${reason}`);
    } catch (error) {
      logger.error('Failed to force logout user:', error);
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await this.prisma.userSession.findMany({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gt: new Date() },
        },
        orderBy: {
          updated_at: 'desc',
        },
      });

      return sessions.map(session => ({
        id: session.id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        location: this.getLocationFromIP(session.ip_address),
        createdAt: session.created_at,
        lastActivity: session.updated_at,
        expiresAt: session.expires_at,
      }));
    } catch (error) {
      logger.error('Failed to get user active sessions:', error);
      throw error;
    }
  }

  /**
   * Check if session limit exceeded
   */
  async checkSessionLimit(userId: string, maxSessions: number = 5): Promise<boolean> {
    try {
      const activeSessionCount = await this.prisma.userSession.count({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gt: new Date() },
        },
      });

      return activeSessionCount >= maxSessions;
    } catch (error) {
      logger.error('Failed to check session limit:', error);
      return false;
    }
  }

  /**
   * Remove oldest session if limit exceeded
   */
  async enforceSessionLimit(userId: string, maxSessions: number = 5): Promise<void> {
    try {
      const activeSessions = await this.prisma.userSession.findMany({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gt: new Date() },
        },
        orderBy: {
          updated_at: 'asc',
        },
      });

      if (activeSessions.length >= maxSessions) {
        const sessionsToRemove = activeSessions.slice(0, activeSessions.length - maxSessions + 1);
        
        for (const session of sessionsToRemove) {
          await this.invalidateSession(session.refresh_token);
        }

        logger.info(`Enforced session limit for user ${userId}: removed ${sessionsToRemove.length} sessions`);
      }
    } catch (error) {
      logger.error('Failed to enforce session limit:', error);
      throw error;
    }
  }

  /**
   * Get location from IP address (simplified)
   */
  private getLocationFromIP(ipAddress: string): string {
    // In a real implementation, you would use a GeoIP service
    // For now, return a simplified location based on IP patterns
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
      return 'Local Network';
    }
    
    // You could integrate with services like MaxMind GeoIP2, IPinfo, etc.
    return 'Unknown Location';
  }
}
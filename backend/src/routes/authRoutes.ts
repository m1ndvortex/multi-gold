import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthService, LoginCredentials, RegisterData, DeviceInfo } from '@/services/authService';
import { authMiddleware, AuthRequest } from '@/middleware/authMiddleware';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const router = Router();
const prisma = new PrismaClient();
const authService = new AuthService(prisma);

/**
 * Extract device information from request
 */
const extractDeviceInfo = (req: Request): DeviceInfo => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             'unknown';

  return {
    userAgent,
    ip,
    browser: extractBrowser(userAgent),
    os: extractOS(userAgent),
    device: extractDevice(userAgent),
  };
};

/**
 * Extract browser from user agent
 */
const extractBrowser = (userAgent: string): string => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

/**
 * Extract OS from user agent
 */
const extractOS = (userAgent: string): string => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

/**
 * Extract device type from user agent
 */
const extractDevice = (userAgent: string): string => {
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop';
};

/**
 * Validation middleware
 */
const validateRequest = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      errors.array()
    ));
  }
  next();
};

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('tenantId')
    .isString()
    .notEmpty()
    .withMessage('Tenant ID is required'),
  body('role')
    .optional()
    .isIn(['TENANT_ADMIN', 'TENANT_EMPLOYEE', 'CASHIER', 'ACCOUNTANT'])
    .withMessage('Invalid role'),
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const registerData: RegisterData = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.name,
    tenantId: req.body.tenantId,
    role: req.body.role,
  };

  const user = await authService.register(registerData);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user },
  });
}));

/**
 * POST /auth/login
 * Authenticate user
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('twoFactorCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Two-factor code must be 6 digits'),
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const credentials: LoginCredentials = {
    email: req.body.email,
    password: req.body.password,
    twoFactorCode: req.body.twoFactorCode,
  };

  const deviceInfo = extractDeviceInfo(req);
  const result = await authService.login(credentials, deviceInfo);

  if (result.requiresTwoFactor) {
    res.status(200).json({
      success: true,
      message: 'Two-factor authentication required',
      data: {
        requiresTwoFactor: true,
        user: result.user,
      },
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  }
}));

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
  const deviceInfo = extractDeviceInfo(req);
  const tokens = await authService.refreshToken(req.body.refreshToken, deviceInfo);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { tokens },
  });
}));

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
], validateRequest, asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
}));

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
}));

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', authMiddleware, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
], validateRequest, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  await authService.changePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword
  );

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
}));

/**
 * POST /auth/2fa/setup
 * Setup two-factor authentication
 */
router.post('/2fa/setup', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  const result = await authService.enableTwoFactor(req.user.id);

  res.status(200).json({
    success: true,
    message: '2FA setup initiated',
    data: result,
  });
}));

/**
 * POST /auth/2fa/verify
 * Verify and enable two-factor authentication
 */
router.post('/2fa/verify', authMiddleware, [
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Token must be 6 digits'),
], validateRequest, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  await authService.verifyAndEnableTwoFactor(req.user.id, req.body.token);

  res.status(200).json({
    success: true,
    message: '2FA enabled successfully',
  });
}));

/**
 * POST /auth/2fa/disable
 * Disable two-factor authentication
 */
router.post('/2fa/disable', authMiddleware, [
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
], validateRequest, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  await authService.disableTwoFactor(req.user.id, req.body.password);

  res.status(200).json({
    success: true,
    message: '2FA disabled successfully',
  });
}));

/**
 * GET /auth/sessions
 * Get user sessions
 */
router.get('/sessions', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  const sessions = await authService.getUserSessions(req.user.id);

  res.status(200).json({
    success: true,
    data: { sessions },
  });
}));

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke user session
 */
router.delete('/sessions/:sessionId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw createError('User not authenticated', 401, 'NOT_AUTHENTICATED');
  }

  await authService.revokeSession(req.user.id, req.params.sessionId);

  res.status(200).json({
    success: true,
    message: 'Session revoked successfully',
  });
}));

export default router;
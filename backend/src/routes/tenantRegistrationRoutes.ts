import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { TenantRegistrationService, TenantRegistrationData } from '@/services/tenantRegistrationService';
import { authMiddleware, AuthRequest } from '@/middleware/authMiddleware';
import { requirePermission } from '@/middleware/rbacMiddleware';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { auditConfigs } from '@/middleware/auditMiddleware';
import { rateLimitConfigs } from '@/middleware/securityMiddleware';
import { logger } from '@/utils/logger';

const router = Router();
const prisma = new PrismaClient();
const tenantRegistrationService = new TenantRegistrationService(prisma);

/**
 * Validation middleware
 */
const validateRequest = (req: any, res: any, next: any) => {
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
 * POST /register
 * Register a new tenant (public endpoint)
 */
router.post('/register', [
  rateLimitConfigs.registration,
  auditConfigs.tenantRegistration.register,
  
  // Tenant Information
  body('tenantName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tenant name must be between 2 and 100 characters'),
  body('subdomain')
    .trim()
    .isLength({ min: 3, max: 63 })
    .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .withMessage('Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only'),
  body('contactEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid contact email is required'),
  body('contactPhone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number required'),
    
  // Admin User Information
  body('adminName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Admin name must be between 2 and 100 characters'),
  body('adminEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid admin email is required'),
  body('adminPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
  // Optional fields
  body('businessType')
    .optional()
    .isString()
    .withMessage('Business type must be a string'),
  body('businessAddress')
    .optional()
    .isObject()
    .withMessage('Business address must be an object'),
  body('subscriptionPlan')
    .optional()
    .isIn(['BASIC', 'PROFESSIONAL', 'ENTERPRISE'])
    .withMessage('Invalid subscription plan'),
], validateRequest, asyncHandler(async (req, res) => {
  const registrationData: TenantRegistrationData = {
    tenantName: req.body.tenantName,
    subdomain: req.body.subdomain,
    contactEmail: req.body.contactEmail,
    contactPhone: req.body.contactPhone,
    adminName: req.body.adminName,
    adminEmail: req.body.adminEmail,
    adminPassword: req.body.adminPassword,
    businessType: req.body.businessType,
    businessAddress: req.body.businessAddress,
    subscriptionPlan: req.body.subscriptionPlan,
  };

  const result = await tenantRegistrationService.registerTenant(registrationData);

  res.status(201).json({
    success: true,
    message: 'Tenant registered successfully',
    data: result,
  });
}));

/**
 * POST /setup/complete
 * Complete tenant setup wizard (authenticated)
 */
router.post('/setup/complete', [
  authMiddleware,
  requirePermission(['settings.manage']),
  auditConfigs.tenantRegistration.setupComplete,
  
  body('businessProfile')
    .optional()
    .isObject()
    .withMessage('Business profile must be an object'),
  body('financialSettings')
    .optional()
    .isObject()
    .withMessage('Financial settings must be an object'),
  body('notificationPreferences')
    .optional()
    .isObject()
    .withMessage('Notification preferences must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const setupData = {
    businessProfile: req.body.businessProfile,
    financialSettings: req.body.financialSettings,
    notificationPreferences: req.body.notificationPreferences,
  };

  await tenantRegistrationService.completeTenantSetup(req.tenant.id, setupData, req.user.id);

  res.json({
    success: true,
    message: 'Tenant setup completed successfully',
  });
}));

/**
 * GET /setup/status
 * Get tenant setup status (authenticated)
 */
router.get('/setup/status', [
  authMiddleware,
  requirePermission(['settings.view', 'settings.manage']),
], asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const status = await tenantRegistrationService.getTenantSetupStatus(req.tenant.id);

  res.json({
    success: true,
    data: { status },
  });
}));

/**
 * GET /check-subdomain/:subdomain
 * Check subdomain availability (public endpoint)
 */
router.get('/check-subdomain/:subdomain', [
  rateLimitConfigs.general,
], asyncHandler(async (req, res) => {
  const subdomain = req.params.subdomain.toLowerCase().trim();

  // Basic format validation
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
    return res.json({
      success: true,
      data: {
        available: false,
        reason: 'Invalid format',
        message: 'Subdomain must be 3-63 characters, contain only lowercase letters, numbers, and hyphens',
      },
    });
  }

  // Check reserved subdomains
  const reservedSubdomains = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
    'support', 'help', 'docs', 'status', 'test', 'staging', 'dev', 'demo',
  ];

  if (reservedSubdomains.includes(subdomain)) {
    return res.json({
      success: true,
      data: {
        available: false,
        reason: 'Reserved',
        message: 'This subdomain is reserved and cannot be used',
      },
    });
  }

  // Check database availability
  const existingTenant = await prisma.tenant.findUnique({
    where: { subdomain },
  });

  if (existingTenant) {
    return res.json({
      success: true,
      data: {
        available: false,
        reason: 'Taken',
        message: 'This subdomain is already taken',
      },
    });
  }

  res.json({
    success: true,
    data: {
      available: true,
      message: 'Subdomain is available',
    },
  });
}));

/**
 * GET /check-email/:email
 * Check admin email availability (public endpoint)
 */
router.get('/check-email/:email', [
  rateLimitConfigs.general,
], asyncHandler(async (req, res) => {
  const email = req.params.email.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.json({
      success: true,
      data: {
        available: false,
        reason: 'Invalid format',
        message: 'Invalid email format',
      },
    });
  }

  // Check database availability
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    return res.json({
      success: true,
      data: {
        available: false,
        reason: 'Taken',
        message: 'This email is already registered',
      },
    });
  }

  res.json({
    success: true,
    data: {
      available: true,
      message: 'Email is available',
    },
  });
}));

/**
 * GET /registration-stats
 * Get tenant registration statistics (Super Admin only)
 */
router.get('/registration-stats', [
  authMiddleware,
  requirePermission(['*']), // Super admin only
  
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in ISO8601 format'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in ISO8601 format'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const dateRange = req.query.from && req.query.to ? {
    from: new Date(req.query.from as string),
    to: new Date(req.query.to as string),
  } : undefined;

  const stats = await tenantRegistrationService.getRegistrationStats(dateRange);

  res.json({
    success: true,
    data: { stats },
  });
}));

/**
 * GET /subscription-plans
 * Get available subscription plans (public endpoint)
 */
router.get('/subscription-plans', [
  rateLimitConfigs.general,
], asyncHandler(async (req, res) => {
  const plans = [
    {
      id: 'BASIC',
      name: 'Basic',
      price: {
        monthly: 29,
        yearly: 290,
        currency: 'USD',
      },
      features: [
        'Up to 3 users',
        'Basic invoicing',
        'Customer management',
        'Basic inventory',
        'Basic reports',
        '1GB storage',
        'Email support',
      ],
      limits: {
        users: 3,
        storage_gb: 1,
        api_calls_per_month: 1000,
      },
      popular: false,
    },
    {
      id: 'PROFESSIONAL',
      name: 'Professional',
      price: {
        monthly: 79,
        yearly: 790,
        currency: 'USD',
      },
      features: [
        'Up to 10 users',
        'Advanced invoicing',
        'Customer management',
        'Advanced inventory',
        'Accounting module',
        'Advanced reports',
        'Multi-currency support',
        'API access',
        '10GB storage',
        'Priority support',
      ],
      limits: {
        users: 10,
        storage_gb: 10,
        api_calls_per_month: 10000,
      },
      popular: true,
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: {
        monthly: 199,
        yearly: 1990,
        currency: 'USD',
      },
      features: [
        'Unlimited users',
        'All features included',
        'Custom integrations',
        'Advanced security',
        'Dedicated support',
        '100GB storage',
        'Custom branding',
        'SLA guarantee',
      ],
      limits: {
        users: -1, // Unlimited
        storage_gb: 100,
        api_calls_per_month: 100000,
      },
      popular: false,
    },
  ];

  res.json({
    success: true,
    data: { plans },
  });
}));

export default router;
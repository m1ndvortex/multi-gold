import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { TenantSettingsService, TenantSettings } from '@/services/tenantSettingsService';
import { authMiddleware, AuthRequest } from '@/middleware/authMiddleware';
import { requirePermission } from '@/middleware/rbacMiddleware';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { auditConfigs } from '@/middleware/auditMiddleware';
import { logger } from '@/utils/logger';

const router = Router();
const prisma = new PrismaClient();
const tenantSettingsService = new TenantSettingsService(prisma);

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
 * GET /tenant/profile
 * Get tenant profile and settings
 */
router.get('/profile', [
  requirePermission(['settings.view', 'settings.manage']),
], asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const profile = await tenantSettingsService.getTenantProfile(req.tenant.id);

  res.json({
    success: true,
    data: { profile },
  });
}));

/**
 * PUT /tenant/info
 * Update tenant basic information
 */
router.put('/info', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.infoUpdate,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('contact_email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('contact_phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const updateData = {
    name: req.body.name,
    contact_email: req.body.contact_email,
    contact_phone: req.body.contact_phone,
    address: req.body.address,
  };

  const profile = await tenantSettingsService.updateTenantInfo(req.tenant.id, updateData, req.user.id);

  res.json({
    success: true,
    message: 'Tenant information updated successfully',
    data: { profile },
  });
}));

/**
 * GET /tenant/settings
 * Get tenant settings
 */
router.get('/settings', [
  requirePermission(['settings.view', 'settings.manage']),
], asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const settings = await tenantSettingsService.getTenantSettings(req.tenant.id);

  res.json({
    success: true,
    data: { settings },
  });
}));

/**
 * PUT /tenant/settings
 * Update tenant settings
 */
router.put('/settings', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.settingsUpdate,
  body('business')
    .optional()
    .isObject()
    .withMessage('Business settings must be an object'),
  body('financial')
    .optional()
    .isObject()
    .withMessage('Financial settings must be an object'),
  body('system')
    .optional()
    .isObject()
    .withMessage('System settings must be an object'),
  body('security')
    .optional()
    .isObject()
    .withMessage('Security settings must be an object'),
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notification settings must be an object'),
  body('features')
    .optional()
    .isObject()
    .withMessage('Feature settings must be an object'),
  body('customization')
    .optional()
    .isObject()
    .withMessage('Customization settings must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const settingsUpdate: Partial<TenantSettings> = {
    business: req.body.business,
    financial: req.body.financial,
    system: req.body.system,
    security: req.body.security,
    notifications: req.body.notifications,
    features: req.body.features,
    customization: req.body.customization,
  };

  const settings = await tenantSettingsService.updateTenantSettings(req.tenant.id, settingsUpdate, req.user.id);

  res.json({
    success: true,
    message: 'Tenant settings updated successfully',
    data: { settings },
  });
}));

/**
 * POST /tenant/settings/reset
 * Reset tenant settings to defaults
 */
router.post('/settings/reset', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.settingsReset,
], asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const settings = await tenantSettingsService.resetTenantSettings(req.tenant.id, req.user.id);

  res.json({
    success: true,
    message: 'Tenant settings reset to defaults',
    data: { settings },
  });
}));

/**
 * PUT /tenant/logo
 * Update tenant logo
 */
router.put('/logo', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.logoUpdate,
  body('logoUrl')
    .isURL()
    .withMessage('Valid logo URL is required'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  await tenantSettingsService.updateTenantLogo(req.tenant.id, req.body.logoUrl, req.user.id);

  res.json({
    success: true,
    message: 'Tenant logo updated successfully',
  });
}));

/**
 * GET /tenant/subscription
 * Get tenant subscription information
 */
router.get('/subscription', [
  requirePermission(['settings.view', 'settings.manage']),
], asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const subscription = await tenantSettingsService.getTenantSubscription(req.tenant.id);

  res.json({
    success: true,
    data: { subscription },
  });
}));

/**
 * PUT /tenant/settings/business
 * Update business settings specifically
 */
router.put('/settings/business', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.businessUpdate,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  body('contact')
    .optional()
    .isObject()
    .withMessage('Contact must be an object'),
  body('tax_info')
    .optional()
    .isObject()
    .withMessage('Tax info must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const businessSettings = {
    business: {
      name: req.body.name,
      address: req.body.address,
      contact: req.body.contact,
      tax_info: req.body.tax_info,
    },
  };

  const settings = await tenantSettingsService.updateTenantSettings(req.tenant.id, businessSettings, req.user.id);

  res.json({
    success: true,
    message: 'Business settings updated successfully',
    data: { settings: settings.business },
  });
}));

/**
 * PUT /tenant/settings/financial
 * Update financial settings specifically
 */
router.put('/settings/financial', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.financialUpdate,
  body('default_currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be 3 characters'),
  body('gold_pricing')
    .optional()
    .isObject()
    .withMessage('Gold pricing must be an object'),
  body('tax_settings')
    .optional()
    .isObject()
    .withMessage('Tax settings must be an object'),
  body('payment_terms')
    .optional()
    .isObject()
    .withMessage('Payment terms must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const financialSettings = {
    financial: {
      default_currency: req.body.default_currency,
      gold_pricing: req.body.gold_pricing,
      tax_settings: req.body.tax_settings,
      payment_terms: req.body.payment_terms,
    },
  };

  const settings = await tenantSettingsService.updateTenantSettings(req.tenant.id, financialSettings, req.user.id);

  res.json({
    success: true,
    message: 'Financial settings updated successfully',
    data: { settings: settings.financial },
  });
}));

/**
 * PUT /tenant/settings/security
 * Update security settings specifically
 */
router.put('/settings/security', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.securityUpdate,
  body('password_policy')
    .optional()
    .isObject()
    .withMessage('Password policy must be an object'),
  body('session_settings')
    .optional()
    .isObject()
    .withMessage('Session settings must be an object'),
  body('two_factor')
    .optional()
    .isObject()
    .withMessage('Two factor settings must be an object'),
  body('ip_restrictions')
    .optional()
    .isObject()
    .withMessage('IP restrictions must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const securitySettings = {
    security: {
      password_policy: req.body.password_policy,
      session_settings: req.body.session_settings,
      two_factor: req.body.two_factor,
      ip_restrictions: req.body.ip_restrictions,
    },
  };

  const settings = await tenantSettingsService.updateTenantSettings(req.tenant.id, securitySettings, req.user.id);

  res.json({
    success: true,
    message: 'Security settings updated successfully',
    data: { settings: settings.security },
  });
}));

/**
 * PUT /tenant/settings/notifications
 * Update notification settings specifically
 */
router.put('/settings/notifications', [
  requirePermission(['settings.manage']),
  auditConfigs.tenantSettings.notificationUpdate,
  body('email')
    .optional()
    .isObject()
    .withMessage('Email settings must be an object'),
  body('sms')
    .optional()
    .isObject()
    .withMessage('SMS settings must be an object'),
  body('push')
    .optional()
    .isObject()
    .withMessage('Push settings must be an object'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const notificationSettings = {
    notifications: {
      email: req.body.email,
      sms: req.body.sms,
      push: req.body.push,
    },
  };

  const settings = await tenantSettingsService.updateTenantSettings(req.tenant.id, notificationSettings, req.user.id);

  res.json({
    success: true,
    message: 'Notification settings updated successfully',
    data: { settings: settings.notifications },
  });
}));

export default router;
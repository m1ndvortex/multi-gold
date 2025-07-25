import { Router } from 'express';
import { tenantMiddleware } from '@/middleware/tenantMiddleware';
import { authMiddleware } from '@/middleware/authMiddleware';
import { rateLimitConfigs } from '@/middleware/securityMiddleware';
import { auditConfigs } from '@/middleware/auditMiddleware';

// Import route modules
import authRoutes from '@/routes/authRoutes';
import customerRoutes from '@/routes/customerRoutes';
import productRoutes from '@/routes/productRoutes';
import invoiceRoutes from '@/routes/invoiceRoutes';
import accountRoutes from '@/routes/accountRoutes';
import journalRoutes from '@/routes/journalRoutes';
import dashboardRoutes from '@/routes/dashboardRoutes';
import reportRoutes from '@/routes/reportRoutes';
import settingsRoutes from '@/routes/settingsRoutes';
import adminRoutes from '@/routes/adminRoutes';
import userManagementRoutes from '@/routes/userManagementRoutes';
import tenantSettingsRoutes from '@/routes/tenantSettingsRoutes';
import tenantRegistrationRoutes from '@/routes/tenantRegistrationRoutes';

const router = Router();

/**
 * API Version 1 Routes
 * All routes are tenant-aware and include proper middleware
 */

// Health check (no authentication required)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Authentication routes (no tenant middleware required)
router.use('/auth', 
  rateLimitConfigs.auth,
  authRoutes
);

// Tenant registration routes (no tenant middleware required)
router.use('/tenant-registration',
  rateLimitConfigs.general,
  tenantRegistrationRoutes
);

// Apply tenant middleware to all business routes
router.use('/', tenantMiddleware);

// Business entity routes (require authentication and tenant context)
router.use('/customers',
  authMiddleware,
  rateLimitConfigs.general,
  customerRoutes
);

router.use('/products',
  authMiddleware,
  rateLimitConfigs.general,
  productRoutes
);

router.use('/invoices',
  authMiddleware,
  rateLimitConfigs.general,
  invoiceRoutes
);

router.use('/accounts',
  authMiddleware,
  rateLimitConfigs.general,
  accountRoutes
);

router.use('/journal-entries',
  authMiddleware,
  rateLimitConfigs.general,
  journalRoutes
);

router.use('/dashboard',
  authMiddleware,
  rateLimitConfigs.general,
  dashboardRoutes
);

router.use('/reports',
  authMiddleware,
  rateLimitConfigs.general,
  reportRoutes
);

router.use('/settings',
  authMiddleware,
  rateLimitConfigs.general,
  settingsRoutes
);

// User management routes (require authentication and tenant context)
router.use('/users',
  authMiddleware,
  rateLimitConfigs.general,
  userManagementRoutes
);

// Tenant settings routes (require authentication and tenant context)
router.use('/tenant',
  authMiddleware,
  rateLimitConfigs.general,
  tenantSettingsRoutes
);

// Admin routes (require super admin access)
router.use('/admin',
  authMiddleware,
  rateLimitConfigs.general,
  adminRoutes
);

export default router;
import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { PrismaClient, UserRole } from '@prisma/client';
import { UserManagementService, CreateUserData, UpdateUserData, UserListFilters } from '@/services/userManagementService';
import { authMiddleware, AuthRequest } from '@/middleware/authMiddleware';
import { requireRole, requirePermission } from '@/middleware/rbacMiddleware';
import { createError, asyncHandler } from '@/middleware/errorHandler';
import { auditConfigs } from '@/middleware/auditMiddleware';
import { logger } from '@/utils/logger';

const router = Router();
const prisma = new PrismaClient();
const userManagementService = new UserManagementService(prisma);

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
 * GET /users
 * List users within tenant with filtering and pagination
 */
router.get('/', [
  requirePermission(['users.manage', 'users.view']),
  query('search').optional().isString().trim(),
  query('role').optional().isIn(['TENANT_ADMIN', 'TENANT_EMPLOYEE', 'CASHIER', 'ACCOUNTANT']),
  query('is_active').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const filters: UserListFilters = {
    search: req.query.search as string,
    role: req.query.role as UserRole,
    is_active: req.query.is_active as boolean,
    page: req.query.page as number,
    limit: req.query.limit as number,
  };

  const result = await userManagementService.listUsers(req.tenant.id, filters);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /users/:id
 * Get user by ID
 */
router.get('/:id', [
  requirePermission(['users.manage', 'users.view']),
  param('id').isUUID().withMessage('Invalid user ID'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const user = await userManagementService.getUserById(req.tenant.id, req.params.id);

  if (!user) {
    throw createError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: { user },
  });
}));

/**
 * POST /users
 * Create new user
 */
router.post('/', [
  requirePermission(['users.manage']),
  auditConfigs.userManagement.userCreate,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .isIn(['TENANT_ADMIN', 'TENANT_EMPLOYEE', 'CASHIER', 'ACCOUNTANT'])
    .withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const userData: CreateUserData = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.name,
    role: req.body.role,
    permissions: req.body.permissions,
  };

  const user = await userManagementService.createUser(req.tenant.id, userData, req.user.id);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user },
  });
}));

/**
 * PUT /users/:id
 * Update user
 */
router.put('/:id', [
  requirePermission(['users.manage']),
  auditConfigs.userManagement.userUpdate,
  param('id').isUUID().withMessage('Invalid user ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['TENANT_ADMIN', 'TENANT_EMPLOYEE', 'CASHIER', 'ACCOUNTANT'])
    .withMessage('Invalid role'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be boolean'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  // Prevent users from modifying themselves in certain ways
  if (req.params.id === req.user.id) {
    if (req.body.role && req.body.role !== req.user.role) {
      throw createError('Cannot change your own role', 400, 'CANNOT_MODIFY_SELF');
    }
    if (req.body.is_active === false) {
      throw createError('Cannot deactivate yourself', 400, 'CANNOT_MODIFY_SELF');
    }
  }

  const updateData: UpdateUserData = {
    name: req.body.name,
    role: req.body.role,
    permissions: req.body.permissions,
    is_active: req.body.is_active,
  };

  const user = await userManagementService.updateUser(req.tenant.id, req.params.id, updateData, req.user.id);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user },
  });
}));

/**
 * DELETE /users/:id
 * Delete user (soft delete)
 */
router.delete('/:id', [
  requirePermission(['users.manage']),
  auditConfigs.userManagement.userDelete,
  param('id').isUUID().withMessage('Invalid user ID'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  // Prevent users from deleting themselves
  if (req.params.id === req.user.id) {
    throw createError('Cannot delete yourself', 400, 'CANNOT_DELETE_SELF');
  }

  await userManagementService.deleteUser(req.tenant.id, req.params.id, req.user.id);

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
}));

/**
 * POST /users/:id/reset-password
 * Reset user password
 */
router.post('/:id/reset-password', [
  requirePermission(['users.manage']),
  auditConfigs.userManagement.passwordReset,
  param('id').isUUID().withMessage('Invalid user ID'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
], validateRequest, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  await userManagementService.resetUserPassword(
    req.tenant.id,
    req.params.id,
    req.body.newPassword,
    req.user.id
  );

  res.json({
    success: true,
    message: 'Password reset successfully',
  });
}));

/**
 * GET /users/roles/summary
 * Get user roles and permissions summary
 */
router.get('/roles/summary', [
  requirePermission(['users.manage', 'users.view']),
], asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user || !req.tenant) {
    throw createError('Authentication required', 401, 'NOT_AUTHENTICATED');
  }

  const summary = await userManagementService.getUserRolesSummary(req.tenant.id);

  res.json({
    success: true,
    data: summary,
  });
}));

/**
 * GET /users/permissions
 * Get available permissions list
 */
router.get('/permissions', [
  requirePermission(['users.manage']),
], asyncHandler(async (req: AuthRequest, res) => {
  const permissions = [
    {
      category: 'Users',
      permissions: [
        { key: 'users.manage', name: 'Manage Users', description: 'Create, update, and delete users' },
        { key: 'users.view', name: 'View Users', description: 'View user list and details' },
      ],
    },
    {
      category: 'Settings',
      permissions: [
        { key: 'settings.manage', name: 'Manage Settings', description: 'Update system settings and configuration' },
        { key: 'settings.view', name: 'View Settings', description: 'View system settings' },
      ],
    },
    {
      category: 'Invoices',
      permissions: [
        { key: 'invoices.manage', name: 'Manage Invoices', description: 'Create, update, and delete invoices' },
        { key: 'invoices.create', name: 'Create Invoices', description: 'Create new invoices' },
        { key: 'invoices.view', name: 'View Invoices', description: 'View invoice list and details' },
      ],
    },
    {
      category: 'Customers',
      permissions: [
        { key: 'customers.manage', name: 'Manage Customers', description: 'Create, update, and delete customers' },
        { key: 'customers.view', name: 'View Customers', description: 'View customer list and details' },
      ],
    },
    {
      category: 'Inventory',
      permissions: [
        { key: 'inventory.manage', name: 'Manage Inventory', description: 'Create, update, and delete products' },
        { key: 'inventory.view', name: 'View Inventory', description: 'View product list and stock levels' },
      ],
    },
    {
      category: 'Accounting',
      permissions: [
        { key: 'accounting.manage', name: 'Manage Accounting', description: 'Create journal entries and manage accounts' },
        { key: 'accounting.view', name: 'View Accounting', description: 'View accounting data and reports' },
      ],
    },
    {
      category: 'Reports',
      permissions: [
        { key: 'reports.view', name: 'View Reports', description: 'Access financial and business reports' },
        { key: 'reports.export', name: 'Export Reports', description: 'Export reports to PDF/Excel' },
      ],
    },
  ];

  res.json({
    success: true,
    data: { permissions },
  });
}));

export default router;
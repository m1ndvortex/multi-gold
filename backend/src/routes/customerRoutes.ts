import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { validate, businessSchemas, commonSchemas } from '@/middleware/validationMiddleware';
import { auditConfigs } from '@/middleware/auditMiddleware';
import { requirePermission } from '@/middleware/rbacMiddleware';
import { asyncHandler } from '@/middleware/errorHandler';
import { CustomerService, CreateCustomerData, UpdateCustomerData, CustomerSearchFilters, CustomerLedgerEntryData } from '@/services/customerService';
import { CustomerGroup, CustomerStatus, LedgerEntryType } from '@prisma/client';
import multer from 'multer';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenant_id: string;
    role: string;
    permissions: string[];
  };
}

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Validation schemas
const createCustomerSchema = Joi.object({
  name: Joi.string().required().max(255),
  contact_person: Joi.string().optional().max(255),
  phone: Joi.string().optional().max(20),
  mobile: Joi.string().optional().max(20),
  email: Joi.string().email().optional().max(255),
  address: Joi.object({
    street: Joi.string().optional().max(255),
    city: Joi.string().optional().max(100),
    state: Joi.string().optional().max(100),
    postal_code: Joi.string().optional().max(20),
    country: Joi.string().optional().max(100)
  }).optional(),
  tax_id: Joi.string().optional().max(50),
  customer_group: Joi.string().valid(...Object.values(CustomerGroup)).optional(),
  credit_limit: Joi.number().min(0).optional(),
  opening_balance: Joi.number().optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  notes: Joi.string().optional().max(1000),
  birthday: Joi.date().optional(),
  anniversary: Joi.date().optional(),
  preferred_language: Joi.string().valid('fa', 'en').optional(),
  communication_preferences: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    whatsapp: Joi.boolean().optional()
  }).optional()
});

const updateCustomerSchema = createCustomerSchema.fork(
  ['name'], 
  (schema) => schema.optional()
).keys({
  status: Joi.string().valid(...Object.values(CustomerStatus)).optional()
});

const ledgerEntrySchema = Joi.object({
  entry_type: Joi.string().valid(...Object.values(LedgerEntryType)).required(),
  amount: Joi.number().required(),
  currency: Joi.string().optional().default('IRR'),
  description: Joi.string().required().max(255),
  reference_type: Joi.string().optional().max(50),
  reference_id: Joi.string().optional().max(50),
  entry_date: Joi.date().optional()
});

/**
 * Customer Management Routes
 * All routes are tenant-aware and include proper validation and audit logging
 */

// GET /api/v1/customers - List customers with pagination and search
router.get('/',
  requirePermission('customer:read'),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      search: Joi.string().optional(),
      customer_group: Joi.string().valid(...Object.values(CustomerGroup)).optional(),
      status: Joi.string().valid(...Object.values(CustomerStatus)).optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      has_balance: Joi.boolean().optional(),
      credit_limit_exceeded: Joi.boolean().optional(),
      created_from: Joi.date().optional(),
      created_to: Joi.date().optional()
    })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const filters: CustomerSearchFilters = {
      search: req.query.search as string,
      customer_group: req.query.customer_group as CustomerGroup,
      status: req.query.status as CustomerStatus,
      tags: req.query.tags as string[],
      has_balance: req.query.has_balance === 'true',
      credit_limit_exceeded: req.query.credit_limit_exceeded === 'true',
      created_from: req.query.created_from ? new Date(req.query.created_from as string) : undefined,
      created_to: req.query.created_to ? new Date(req.query.created_to as string) : undefined
    };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await customerService.searchCustomers(tenantId, filters, page, limit);

    res.json({
      success: true,
      data: {
        customers: result.customers,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      }
    });
  })
);

// GET /api/v1/customers/:id - Get customer by ID
router.get('/:id',
  requirePermission('customer:read'),
  validate({
    params: Joi.object({ id: commonSchemas.uuid.required() })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const customer = await customerService.getCustomerById(tenantId, req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        customer
      }
    });
  })
);

// POST /api/v1/customers - Create new customer
router.post('/',
  requirePermission('customer:create'),
  auditConfigs.customer.create,
  validate({
    body: createCustomerSchema
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const customer = await customerService.createCustomer(tenantId, req.body, req.user!.id);

    res.status(201).json({
      success: true,
      data: {
        customer
      }
    });
  })
);

// PUT /api/v1/customers/:id - Update customer
router.put('/:id',
  requirePermission('customer:update'),
  auditConfigs.customer.update,
  validate({
    params: Joi.object({ id: commonSchemas.uuid.required() }),
    body: updateCustomerSchema
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    try {
      const customer = await customerService.updateCustomer(tenantId, req.params.id, req.body, req.user!.id);

      res.json({
        success: true,
        data: {
          customer
        }
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found'
          }
        });
      }
      throw error;
    }
  })
);

// DELETE /api/v1/customers/:id - Delete customer
router.delete('/:id',
  requirePermission('customer:delete'),
  auditConfigs.customer.delete,
  validate({
    params: Joi.object({ id: commonSchemas.uuid.required() })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    try {
      await customerService.deleteCustomer(tenantId, req.params.id);

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found'
          }
        });
      }
      throw error;
    }
  })
);

// GET /api/v1/customers/:id/ledger - Get customer ledger
router.get('/:id/ledger',
  requirePermission('customer:read'),
  validate({
    params: Joi.object({ id: commonSchemas.uuid.required() }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(50),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional()
    })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const customer = await customerService.getCustomerById(tenantId, req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Customer not found'
        }
      });
    }

    const ledgerResult = await customerService.getCustomerLedger(tenantId, req.params.id, page, limit);

    res.json({
      success: true,
      data: {
        ledger: ledgerResult.entries,
        customer: {
          id: customer.id,
          name: customer.name,
          current_balance: customer.current_balance,
          credit_limit: customer.credit_limit
        },
        pagination: {
          page,
          limit,
          total: ledgerResult.total,
          totalPages: ledgerResult.totalPages
        }
      }
    });
  })
);

// POST /api/v1/customers/import - Import customers from CSV
router.post('/import',
  requirePermission('customer:create'),
  auditConfigs.customer.create,
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'CSV file is required'
        }
      });
    }

    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    try {
      const csvContent = req.file.buffer.toString('utf-8');
      const result = await customerService.importCustomersFromCSV(
        tenantId,
        csvContent,
        req.file.originalname,
        req.user!.id
      );

      res.json({
        success: true,
        data: {
          imported: result.success,
          errors: result.errors,
          importLogId: result.importLogId
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error.message || 'Failed to import customers'
        }
      });
    }
  })
);

// GET /api/v1/customers/export - Export customers to CSV
router.get('/export',
  requirePermission('customer:read'),
  validate({
    query: Joi.object({
      format: Joi.string().valid('csv').default('csv'),
      customer_group: Joi.string().valid(...Object.values(CustomerGroup)).optional(),
      status: Joi.string().valid(...Object.values(CustomerStatus)).optional(),
      search: Joi.string().optional()
    })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const filters: CustomerSearchFilters = {
      customer_group: req.query.customer_group as CustomerGroup,
      status: req.query.status as CustomerStatus,
      search: req.query.search as string
    };

    try {
      const csvContent = await customerService.exportCustomersToCSV(tenantId, filters);
      
      const filename = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error.message || 'Failed to export customers'
        }
      });
    }
  })
);

// POST /api/v1/customers/:id/ledger - Add ledger entry
router.post('/:id/ledger',
  requirePermission('customer:update'),
  auditConfigs.customer.update,
  validate({
    params: Joi.object({ id: commonSchemas.uuid.required() }),
    body: ledgerEntrySchema
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    try {
      await customerService.createLedgerEntry(tenantId, {
        customer_id: req.params.id,
        ...req.body
      }, req.user!.id);

      res.status(201).json({
        success: true,
        message: 'Ledger entry created successfully'
      });
    } catch (error: any) {
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found'
          }
        });
      }
      throw error;
    }
  })
);

// GET /api/v1/customers/:id/credit-check - Check credit limit
router.get('/:id/credit-check',
  requirePermission('customer:read'),
  validate({
    params: Joi.object({ id: commonSchemas.uuid.required() }),
    query: Joi.object({
      amount: Joi.number().required().min(0)
    })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    try {
      const result = await customerService.checkCreditLimit(
        tenantId,
        req.params.id,
        parseFloat(req.query.amount as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CUSTOMER_NOT_FOUND',
            message: 'Customer not found'
          }
        });
      }
      throw error;
    }
  })
);

// GET /api/v1/customers/tags - Get customer tags
router.get('/tags',
  requirePermission('customer:read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const tags = await customerService.getCustomerTags(tenantId);

    res.json({
      success: true,
      data: {
        tags
      }
    });
  })
);

// POST /api/v1/customers/tags - Create customer tag
router.post('/tags',
  requirePermission('customer:create'),
  validate({
    body: Joi.object({
      name: Joi.string().required().max(50),
      color: Joi.string().optional().pattern(/^#[0-9A-F]{6}$/i),
      description: Joi.string().optional().max(255)
    })
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    try {
      const tag = await customerService.createCustomerTag(
        tenantId,
        req.body.name,
        req.body.color,
        req.body.description
      );

      res.status(201).json({
        success: true,
        data: {
          tag
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'TAG_EXISTS',
            message: 'Tag with this name already exists'
          }
        });
      }
      throw error;
    }
  })
);

// GET /api/v1/customers/statistics - Get customer statistics
router.get('/statistics',
  requirePermission('customer:read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenant_id;
    const customerService = new CustomerService(tenantId);

    const statistics = await customerService.getCustomerStatistics(tenantId);

    res.json({
      success: true,
      data: statistics
    });
  })
);

export default router;
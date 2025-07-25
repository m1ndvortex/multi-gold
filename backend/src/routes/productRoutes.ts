import { Router } from 'express';
import Joi from 'joi';
import { validate, businessSchemas, commonSchemas } from '@/middleware/validationMiddleware';
import { auditConfigs } from '@/middleware/auditMiddleware';
import { requirePermission } from '@/middleware/rbacMiddleware';
import { asyncHandler } from '@/middleware/errorHandler';
import { ProductService } from '@/services/productService';
import { ProductCategory, AdjustmentReason } from '@prisma/client';

const router = Router();

/**
 * Product Management Routes
 * Handles inventory, pricing, and product catalog operations
 */

// GET /api/v1/products - List products with filtering
router.get('/',
  requirePermission('product:read'),
  validate({
    query: commonSchemas.pagination.keys({
      search: Joi.string().optional(),
      category: Joi.string().valid(...Object.values(ProductCategory)).optional(),
      lowStock: Joi.boolean().optional(),
      outOfStock: Joi.boolean().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const { search, category, lowStock, outOfStock } = req.query;
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await productService.listProducts(
      {
        search: search as string,
        category: category as ProductCategory,
        lowStock: lowStock === 'true',
        outOfStock: outOfStock === 'true'
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20,
      sortBy as string || 'created_at',
      sortOrder as 'asc' | 'desc' || 'desc'
    );

    res.json({
      success: true,
      data: result
    });
  })
);

// GET /api/v1/products/:id - Get product by ID
router.get('/:id',
  requirePermission('product:read'),
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        product
      }
    });
  })
);

// POST /api/v1/products - Create new product
router.post('/',
  requirePermission('product:create'),
  auditConfigs.product.create,
  validate({
    body: businessSchemas.product
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id as string;
    const productService = new ProductService(tenantId);
    
    const product = await productService.createProduct(req.body, userId);

    res.status(201).json({
      success: true,
      data: {
        product
      }
    });
  })
);

// PUT /api/v1/products/:id - Update product
router.put('/:id',
  requirePermission('product:update'),
  auditConfigs.product.update,
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    }),
    body: businessSchemas.product.fork(['name', 'sku', 'category'], (schema) => schema.optional())
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id as string;
    const productService = new ProductService(tenantId);
    
    const product = await productService.updateProduct(req.params.id, req.body, userId);

    res.json({
      success: true,
      data: {
        product
      }
    });
  })
);

// DELETE /api/v1/products/:id - Delete product
router.delete('/:id',
  requirePermission('product:delete'),
  auditConfigs.product.delete,
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    await productService.deleteProduct(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  })
);

// GET /api/v1/products/:id/inventory - Get product inventory details
router.get('/:id/inventory',
  requirePermission('product:read'),
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        inventory: {
          currentStock: product.current_stock,
          minimumStock: product.minimum_stock,
          maximumStock: product.maximum_stock,
          reorderPoint: product.reorder_point,
          availableStock: product.current_stock, // TODO: Subtract reserved stock
          lastUpdated: product.updated_at.toISOString(),
          alerts: [] // TODO: Implement stock alerts
        }
      }
    });
  })
);

// POST /api/v1/products/:id/inventory/adjust - Adjust inventory
router.post('/:id/inventory/adjust',
  requirePermission('product:update'),
  auditConfigs.product.update,
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    }),
    body: Joi.object({
      adjustmentType: Joi.string().valid('increase', 'decrease', 'set').required(),
      quantity: Joi.number().integer().min(0).required(),
      reason: Joi.string().valid(...Object.values(AdjustmentReason)).required(),
      notes: Joi.string().optional(),
      unitCost: Joi.number().min(0).optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id as string;
    const productService = new ProductService(tenantId);
    
    const adjustmentData = {
      productId: req.params.id,
      adjustmentType: req.body.adjustmentType,
      quantity: req.body.quantity,
      reason: req.body.reason,
      notes: req.body.notes,
      unitCost: req.body.unitCost
    };
    
    const product = await productService.adjustInventory(adjustmentData, userId);

    res.json({
      success: true,
      data: {
        product,
        adjustment: adjustmentData
      }
    });
  })
);

// GET /api/v1/products/barcode/:barcode - Find product by barcode
router.get('/barcode/:barcode',
  requirePermission('product:read'),
  validate({
    params: Joi.object({
      barcode: Joi.string().required()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const product = await productService.getProductByBarcode(req.params.barcode);

    res.json({
      success: true,
      data: {
        product
      }
    });
  })
);

// POST /api/v1/products/:id/barcode/generate - Generate barcode for product
router.post('/:id/barcode/generate',
  requirePermission('product:update'),
  auditConfigs.product.update,
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const result = await productService.generateProductBarcode(req.params.id);

    res.json({
      success: true,
      data: result
    });
  })
);

// POST /api/v1/products/:id/qrcode/generate - Generate QR code for product
router.post('/:id/qrcode/generate',
  requirePermission('product:update'),
  auditConfigs.product.update,
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const result = await productService.generateProductQRCode(req.params.id);

    res.json({
      success: true,
      data: result
    });
  })
);

// GET /api/v1/products/low-stock - Get products with low stock
router.get('/low-stock',
  requirePermission('product:read'),
  validate({
    query: commonSchemas.pagination
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const { page, limit } = req.query;
    const result = await productService.getLowStockProducts(
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );

    res.json({
      success: true,
      data: result
    });
  })
);

// GET /api/v1/products/reports/aging - Get inventory aging report
router.get('/reports/aging',
  requirePermission('product:read'),
  validate({
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(90)
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const productService = new ProductService(tenantId);
    
    const { days } = req.query;
    const report = await productService.getInventoryAgingReport(parseInt(days as string) || 90);

    res.json({
      success: true,
      data: {
        report,
        generatedAt: new Date().toISOString()
      }
    });
  })
);

// POST /api/v1/products/:id/bom - Add BOM item to product
router.post('/:id/bom',
  requirePermission('product:update'),
  auditConfigs.product.update,
  validate({
    params: Joi.object({
      id: commonSchemas.uuid.required()
    }),
    body: Joi.object({
      componentId: commonSchemas.uuid.required(),
      quantity: Joi.number().min(0.001).required(),
      unitCost: Joi.number().min(0).optional(),
      wastagePercent: Joi.number().min(0).max(100).default(0),
      notes: Joi.string().optional()
    })
  }),
  asyncHandler(async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id as string;
    const productService = new ProductService(tenantId);
    
    const bomItem = await productService.addBOMItem(req.params.id, req.body, userId);

    res.status(201).json({
      success: true,
      data: {
        bomItem
      }
    });
  })
);

export default router;
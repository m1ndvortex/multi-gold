import request from 'supertest';
import { app } from '@/server';
import { getTenantDatabase } from '@/utils/tenantDatabase';
import { ProductCategory, AdjustmentReason } from '@prisma/client';

// Mock dependencies
jest.mock('@/utils/tenantDatabase');
jest.mock('@/utils/barcodeGenerator');

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    fields: {
      minimum_stock: 'minimum_stock'
    }
  },
  inventoryTransaction: {
    create: jest.fn()
  },
  stockAlert: {
    updateMany: jest.fn(),
    createMany: jest.fn()
  },
  bOMItem: {
    create: jest.fn()
  }
};

(getTenantDatabase as jest.Mock).mockReturnValue(mockPrisma);

describe('Product API Integration Tests', () => {
  const tenantId = 'test-tenant-id';
  const authToken = 'Bearer valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/products', () => {
    it('should list products with pagination', async () => {
      const products = [
        {
          id: '1',
          sku: 'PROD-001',
          name: 'Gold Ring',
          category: ProductCategory.JEWELRY,
          current_stock: 10,
          stock_alerts: []
        },
        {
          id: '2',
          sku: 'PROD-002',
          name: 'Gold Necklace',
          category: ProductCategory.JEWELRY,
          current_stock: 5,
          stock_alerts: []
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(products);
      mockPrisma.product.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          products,
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        }
      });
    });

    it('should filter products by search term', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await request(app)
        .get('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .query({ search: 'gold' })
        .expect(200);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          OR: [
            { name: { contains: 'gold' } },
            { sku: { contains: 'gold' } },
            { description: { contains: 'gold' } }
          ]
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20
      });
    });

    it('should filter products by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await request(app)
        .get('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .query({ category: ProductCategory.JEWELRY })
        .expect(200);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          category: ProductCategory.JEWELRY
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/v1/products')
        .set('x-tenant-id', tenantId)
        .expect(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      await request(app)
        .get('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .query({ page: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return product by ID', async () => {
      const product = {
        id: 'product-id',
        sku: 'PROD-001',
        name: 'Gold Ring',
        category: ProductCategory.JEWELRY,
        bom_items: [],
        stock_alerts: []
      };

      mockPrisma.product.findFirst.mockResolvedValue(product);

      const response = await request(app)
        .get('/api/v1/products/product-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          product
        }
      });
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/products/non-existent-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    });

    it('should return 400 for invalid product ID format', async () => {
      await request(app)
        .get('/api/v1/products/invalid-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(400);
    });
  });

  describe('POST /api/v1/products', () => {
    const productData = {
      sku: 'PROD-001',
      name: 'Gold Ring',
      description: 'Beautiful gold ring',
      category: ProductCategory.JEWELRY,
      weight: 10.5,
      purity: 18,
      manufacturingCost: 100,
      currentStock: 50,
      minimumStock: 10
    };

    it('should create product successfully', async () => {
      const createdProduct = {
        id: 'product-id',
        ...productData,
        created_by: 'user-id'
      };

      mockPrisma.product.findFirst.mockResolvedValue(null); // No existing product
      mockPrisma.product.create.mockResolvedValue(createdProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(productData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          product: createdProduct
        }
      });
    });

    it('should return 400 for invalid product data', async () => {
      const invalidData = {
        // Missing required fields
        name: 'Test Product'
      };

      await request(app)
        .post('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should return 409 for duplicate SKU', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'existing-id' });

      await request(app)
        .post('/api/v1/products')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(productData)
        .expect(409);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    const updateData = {
      name: 'Updated Gold Ring',
      manufacturingCost: 150
    };

    it('should update product successfully', async () => {
      const existingProduct = {
        id: 'product-id',
        sku: 'PROD-001',
        name: 'Gold Ring'
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateData
      };

      mockPrisma.product.findFirst
        .mockResolvedValueOnce(existingProduct) // getProductById call
        .mockResolvedValueOnce(null); // SKU uniqueness check

      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      const response = await request(app)
        .put('/api/v1/products/product-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          product: updatedProduct
        }
      });
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await request(app)
        .put('/api/v1/products/non-existent-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should delete product successfully', async () => {
      const product = {
        id: 'product-id',
        name: 'Gold Ring'
      };

      mockPrisma.product.findFirst.mockResolvedValue(product);
      mockPrisma.product.update.mockResolvedValue({});

      const response = await request(app)
        .delete('/api/v1/products/product-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Product deleted successfully'
      });
    });

    it('should return 404 for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await request(app)
        .delete('/api/v1/products/non-existent-id')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(404);
    });
  });

  describe('POST /api/v1/products/:id/inventory/adjust', () => {
    const adjustmentData = {
      adjustmentType: 'increase',
      quantity: 10,
      reason: AdjustmentReason.FOUND,
      notes: 'Found additional stock'
    };

    it('should adjust inventory successfully', async () => {
      const existingProduct = {
        id: 'product-id',
        current_stock: 50
      };

      const updatedProduct = {
        ...existingProduct,
        current_stock: 60
      };

      mockPrisma.product.findFirst.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/products/product-id/inventory/adjust')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(adjustmentData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          product: updatedProduct,
          adjustment: {
            productId: 'product-id',
            ...adjustmentData
          }
        }
      });
    });

    it('should return 400 for invalid adjustment data', async () => {
      const invalidData = {
        adjustmentType: 'invalid',
        quantity: -5
      };

      await request(app)
        .post('/api/v1/products/product-id/inventory/adjust')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/v1/products/barcode/:barcode', () => {
    it('should find product by barcode', async () => {
      const product = {
        id: 'product-id',
        sku: 'PROD-001',
        name: 'Gold Ring',
        barcode: '123456789012'
      };

      mockPrisma.product.findFirst.mockResolvedValue(product);

      const response = await request(app)
        .get('/api/v1/products/barcode/123456789012')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          product
        }
      });
    });

    it('should return null for non-existent barcode', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/products/barcode/non-existent-barcode')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          product: null
        }
      });
    });
  });

  describe('GET /api/v1/products/low-stock', () => {
    it('should return low stock products', async () => {
      const lowStockProducts = [
        {
          id: '1',
          name: 'Product 1',
          current_stock: 2,
          minimum_stock: 10,
          stock_alerts: []
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(lowStockProducts);
      mockPrisma.product.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/products/low-stock')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          products: lowStockProducts,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        }
      });
    });
  });

  describe('GET /api/v1/products/reports/aging', () => {
    it('should return inventory aging report', async () => {
      const products = [
        {
          id: '1',
          sku: 'PROD-001',
          name: 'Product 1',
          category: ProductCategory.JEWELRY,
          current_stock: 10,
          inventory_transactions: [
            {
              transaction_date: new Date('2024-01-01')
            }
          ]
        }
      ];

      mockPrisma.product.findMany.mockResolvedValue(products);

      const response = await request(app)
        .get('/api/v1/products/reports/aging')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .query({ days: 90 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.report).toHaveLength(1);
      expect(response.body.data.generatedAt).toBeDefined();
    });
  });

  describe('POST /api/v1/products/:id/bom', () => {
    const bomData = {
      componentId: 'component-id',
      quantity: 2.5,
      unitCost: 50,
      wastagePercent: 5,
      notes: 'Test BOM item'
    };

    it('should add BOM item successfully', async () => {
      const product = { id: 'product-id', name: 'Main Product' };
      const component = { id: 'component-id', name: 'Component Product' };
      const bomItem = { id: 'bom-item-id', ...bomData };

      mockPrisma.product.findFirst
        .mockResolvedValueOnce(product) // Main product
        .mockResolvedValueOnce(component); // Component product

      mockPrisma.bOMItem.create.mockResolvedValue(bomItem);

      const response = await request(app)
        .post('/api/v1/products/product-id/bom')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(bomData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          bomItem
        }
      });
    });

    it('should return 400 for invalid BOM data', async () => {
      const invalidData = {
        // Missing required fields
        quantity: 2.5
      };

      await request(app)
        .post('/api/v1/products/product-id/bom')
        .set('Authorization', authToken)
        .set('x-tenant-id', tenantId)
        .send(invalidData)
        .expect(400);
    });
  });
});
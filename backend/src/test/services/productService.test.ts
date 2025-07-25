import { ProductService } from '@/services/productService';
import { getTenantDatabase } from '@/utils/tenantDatabase';
import { ProductCategory, ProductStatus, AdjustmentReason } from '@prisma/client';
import { createError } from '@/middleware/errorHandler';

// Mock the tenant database
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

describe('ProductService', () => {
  let productService: ProductService;
  const tenantId = 'test-tenant-id';
  const userId = 'test-user-id';

  beforeEach(() => {
    productService = new ProductService(tenantId);
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    const productData = {
      sku: 'TEST-001',
      name: 'Test Product',
      description: 'Test Description',
      category: ProductCategory.JEWELRY,
      weight: 10.5,
      purity: 18,
      manufacturing_cost: 100,
      current_stock: 50,
      minimum_stock: 10
    };

    it('should create a product successfully', async () => {
      const expectedProduct = {
        id: 'product-id',
        ...productData,
        current_stock: 50,
        created_by: userId
      };

      mockPrisma.product.findFirst.mockResolvedValue(null); // No existing product
      mockPrisma.product.create.mockResolvedValue(expectedProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await productService.createProduct(productData, userId);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          sku: productData.sku,
          deleted_at: null
        }
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sku: productData.sku,
          name: productData.name,
          category: productData.category,
          created_by: userId
        })
      });

      expect(result).toEqual(expectedProduct);
    });

    it('should throw error if SKU already exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(productService.createProduct(productData, userId))
        .rejects
        .toThrow('Product with this SKU already exists');
    });

    it('should create initial inventory transaction for products with stock', async () => {
      const expectedProduct = {
        id: 'product-id',
        ...productData,
        current_stock: 50
      };

      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue(expectedProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      await productService.createProduct(productData, userId);

      expect(mockPrisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          product_id: 'product-id',
          transaction_type: 'ADJUSTMENT',
          quantity: expect.any(Object), // Decimal
          stock_before: 0,
          stock_after: 50,
          description: 'Initial stock entry',
          created_by: userId
        })
      });
    });
  });

  describe('getProductById', () => {
    it('should return product with BOM items and stock alerts', async () => {
      const expectedProduct = {
        id: 'product-id',
        name: 'Test Product',
        bom_items: [],
        stock_alerts: []
      };

      mockPrisma.product.findFirst.mockResolvedValue(expectedProduct);

      const result = await productService.getProductById('product-id');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'product-id',
          deleted_at: null
        },
        include: {
          bom_items: {
            include: {
              component: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  current_stock: true
                }
              }
            }
          },
          stock_alerts: {
            where: {
              is_resolved: false
            }
          }
        }
      });

      expect(result).toEqual(expectedProduct);
    });

    it('should return null if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const result = await productService.getProductById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('listProducts', () => {
    it('should list products with pagination', async () => {
      const products = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' }
      ];

      mockPrisma.product.findMany.mockResolvedValue(products);
      mockPrisma.product.count.mockResolvedValue(2);

      const result = await productService.listProducts({}, 1, 20);

      expect(result).toEqual({
        products,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('should apply search filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await productService.listProducts({ search: 'test' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          OR: [
            { name: { contains: 'test' } },
            { sku: { contains: 'test' } },
            { description: { contains: 'test' } }
          ]
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20
      });
    });

    it('should apply category filter', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await productService.listProducts({ category: ProductCategory.GOLD });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          category: ProductCategory.GOLD
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20
      });
    });
  });

  describe('updateProduct', () => {
    const updateData = {
      name: 'Updated Product',
      manufacturing_cost: 150
    };

    it('should update product successfully', async () => {
      const existingProduct = {
        id: 'product-id',
        sku: 'TEST-001',
        name: 'Original Product'
      };

      const updatedProduct = {
        ...existingProduct,
        ...updateData
      };

      mockPrisma.product.findFirst
        .mockResolvedValueOnce(existingProduct) // getProductById call
        .mockResolvedValueOnce(null); // SKU uniqueness check

      mockPrisma.product.update.mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct('product-id', updateData, userId);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: expect.objectContaining({
          name: updateData.name,
          updated_at: expect.any(Date)
        })
      });

      expect(result).toEqual(updatedProduct);
    });

    it('should throw error if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(productService.updateProduct('non-existent-id', updateData, userId))
        .rejects
        .toThrow('Product not found');
    });

    it('should check SKU uniqueness when updating SKU', async () => {
      const existingProduct = {
        id: 'product-id',
        sku: 'OLD-SKU'
      };

      mockPrisma.product.findFirst
        .mockResolvedValueOnce(existingProduct) // getProductById call
        .mockResolvedValueOnce({ id: 'other-product' }); // SKU uniqueness check

      await expect(productService.updateProduct('product-id', { sku: 'NEW-SKU' }, userId))
        .rejects
        .toThrow('Product with this SKU already exists');
    });
  });

  describe('adjustInventory', () => {
    const adjustmentData = {
      productId: 'product-id',
      adjustmentType: 'increase' as const,
      quantity: 10,
      reason: AdjustmentReason.FOUND,
      notes: 'Found additional stock'
    };

    it('should increase inventory successfully', async () => {
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

      const result = await productService.adjustInventory(adjustmentData, userId);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: {
          current_stock: 60,
          updated_at: expect.any(Date)
        }
      });

      expect(mockPrisma.inventoryTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          product_id: 'product-id',
          transaction_type: 'ADJUSTMENT',
          quantity: expect.any(Object), // Decimal(10)
          stock_before: 50,
          stock_after: 60,
          adjustment_reason: AdjustmentReason.FOUND,
          description: 'Inventory adjustment: increase',
          notes: 'Found additional stock',
          created_by: userId
        })
      });

      expect(result).toEqual(updatedProduct);
    });

    it('should decrease inventory successfully', async () => {
      const existingProduct = {
        id: 'product-id',
        current_stock: 50
      };

      const decreaseData = {
        ...adjustmentData,
        adjustmentType: 'decrease' as const,
        quantity: 20
      };

      const updatedProduct = {
        ...existingProduct,
        current_stock: 30
      };

      mockPrisma.product.findFirst.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await productService.adjustInventory(decreaseData, userId);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: {
          current_stock: 30,
          updated_at: expect.any(Date)
        }
      });
    });

    it('should set inventory to specific value', async () => {
      const existingProduct = {
        id: 'product-id',
        current_stock: 50
      };

      const setData = {
        ...adjustmentData,
        adjustmentType: 'set' as const,
        quantity: 25
      };

      const updatedProduct = {
        ...existingProduct,
        current_stock: 25
      };

      mockPrisma.product.findFirst.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await productService.adjustInventory(setData, userId);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: {
          current_stock: 25,
          updated_at: expect.any(Date)
        }
      });
    });

    it('should not allow negative stock when decreasing', async () => {
      const existingProduct = {
        id: 'product-id',
        current_stock: 5
      };

      const decreaseData = {
        ...adjustmentData,
        adjustmentType: 'decrease' as const,
        quantity: 10 // More than current stock
      };

      const updatedProduct = {
        ...existingProduct,
        current_stock: 0 // Should be clamped to 0
      };

      mockPrisma.product.findFirst.mockResolvedValue(existingProduct);
      mockPrisma.product.update.mockResolvedValue(updatedProduct);
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      await productService.adjustInventory(decreaseData, userId);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: {
          current_stock: 0,
          updated_at: expect.any(Date)
        }
      });
    });
  });

  describe('addBOMItem', () => {
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

      const result = await productService.addBOMItem('product-id', bomData, userId);

      expect(mockPrisma.bOMItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          product_id: 'product-id',
          component_id: 'component-id',
          quantity: expect.any(Object), // Decimal
          unit_cost: expect.any(Object), // Decimal
          wastage_percent: expect.any(Object), // Decimal
          notes: 'Test BOM item'
        })
      });

      expect(result).toEqual(bomItem);
    });

    it('should throw error if main product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(productService.addBOMItem('non-existent-id', bomData, userId))
        .rejects
        .toThrow('Product not found');
    });

    it('should throw error if component product not found', async () => {
      const product = { id: 'product-id', name: 'Main Product' };

      mockPrisma.product.findFirst
        .mockResolvedValueOnce(product) // Main product
        .mockResolvedValueOnce(null); // Component product not found

      await expect(productService.addBOMItem('product-id', bomData, userId))
        .rejects
        .toThrow('Component product not found');
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products with low stock', async () => {
      const lowStockProducts = [
        { id: '1', name: 'Product 1', current_stock: 2, minimum_stock: 10 },
        { id: '2', name: 'Product 2', current_stock: 5, minimum_stock: 10 }
      ];

      mockPrisma.product.findMany.mockResolvedValue(lowStockProducts);
      mockPrisma.product.count.mockResolvedValue(2);

      const result = await productService.getLowStockProducts(1, 20);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          current_stock: {
            lte: mockPrisma.product.fields.minimum_stock
          }
        },
        include: {
          stock_alerts: {
            where: {
              is_resolved: false
            }
          }
        },
        orderBy: {
          current_stock: 'asc'
        },
        skip: 0,
        take: 20
      });

      expect(result).toEqual({
        products: lowStockProducts,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      });
    });
  });

  describe('getInventoryAgingReport', () => {
    it('should generate inventory aging report', async () => {
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

      const result = await productService.getInventoryAgingReport(90);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        sku: 'PROD-001',
        name: 'Product 1',
        category: ProductCategory.JEWELRY,
        current_stock: 10,
        last_purchase_date: new Date('2024-01-01'),
        days_since_last_purchase: expect.any(Number),
        aging_category: expect.any(String)
      });
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product', async () => {
      const product = { id: 'product-id', name: 'Test Product' };

      mockPrisma.product.findFirst.mockResolvedValue(product);
      mockPrisma.product.update.mockResolvedValue({});

      await productService.deleteProduct('product-id');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: {
          deleted_at: expect.any(Date),
          is_active: false
        }
      });
    });

    it('should throw error if product not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(productService.deleteProduct('non-existent-id'))
        .rejects
        .toThrow('Product not found');
    });
  });
});
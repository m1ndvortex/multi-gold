import { apiClient } from './client';
import { 
  Product, 
  CreateProductData, 
  UpdateProductData, 
  InventoryAdjustmentData,
  ProductCategory,
  BOMItemData
} from '@/types/product';

interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: ProductCategory;
  lowStock?: boolean;
  outOfStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface InventoryDetails {
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  reorderPoint?: number;
  availableStock: number;
  lastUpdated: string;
  alerts: any[];
}

interface BarcodeResponse {
  barcode: string;
  barcodeImage: string;
}

interface QRCodeResponse {
  qrCode: string;
  qrCodeImage: string;
}

interface InventoryAgingReportItem {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  current_stock: number;
  last_purchase_date: string | null;
  days_since_last_purchase: number | null;
  aging_category: string;
}

export const productApi = {
  // Get products with filtering and pagination
  async getProducts(params: ProductListParams = {}) {
    const response = await apiClient.get<{ data: ProductListResponse }>('/products', {
      params
    });
    return response.data;
  },

  // Get product by ID
  async getProduct(id: string) {
    const response = await apiClient.get<{ data: { product: Product } }>(`/products/${id}`);
    return response.data;
  },

  // Create new product
  async createProduct(data: CreateProductData) {
    const response = await apiClient.post<{ data: { product: Product } }>('/products', data);
    return response.data;
  },

  // Update product
  async updateProduct(id: string, data: UpdateProductData) {
    const response = await apiClient.put<{ data: { product: Product } }>(`/products/${id}`, data);
    return response.data;
  },

  // Delete product
  async deleteProduct(id: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/products/${id}`);
    return response.data;
  },

  // Get product inventory details
  async getInventoryDetails(id: string) {
    const response = await apiClient.get<{ data: { inventory: InventoryDetails } }>(`/products/${id}/inventory`);
    return response.data;
  },

  // Adjust inventory
  async adjustInventory(productId: string, data: InventoryAdjustmentData) {
    const response = await apiClient.post<{ data: { product: Product; adjustment: any } }>(
      `/products/${productId}/inventory/adjust`,
      data
    );
    return response.data;
  },

  // Get product by barcode
  async getProductByBarcode(barcode: string) {
    const response = await apiClient.get<{ data: { product: Product | null } }>(`/products/barcode/${barcode}`);
    return response.data;
  },

  // Generate barcode for product
  async generateBarcode(productId: string) {
    const response = await apiClient.post<{ data: BarcodeResponse }>(`/products/${productId}/barcode/generate`);
    return response.data;
  },

  // Generate QR code for product
  async generateQRCode(productId: string) {
    const response = await apiClient.post<{ data: QRCodeResponse }>(`/products/${productId}/qrcode/generate`);
    return response.data;
  },

  // Get low stock products
  async getLowStockProducts(page: number = 1, limit: number = 20) {
    const response = await apiClient.get<{ data: ProductListResponse }>('/products/low-stock', {
      params: { page, limit }
    });
    return response.data;
  },

  // Get inventory aging report
  async getInventoryAgingReport(days: number = 90) {
    const response = await apiClient.get<{ data: { report: InventoryAgingReportItem[]; generatedAt: string } }>(
      '/products/reports/aging',
      { params: { days } }
    );
    return response.data;
  },

  // Add BOM item to product
  async addBOMItem(productId: string, data: BOMItemData) {
    const response = await apiClient.post<{ data: { bomItem: any } }>(`/products/${productId}/bom`, data);
    return response.data;
  },

  // Remove BOM item
  async removeBOMItem(productId: string, bomItemId: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/products/${productId}/bom/${bomItemId}`
    );
    return response.data;
  },

  // Update BOM item
  async updateBOMItem(productId: string, bomItemId: string, data: Partial<BOMItemData>) {
    const response = await apiClient.put<{ data: { bomItem: any } }>(
      `/products/${productId}/bom/${bomItemId}`,
      data
    );
    return response.data;
  },

  // Get product categories (if custom categories are supported)
  async getCategories() {
    const response = await apiClient.get<{ data: { categories: any[] } }>('/products/categories');
    return response.data;
  },

  // Bulk import products
  async importProducts(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<{ data: { imported: number; errors: any[] } }>(
      '/products/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  // Export products
  async exportProducts(format: 'csv' | 'excel' = 'csv', filters: ProductListParams = {}) {
    const response = await apiClient.get('/products/export', {
      params: { format, ...filters },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `products.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Get product stock history
  async getStockHistory(productId: string, page: number = 1, limit: number = 20) {
    const response = await apiClient.get<{ data: { transactions: any[]; pagination: any } }>(
      `/products/${productId}/stock-history`,
      { params: { page, limit } }
    );
    return response.data;
  },

  // Get stock alerts
  async getStockAlerts(resolved: boolean = false) {
    const response = await apiClient.get<{ data: { alerts: any[] } }>('/products/alerts', {
      params: { resolved }
    });
    return response.data;
  },

  // Resolve stock alert
  async resolveStockAlert(alertId: string) {
    const response = await apiClient.patch<{ success: boolean; message: string }>(
      `/products/alerts/${alertId}/resolve`
    );
    return response.data;
  }
};
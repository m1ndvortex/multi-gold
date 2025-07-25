export enum ProductCategory {
  RAW_GOLD = 'RAW_GOLD',
  JEWELRY = 'JEWELRY',
  COINS = 'COINS',
  STONES = 'STONES'
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED'
}

export enum AdjustmentReason {
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  FOUND = 'FOUND',
  EXPIRED = 'EXPIRED',
  RECONCILIATION = 'RECONCILIATION',
  OTHER = 'OTHER'
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  status: ProductStatus;
  
  // Physical properties
  weight?: number;
  purity?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
  };
  
  // Pricing
  manufacturing_cost: number;
  base_price?: number;
  selling_price?: number;
  
  // Inventory
  current_stock: number;
  minimum_stock: number;
  maximum_stock?: number;
  reorder_point?: number;
  
  // Identification
  barcode?: string;
  qr_code?: string;
  internal_code?: string;
  
  // Metadata
  tags?: string[];
  images?: string[];
  notes?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Relations
  bom_items?: BOMItem[];
  stock_alerts?: StockAlert[];
}

export interface BOMItem {
  id: string;
  tenant_id: string;
  product_id: string;
  component_id: string;
  quantity: number;
  unit_cost?: number;
  wastage_percent: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  component?: {
    id: string;
    sku: string;
    name: string;
    current_stock: number;
  };
}

export interface StockAlert {
  id: string;
  tenant_id: string;
  product_id: string;
  alert_type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
  threshold: number;
  current_stock: number;
  message: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  product_id: string;
  transaction_type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'PRODUCTION' | 'WASTAGE' | 'RETURN';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  stock_before: number;
  stock_after: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  adjustment_reason?: AdjustmentReason;
  description: string;
  notes?: string;
  transaction_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  sku: string;
  name: string;
  description?: string;
  category: ProductCategory;
  weight?: number;
  purity?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
  };
  manufacturing_cost?: number;
  base_price?: number;
  selling_price?: number;
  current_stock?: number;
  minimum_stock?: number;
  maximum_stock?: number;
  reorder_point?: number;
  internal_code?: string;
  tags?: string[];
  images?: string[];
  notes?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  status?: ProductStatus;
}

export interface InventoryAdjustmentData {
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: AdjustmentReason;
  notes?: string;
  unitCost?: number;
}

export interface BOMItemData {
  componentId: string;
  quantity: number;
  unitCost?: number;
  wastagePercent?: number;
  notes?: string;
}

export interface ProductFilter {
  search?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryAgingReportItem {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  current_stock: number;
  last_purchase_date: string | null;
  days_since_last_purchase: number | null;
  aging_category: 'Fresh' | 'Moderate' | 'Aging' | 'Stale' | 'Unknown';
}
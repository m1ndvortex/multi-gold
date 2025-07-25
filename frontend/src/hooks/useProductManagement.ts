import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { productApi } from '@/services/api/productApi';
import { Product, ProductCategory, CreateProductData, UpdateProductData, InventoryAdjustmentData } from '@/types/product';

interface ProductFilter {
  search?: string;
  category?: ProductCategory;
  lowStock?: boolean;
  outOfStock?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const useProductManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilter>({});
  const pageSize = 20;

  // Fetch products
  const {
    data: productsData,
    isLoading: loading,
    error
  } = useQuery({
    queryKey: ['products', currentPage, filters],
    queryFn: () => productApi.getProducts({
      page: currentPage,
      limit: pageSize,
      ...filters
    }),
    keepPreviousData: true
  });

  // Fetch low stock products
  const {
    data: lowStockData
  } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => productApi.getLowStockProducts(),
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: productApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('product.createSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || t('product.createError'));
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductData }) =>
      productApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('product.updateSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || t('product.updateError'));
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: productApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('product.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || t('product.deleteError'));
    }
  });

  // Adjust inventory mutation
  const adjustInventoryMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: InventoryAdjustmentData }) =>
      productApi.adjustInventory(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'low-stock'] });
      toast.success(t('product.adjustmentSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || t('product.adjustmentError'));
    }
  });

  // Generate barcode mutation
  const generateBarcodeMutation = useMutation({
    mutationFn: productApi.generateBarcode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('product.barcodeGenerated'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || t('product.barcodeError'));
    }
  });

  // Generate QR code mutation
  const generateQRCodeMutation = useMutation({
    mutationFn: productApi.generateQRCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('product.qrCodeGenerated'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || t('product.qrCodeError'));
    }
  });

  // Search products
  const searchProducts = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  }, []);

  // Filter by category
  const filterByCategory = useCallback((category: ProductCategory | '') => {
    setFilters(prev => ({ 
      ...prev, 
      category: category || undefined 
    }));
    setCurrentPage(1);
  }, []);

  // Filter by stock status
  const filterByStockStatus = useCallback((lowStock: boolean, outOfStock: boolean) => {
    setFilters(prev => ({ 
      ...prev, 
      lowStock: lowStock || undefined,
      outOfStock: outOfStock || undefined
    }));
    setCurrentPage(1);
  }, []);

  // Load specific page
  const loadPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Create product
  const createProduct = useCallback(async (data: CreateProductData) => {
    return createProductMutation.mutateAsync(data);
  }, [createProductMutation]);

  // Update product
  const updateProduct = useCallback(async (id: string, data: UpdateProductData) => {
    return updateProductMutation.mutateAsync({ id, data });
  }, [updateProductMutation]);

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    return deleteProductMutation.mutateAsync(id);
  }, [deleteProductMutation]);

  // Adjust inventory
  const adjustInventory = useCallback(async (productId: string, data: InventoryAdjustmentData) => {
    return adjustInventoryMutation.mutateAsync({ productId, data });
  }, [adjustInventoryMutation]);

  // Generate barcode
  const generateBarcode = useCallback(async (productId: string) => {
    return generateBarcodeMutation.mutateAsync(productId);
  }, [generateBarcodeMutation]);

  // Generate QR code
  const generateQRCode = useCallback(async (productId: string) => {
    return generateQRCodeMutation.mutateAsync(productId);
  }, [generateQRCodeMutation]);

  // Get product by barcode
  const getProductByBarcode = useCallback(async (barcode: string) => {
    try {
      const response = await productApi.getProductByBarcode(barcode);
      return response.data.product;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('product.barcodeNotFound'));
      return null;
    }
  }, [t]);

  // Get inventory aging report
  const getInventoryAgingReport = useCallback(async (days: number = 90) => {
    try {
      const response = await productApi.getInventoryAgingReport(days);
      return response.data.report;
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || t('product.reportError'));
      return [];
    }
  }, [t]);

  const products = productsData?.data?.products || [];
  const pagination: Pagination = productsData?.data?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0
  };
  const lowStockProducts = lowStockData?.data?.products || [];

  return {
    // Data
    products,
    lowStockProducts,
    pagination,
    loading,
    error,

    // Actions
    createProduct,
    updateProduct,
    deleteProduct,
    adjustInventory,
    generateBarcode,
    generateQRCode,
    getProductByBarcode,
    getInventoryAgingReport,

    // Filters and pagination
    searchProducts,
    filterByCategory,
    filterByStockStatus,
    loadPage,

    // Loading states
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    isAdjusting: adjustInventoryMutation.isPending,
    isGeneratingBarcode: generateBarcodeMutation.isPending,
    isGeneratingQRCode: generateQRCodeMutation.isPending
  };
};
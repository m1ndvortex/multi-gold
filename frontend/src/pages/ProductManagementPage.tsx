import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, BarChart3, Package, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Flex } from '@/components/layout/Flex';
import { Grid } from '@/components/layout/Grid';
import { useProductManagement } from '@/hooks/useProductManagement';
import { CreateProductModal } from '@/components/product-management/CreateProductModal';
import { EditProductModal } from '@/components/product-management/EditProductModal';
import { InventoryAdjustmentModal } from '@/components/product-management/InventoryAdjustmentModal';
import { BarcodeGeneratorModal } from '@/components/product-management/BarcodeGeneratorModal';
import { ProductDetailsModal } from '@/components/product-management/ProductDetailsModal';
import { LowStockAlert } from '@/components/product-management/LowStockAlert';
import { ProductCategory, Product } from '@/types/product';

const ProductManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | ''>('');
  const [showLowStock, setShowLowStock] = useState(false);

  const {
    products,
    loading,
    pagination,
    lowStockProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustInventory,
    generateBarcode,
    generateQRCode,
    searchProducts,
    filterByCategory,
    loadPage
  } = useProductManagement();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    searchProducts(value);
  };

  const handleCategoryFilter = (category: ProductCategory | '') => {
    setCategoryFilter(category);
    filterByCategory(category);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleAdjustInventory = (product: Product) => {
    setSelectedProduct(product);
    setShowAdjustmentModal(true);
  };

  const handleGenerateBarcode = (product: Product) => {
    setSelectedProduct(product);
    setShowBarcodeModal(true);
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm(t('product.confirmDelete'))) {
      await deleteProduct(productId);
    }
  };

  const productColumns = [
    {
      key: 'sku',
      title: t('product.sku'),
      render: (product: Product) => (
        <span className="font-mono text-sm">{product.sku}</span>
      )
    },
    {
      key: 'name',
      title: t('product.name'),
      render: (product: Product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-sm text-gray-500">{product.description}</div>
        </div>
      )
    },
    {
      key: 'category',
      title: t('product.category'),
      render: (product: Product) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
          {t(`product.categories.${product.category.toLowerCase()}`)}
        </span>
      )
    },
    {
      key: 'stock',
      title: t('product.stock'),
      render: (product: Product) => (
        <div className="text-center">
          <div className={`font-medium ${
            product.current_stock <= product.minimum_stock 
              ? 'text-red-600' 
              : 'text-green-600'
          }`}>
            {product.current_stock}
          </div>
          <div className="text-xs text-gray-500">
            {t('product.min')}: {product.minimum_stock}
          </div>
          {product.current_stock <= product.minimum_stock && (
            <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mt-1" />
          )}
        </div>
      )
    },
    {
      key: 'price',
      title: t('product.price'),
      render: (product: Product) => (
        <div className="text-right">
          {product.selling_price && (
            <div className="font-medium">
              {new Intl.NumberFormat('fa-IR', {
                style: 'currency',
                currency: 'IRR'
              }).format(Number(product.selling_price))}
            </div>
          )}
          {product.manufacturing_cost && (
            <div className="text-xs text-gray-500">
              {t('product.cost')}: {new Intl.NumberFormat('fa-IR', {
                style: 'currency',
                currency: 'IRR'
              }).format(Number(product.manufacturing_cost))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      title: t('common.actions'),
      render: (product: Product) => (
        <Flex gap="2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(product)}
          >
            {t('common.view')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditProduct(product)}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAdjustInventory(product)}
          >
            {t('product.adjust')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleGenerateBarcode(product)}
          >
            {t('product.barcode')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteProduct(product.id)}
            className="text-red-600 hover:text-red-700"
          >
            {t('common.delete')}
          </Button>
        </Flex>
      )
    }
  ];

  const categoryOptions = [
    { value: '', label: t('product.allCategories') },
    { value: ProductCategory.RAW_GOLD, label: t('product.categories.raw_gold') },
    { value: ProductCategory.JEWELRY, label: t('product.categories.jewelry') },
    { value: ProductCategory.COINS, label: t('product.categories.coins') },
    { value: ProductCategory.STONES, label: t('product.categories.stones') }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Flex justify="between" align="center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('product.management')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('product.managementDescription')}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('product.create')}
        </Button>
      </Flex>

      {/* Stats Cards */}
      <Grid cols="4" gap="6">
        <Card className="p-4">
          <Flex align="center" gap="3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{products.length}</div>
              <div className="text-sm text-gray-600">{t('product.totalProducts')}</div>
            </div>
          </Flex>
        </Card>

        <Card className="p-4">
          <Flex align="center" gap="3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {lowStockProducts.length}
              </div>
              <div className="text-sm text-gray-600">{t('product.lowStock')}</div>
            </div>
          </Flex>
        </Card>

        <Card className="p-4">
          <Flex align="center" gap="3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {products.reduce((sum, p) => sum + p.current_stock, 0)}
              </div>
              <div className="text-sm text-gray-600">{t('product.totalStock')}</div>
            </div>
          </Flex>
        </Card>

        <Card className="p-4">
          <Flex align="center" gap="3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {products.filter(p => p.current_stock === 0).length}
              </div>
              <div className="text-sm text-gray-600">{t('product.outOfStock')}</div>
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <LowStockAlert 
          products={lowStockProducts}
          onViewAll={() => setShowLowStock(true)}
        />
      )}

      {/* Filters */}
      <Card className="p-4">
        <Flex gap="4" align="center">
          <div className="flex-1">
            <Input
              placeholder={t('product.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(value) => handleCategoryFilter(value as ProductCategory | '')}
            options={categoryOptions}
            placeholder={t('product.filterByCategory')}
          />
          <Button
            variant="outline"
            onClick={() => setShowLowStock(!showLowStock)}
            className={showLowStock ? 'bg-red-50 border-red-200' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showLowStock ? t('product.showAll') : t('product.showLowStock')}
          </Button>
        </Flex>
      </Card>

      {/* Products Table */}
      <Card>
        <Table
          data={showLowStock ? lowStockProducts : products}
          columns={productColumns}
          loading={loading}
          pagination={pagination}
          onPageChange={loadPage}
          emptyMessage={t('product.noProducts')}
        />
      </Card>

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createProduct}
      />

      {selectedProduct && (
        <>
          <EditProductModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSubmit={updateProduct}
          />

          <InventoryAdjustmentModal
            isOpen={showAdjustmentModal}
            onClose={() => {
              setShowAdjustmentModal(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSubmit={adjustInventory}
          />

          <BarcodeGeneratorModal
            isOpen={showBarcodeModal}
            onClose={() => {
              setShowBarcodeModal(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onGenerateBarcode={generateBarcode}
            onGenerateQRCode={generateQRCode}
          />

          <ProductDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
          />
        </>
      )}
    </div>
  );
};

export default ProductManagementPage;
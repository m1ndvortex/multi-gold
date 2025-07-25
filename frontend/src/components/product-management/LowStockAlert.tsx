import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Eye, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Flex } from '@/components/layout/Flex';
import { Product } from '@/types/product';

interface LowStockAlertProps {
  products: Product[];
  onViewAll: () => void;
}

export const LowStockAlert: React.FC<LowStockAlertProps> = ({
  products,
  onViewAll
}) => {
  const { t } = useTranslation();

  if (products.length === 0) {
    return null;
  }

  const outOfStockCount = products.filter(p => p.current_stock === 0).length;
  const lowStockCount = products.filter(p => p.current_stock > 0 && p.current_stock <= p.minimum_stock).length;

  return (
    <Card className="p-4 border-l-4 border-l-red-500 bg-red-50">
      <Flex justify="between" align="start">
        <div className="flex-1">
          <Flex align="center" gap="2" className="mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">
              {t('product.stockAlert')}
            </h3>
          </Flex>
          
          <div className="text-red-700 mb-3">
            <p className="mb-1">
              {t('product.stockAlertMessage', { count: products.length })}
            </p>
            <div className="text-sm space-y-1">
              {outOfStockCount > 0 && (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>
                    {t('product.outOfStockCount', { count: outOfStockCount })}
                  </span>
                </div>
              )}
              {lowStockCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {t('product.lowStockCount', { count: lowStockCount })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Show first few products */}
          <div className="space-y-2 mb-3">
            {products.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between bg-white p-2 rounded border"
              >
                <div>
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-xs text-gray-600">
                    {t('product.sku')}: {product.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium text-sm ${
                    product.current_stock === 0 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {product.current_stock === 0 
                      ? t('product.outOfStock')
                      : `${product.current_stock} / ${product.minimum_stock}`
                    }
                  </div>
                  <div className="text-xs text-gray-500">
                    {product.current_stock === 0 
                      ? t('product.noStock')
                      : t('product.belowMinimum')
                    }
                  </div>
                </div>
              </div>
            ))}
            
            {products.length > 3 && (
              <div className="text-sm text-red-600 text-center py-2">
                {t('product.andMoreProducts', { count: products.length - 3 })}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onViewAll}
          className="border-red-200 text-red-700 hover:bg-red-100"
        >
          <Eye className="w-4 h-4 mr-2" />
          {t('product.viewAll')}
        </Button>
      </Flex>
    </Card>
  );
};
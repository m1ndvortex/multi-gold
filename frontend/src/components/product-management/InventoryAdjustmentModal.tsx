import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Flex } from '@/components/layout/Flex';
import { Grid } from '@/components/layout/Grid';
import { Product, AdjustmentReason, InventoryAdjustmentData } from '@/types/product';
import { Package, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';

const adjustmentSchema = z.object({
  adjustmentType: z.enum(['increase', 'decrease', 'set']),
  quantity: z.number().min(0, 'Quantity must be positive'),
  reason: z.nativeEnum(AdjustmentReason),
  notes: z.string().optional(),
  unitCost: z.number().min(0).optional()
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSubmit: (productId: string, data: InventoryAdjustmentData) => Promise<void>;
}

export const InventoryAdjustmentModal: React.FC<InventoryAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema)
  });

  const adjustmentType = watch('adjustmentType');
  const quantity = watch('quantity');

  const handleFormSubmit = async (data: AdjustmentFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(product.id, data);
      reset();
      onClose();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const calculateNewStock = () => {
    if (!quantity || !adjustmentType) return product.current_stock;
    
    switch (adjustmentType) {
      case 'increase':
        return product.current_stock + quantity;
      case 'decrease':
        return Math.max(0, product.current_stock - quantity);
      case 'set':
        return quantity;
      default:
        return product.current_stock;
    }
  };

  const adjustmentTypeOptions = [
    { 
      value: 'increase', 
      label: t('product.adjustment.increase'),
      icon: <TrendingUp className="w-4 h-4" />
    },
    { 
      value: 'decrease', 
      label: t('product.adjustment.decrease'),
      icon: <TrendingDown className="w-4 h-4" />
    },
    { 
      value: 'set', 
      label: t('product.adjustment.set'),
      icon: <RotateCcw className="w-4 h-4" />
    }
  ];

  const reasonOptions = [
    { value: AdjustmentReason.DAMAGED, label: t('product.adjustmentReasons.damaged') },
    { value: AdjustmentReason.LOST, label: t('product.adjustmentReasons.lost') },
    { value: AdjustmentReason.FOUND, label: t('product.adjustmentReasons.found') },
    { value: AdjustmentReason.EXPIRED, label: t('product.adjustmentReasons.expired') },
    { value: AdjustmentReason.RECONCILIATION, label: t('product.adjustmentReasons.reconciliation') },
    { value: AdjustmentReason.OTHER, label: t('product.adjustmentReasons.other') }
  ];

  const newStock = calculateNewStock();
  const stockChange = newStock - product.current_stock;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('product.adjustInventory')}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Product Information */}
        <Card className="p-4 bg-gray-50">
          <Flex align="center" gap="3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-gray-600">
                {t('product.sku')}: {product.sku}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{product.current_stock}</div>
              <div className="text-sm text-gray-600">{t('product.currentStock')}</div>
            </div>
          </Flex>
        </Card>

        {/* Adjustment Details */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">{t('product.adjustmentDetails')}</h3>
          
          <div className="space-y-4">
            <Select
              label={t('product.adjustmentType')}
              {...register('adjustmentType')}
              options={adjustmentTypeOptions}
              error={errors.adjustmentType?.message}
              placeholder={t('product.selectAdjustmentType')}
              required
            />

            <Input
              label={t('product.quantity')}
              type="number"
              min="0"
              step="1"
              {...register('quantity', { valueAsNumber: true })}
              error={errors.quantity?.message}
              placeholder="0"
              required
            />

            <Select
              label={t('product.reason')}
              {...register('reason')}
              options={reasonOptions}
              error={errors.reason?.message}
              placeholder={t('product.selectReason')}
              required
            />

            <Input
              label={t('product.unitCost')}
              type="number"
              step="0.01"
              {...register('unitCost', { valueAsNumber: true })}
              error={errors.unitCost?.message}
              placeholder="0.00"
              suffix={t('common.currency')}
            />

            <Input
              label={t('product.notes')}
              {...register('notes')}
              error={errors.notes?.message}
              placeholder={t('product.adjustmentNotesPlaceholder')}
              multiline
              rows={3}
            />
          </div>
        </Card>

        {/* Stock Preview */}
        {adjustmentType && quantity && (
          <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800 mb-3">
              {t('product.stockPreview')}
            </h4>
            <Grid cols="3" gap="4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {product.current_stock}
                </div>
                <div className="text-sm text-gray-600">
                  {t('product.currentStock')}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  stockChange > 0 ? 'text-green-600' : 
                  stockChange < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stockChange > 0 ? '+' : ''}{stockChange}
                </div>
                <div className="text-sm text-gray-600">
                  {t('product.change')}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  newStock <= product.minimum_stock ? 'text-red-600' : 'text-green-600'
                }`}>
                  {newStock}
                </div>
                <div className="text-sm text-gray-600">
                  {t('product.newStock')}
                </div>
              </div>
            </Grid>
            
            {newStock <= product.minimum_stock && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-red-700 text-sm">
                {t('product.belowMinimumWarning', { minimum: product.minimum_stock })}
              </div>
            )}
          </Card>
        )}

        {/* Actions */}
        <Flex justify="end" gap="3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
          >
            {t('product.adjustStock')}
          </Button>
        </Flex>
      </form>
    </Modal>
  );
};
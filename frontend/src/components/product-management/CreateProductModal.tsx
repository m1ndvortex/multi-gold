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
import { ProductCategory, CreateProductData } from '@/types/product';

const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.nativeEnum(ProductCategory),
  weight: z.number().min(0).optional(),
  purity: z.number().min(0).max(100).optional(),
  manufacturing_cost: z.number().min(0).default(0),
  base_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  current_stock: z.number().int().min(0).default(0),
  minimum_stock: z.number().int().min(0).default(0),
  maximum_stock: z.number().int().min(0).optional(),
  reorder_point: z.number().int().min(0).optional(),
  internal_code: z.string().optional(),
  notes: z.string().optional()
});

type CreateProductFormData = z.infer<typeof createProductSchema>;

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductData) => Promise<void>;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      manufacturing_cost: 0,
      current_stock: 0,
      minimum_stock: 0
    }
  });

  const selectedCategory = watch('category');

  const handleFormSubmit = async (data: CreateProductFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
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

  const categoryOptions = [
    { value: ProductCategory.RAW_GOLD, label: t('product.categories.raw_gold') },
    { value: ProductCategory.JEWELRY, label: t('product.categories.jewelry') },
    { value: ProductCategory.COINS, label: t('product.categories.coins') },
    { value: ProductCategory.STONES, label: t('product.categories.stones') }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('product.create')}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">{t('product.basicInfo')}</h3>
          <Grid cols="2" gap="4">
            <Input
              label={t('product.sku')}
              {...register('sku')}
              error={errors.sku?.message}
              placeholder={t('product.skuPlaceholder')}
              required
            />
            <Input
              label={t('product.name')}
              {...register('name')}
              error={errors.name?.message}
              placeholder={t('product.namePlaceholder')}
              required
            />
          </Grid>
          
          <div className="mt-4">
            <Input
              label={t('product.description')}
              {...register('description')}
              error={errors.description?.message}
              placeholder={t('product.descriptionPlaceholder')}
              multiline
              rows={3}
            />
          </div>

          <div className="mt-4">
            <Select
              label={t('product.category')}
              {...register('category')}
              options={categoryOptions}
              error={errors.category?.message}
              placeholder={t('product.selectCategory')}
              required
            />
          </div>
        </Card>

        {/* Physical Properties */}
        {(selectedCategory === ProductCategory.RAW_GOLD || selectedCategory === ProductCategory.JEWELRY) && (
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">{t('product.physicalProperties')}</h3>
            <Grid cols="2" gap="4">
              <Input
                label={t('product.weight')}
                type="number"
                step="0.001"
                {...register('weight', { valueAsNumber: true })}
                error={errors.weight?.message}
                placeholder="0.000"
                suffix={t('product.grams')}
              />
              <Input
                label={t('product.purity')}
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('purity', { valueAsNumber: true })}
                error={errors.purity?.message}
                placeholder="18.00"
                suffix="%"
              />
            </Grid>
          </Card>
        )}

        {/* Pricing */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">{t('product.pricing')}</h3>
          <Grid cols="3" gap="4">
            <Input
              label={t('product.manufacturingCost')}
              type="number"
              step="0.01"
              {...register('manufacturing_cost', { valueAsNumber: true })}
              error={errors.manufacturing_cost?.message}
              placeholder="0.00"
              suffix={t('common.currency')}
            />
            <Input
              label={t('product.basePrice')}
              type="number"
              step="0.01"
              {...register('base_price', { valueAsNumber: true })}
              error={errors.base_price?.message}
              placeholder="0.00"
              suffix={t('common.currency')}
            />
            <Input
              label={t('product.sellingPrice')}
              type="number"
              step="0.01"
              {...register('selling_price', { valueAsNumber: true })}
              error={errors.selling_price?.message}
              placeholder="0.00"
              suffix={t('common.currency')}
            />
          </Grid>
        </Card>

        {/* Inventory */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">{t('product.inventory')}</h3>
          <Grid cols="2" gap="4">
            <Input
              label={t('product.currentStock')}
              type="number"
              {...register('current_stock', { valueAsNumber: true })}
              error={errors.current_stock?.message}
              placeholder="0"
            />
            <Input
              label={t('product.minimumStock')}
              type="number"
              {...register('minimum_stock', { valueAsNumber: true })}
              error={errors.minimum_stock?.message}
              placeholder="0"
            />
          </Grid>
          <Grid cols="2" gap="4" className="mt-4">
            <Input
              label={t('product.maximumStock')}
              type="number"
              {...register('maximum_stock', { valueAsNumber: true })}
              error={errors.maximum_stock?.message}
              placeholder="0"
            />
            <Input
              label={t('product.reorderPoint')}
              type="number"
              {...register('reorder_point', { valueAsNumber: true })}
              error={errors.reorder_point?.message}
              placeholder="0"
            />
          </Grid>
        </Card>

        {/* Additional Information */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">{t('product.additionalInfo')}</h3>
          <Input
            label={t('product.internalCode')}
            {...register('internal_code')}
            error={errors.internal_code?.message}
            placeholder={t('product.internalCodePlaceholder')}
          />
          <div className="mt-4">
            <Input
              label={t('product.notes')}
              {...register('notes')}
              error={errors.notes?.message}
              placeholder={t('product.notesPlaceholder')}
              multiline
              rows={3}
            />
          </div>
        </Card>

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
            {t('product.create')}
          </Button>
        </Flex>
      </form>
    </Modal>
  );
};
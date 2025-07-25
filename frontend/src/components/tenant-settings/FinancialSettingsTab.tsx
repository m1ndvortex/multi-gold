import React from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface FinancialSettingsTabProps {
  settings: any;
  onChange: (updates: any) => void;
}

export const FinancialSettingsTab: React.FC<FinancialSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  const currencyOptions = [
    { value: 'IRR', label: 'ریال ایران (IRR)' },
    { value: 'USD', label: 'دلار آمریکا (USD)' },
    { value: 'EUR', label: 'یورو (EUR)' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">تنظیمات مالی</h3>
        
        {/* Default Currency */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ارز پیش‌فرض *
          </label>
          <Select
            value={settings.default_currency || 'IRR'}
            onChange={(value) => handleChange('default_currency', value)}
            options={currencyOptions}
          />
        </div>

        {/* Gold Pricing */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">قیمت‌گذاری طلا</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                درصد سود پیش‌فرض (%)
              </label>
              <Input
                type="number"
                value={settings.gold_pricing?.default_markup_percentage || 10}
                onChange={(e) => handleChange('gold_pricing', {
                  ...settings.gold_pricing,
                  default_markup_percentage: parseFloat(e.target.value) || 0
                })}
                placeholder="10"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.gold_pricing?.auto_update_prices || false}
                  onChange={(e) => handleChange('gold_pricing', {
                    ...settings.gold_pricing,
                    auto_update_prices: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="mr-2 text-sm text-gray-700">
                  به‌روزرسانی خودکار قیمت‌ها
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">تنظیمات مالیات</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نرخ مالیات پیش‌فرض (%)
              </label>
              <Input
                type="number"
                value={settings.tax_settings?.default_tax_rate || 9}
                onChange={(e) => handleChange('tax_settings', {
                  ...settings.tax_settings,
                  default_tax_rate: parseFloat(e.target.value) || 0
                })}
                placeholder="9"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.tax_settings?.tax_inclusive || false}
                  onChange={(e) => handleChange('tax_settings', {
                    ...settings.tax_settings,
                    tax_inclusive: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="mr-2 text-sm text-gray-700">
                  مالیات شامل قیمت
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">شرایط پرداخت</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مهلت پرداخت پیش‌فرض (روز)
              </label>
              <Input
                type="number"
                value={settings.payment_terms?.default_payment_days || 30}
                onChange={(e) => handleChange('payment_terms', {
                  ...settings.payment_terms,
                  default_payment_days: parseInt(e.target.value) || 30
                })}
                placeholder="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                درصد جریمه تأخیر (%)
              </label>
              <Input
                type="number"
                value={settings.payment_terms?.late_fee_percentage || 2}
                onChange={(e) => handleChange('payment_terms', {
                  ...settings.payment_terms,
                  late_fee_percentage: parseFloat(e.target.value) || 0
                })}
                placeholder="2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Upload, Building } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface BusinessSettingsTabProps {
  settings: any;
  tenantProfile: any;
  onChange: (updates: any) => void;
  onUpdateInfo: (data: any) => Promise<any>;
  onUpdateLogo: (logoUrl: string) => Promise<void>;
}

export const BusinessSettingsTab: React.FC<BusinessSettingsTabProps> = ({
  settings,
  tenantProfile,
  onChange,
  onUpdateInfo,
  onUpdateLogo,
}) => {
  const [uploading, setUploading] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  const handleAddressChange = (field: string, value: string) => {
    onChange({
      address: {
        ...settings.address,
        [field]: value,
      },
    });
  };

  const handleContactChange = (field: string, value: string) => {
    onChange({
      contact: {
        ...settings.contact,
        [field]: value,
      },
    });
  };

  const handleTaxInfoChange = (field: string, value: string) => {
    onChange({
      tax_info: {
        ...settings.tax_info,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">اطلاعات کسب‌وکار</h3>
        
        {/* Logo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            لوگو
          </label>
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              {tenantProfile?.logo ? (
                <img
                  src={tenantProfile.logo}
                  alt="Logo"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <Building className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // Handle logo upload
                console.log('Upload logo');
              }}
              loading={uploading}
            >
              <Upload className="w-4 h-4 ml-2" />
              آپلود لوگو
            </Button>
          </div>
        </div>

        {/* Business Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            نام کسب‌وکار *
          </label>
          <Input
            value={settings.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="نام کسب‌وکار"
          />
        </div>

        {/* Address */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">آدرس</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                خیابان
              </label>
              <Input
                value={settings.address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                placeholder="آدرس کامل"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شهر
              </label>
              <Input
                value={settings.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="شهر"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                استان
              </label>
              <Input
                value={settings.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                placeholder="استان"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                کد پستی
              </label>
              <Input
                value={settings.address?.postal_code || ''}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                placeholder="کد پستی"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">اطلاعات تماس</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تلفن
              </label>
              <Input
                value={settings.contact?.phone || ''}
                onChange={(e) => handleContactChange('phone', e.target.value)}
                placeholder="شماره تلفن"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ایمیل
              </label>
              <Input
                type="email"
                value={settings.contact?.email || ''}
                onChange={(e) => handleContactChange('email', e.target.value)}
                placeholder="آدرس ایمیل"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                وب‌سایت
              </label>
              <Input
                value={settings.contact?.website || ''}
                onChange={(e) => handleContactChange('website', e.target.value)}
                placeholder="آدرس وب‌سایت"
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">اطلاعات مالیاتی</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شناسه ملی/اقتصادی
              </label>
              <Input
                value={settings.tax_info?.tax_id || ''}
                onChange={(e) => handleTaxInfoChange('tax_id', e.target.value)}
                placeholder="شناسه ملی یا اقتصادی"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                شماره ثبت
              </label>
              <Input
                value={settings.tax_info?.vat_number || ''}
                onChange={(e) => handleTaxInfoChange('vat_number', e.target.value)}
                placeholder="شماره ثبت شرکت"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Select } from '@/components/ui/Select';

interface SystemSettingsTabProps {
  settings: any;
  onChange: (updates: any) => void;
}

export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  const languageOptions = [
    { value: 'fa', label: 'فارسی' },
    { value: 'en', label: 'English' },
  ];

  const timezoneOptions = [
    { value: 'Asia/Tehran', label: 'تهران (Asia/Tehran)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'نیویورک (America/New_York)' },
  ];

  const dateFormatOptions = [
    { value: 'YYYY/MM/DD', label: '۱۴۰۳/۰۱/۱۵ (YYYY/MM/DD)' },
    { value: 'DD/MM/YYYY', label: '۱۵/۰۱/۱۴۰۳ (DD/MM/YYYY)' },
    { value: 'MM/DD/YYYY', label: '۰۱/۱۵/۱۴۰۳ (MM/DD/YYYY)' },
  ];

  const numberFormatOptions = [
    { value: 'fa', label: 'فارسی (۱۲۳۴۵)' },
    { value: 'en', label: 'انگلیسی (12345)' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">تنظیمات سیستم</h3>
        
        {/* Language and Localization */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">زبان و محلی‌سازی</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                زبان سیستم
              </label>
              <Select
                value={settings.language || 'fa'}
                onChange={(value) => handleChange('language', value)}
                options={languageOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                منطقه زمانی
              </label>
              <Select
                value={settings.timezone || 'Asia/Tehran'}
                onChange={(value) => handleChange('timezone', value)}
                options={timezoneOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                فرمت تاریخ
              </label>
              <Select
                value={settings.date_format || 'YYYY/MM/DD'}
                onChange={(value) => handleChange('date_format', value)}
                options={dateFormatOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                فرمت اعداد
              </label>
              <Select
                value={settings.number_format || 'fa'}
                onChange={(value) => handleChange('number_format', value)}
                options={numberFormatOptions}
              />
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.rtl_layout !== false}
                onChange={(e) => handleChange('rtl_layout', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                چیدمان راست به چپ (RTL)
              </span>
            </label>
          </div>
        </div>

        {/* System Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">اطلاعات سیستم</h4>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">نسخه سیستم:</span>
                <span className="text-gray-600 mr-2">1.0.0</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">آخرین به‌روزرسانی:</span>
                <span className="text-gray-600 mr-2">۱۴۰۳/۰۱/۱۵</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">محیط:</span>
                <span className="text-gray-600 mr-2">تولید</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">پایگاه داده:</span>
                <span className="text-gray-600 mr-2">MySQL 8.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
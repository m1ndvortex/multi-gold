import React from 'react';
import { Input } from '@/components/ui/Input';

interface SecuritySettingsTabProps {
  settings: any;
  onChange: (updates: any) => void;
}

export const SecuritySettingsTab: React.FC<SecuritySettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const handlePasswordPolicyChange = (field: string, value: any) => {
    onChange({
      password_policy: {
        ...settings.password_policy,
        [field]: value,
      },
    });
  };

  const handleSessionSettingsChange = (field: string, value: any) => {
    onChange({
      session_settings: {
        ...settings.session_settings,
        [field]: value,
      },
    });
  };

  const handleTwoFactorChange = (field: string, value: any) => {
    onChange({
      two_factor: {
        ...settings.two_factor,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">تنظیمات امنیتی</h3>
        
        {/* Password Policy */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">سیاست رمز عبور</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                حداقل طول رمز عبور
              </label>
              <Input
                type="number"
                value={settings.password_policy?.min_length || 8}
                onChange={(e) => handlePasswordPolicyChange('min_length', parseInt(e.target.value) || 8)}
                placeholder="8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                انقضای رمز عبور (روز)
              </label>
              <Input
                type="number"
                value={settings.password_policy?.expiry_days || ''}
                onChange={(e) => handlePasswordPolicyChange('expiry_days', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="90 (اختیاری)"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.password_policy?.require_uppercase || false}
                onChange={(e) => handlePasswordPolicyChange('require_uppercase', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                الزام حروف بزرگ
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.password_policy?.require_lowercase || false}
                onChange={(e) => handlePasswordPolicyChange('require_lowercase', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                الزام حروف کوچک
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.password_policy?.require_numbers || false}
                onChange={(e) => handlePasswordPolicyChange('require_numbers', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                الزام اعداد
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.password_policy?.require_symbols || false}
                onChange={(e) => handlePasswordPolicyChange('require_symbols', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                الزام نمادهای خاص
              </span>
            </label>
          </div>
        </div>

        {/* Session Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">تنظیمات جلسه</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مهلت انقضای جلسه (دقیقه)
              </label>
              <Input
                type="number"
                value={settings.session_settings?.timeout_minutes || 60}
                onChange={(e) => handleSessionSettingsChange('timeout_minutes', parseInt(e.target.value) || 60)}
                placeholder="60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                حداکثر جلسات همزمان
              </label>
              <Input
                type="number"
                value={settings.session_settings?.max_concurrent_sessions || 5}
                onChange={(e) => handleSessionSettingsChange('max_concurrent_sessions', parseInt(e.target.value) || 5)}
                placeholder="5"
              />
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">احراز هویت دو مرحله‌ای</h4>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.two_factor?.required_for_admins || false}
                onChange={(e) => handleTwoFactorChange('required_for_admins', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                الزامی برای مدیران
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.two_factor?.required_for_all || false}
                onChange={(e) => handleTwoFactorChange('required_for_all', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                الزامی برای همه کاربران
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
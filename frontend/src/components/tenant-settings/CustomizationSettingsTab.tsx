import React from 'react';
import { Input } from '@/components/ui/Input';

interface CustomizationSettingsTabProps {
  settings: any;
  onChange: (updates: any) => void;
}

export const CustomizationSettingsTab: React.FC<CustomizationSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const handleThemeChange = (field: string, value: any) => {
    onChange({
      theme: {
        ...settings.theme,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">شخصی‌سازی</h3>
        
        {/* Theme Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">تم و رنگ‌بندی</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رنگ اصلی
              </label>
              <div className="flex items-center space-x-3 space-x-reverse">
                <Input
                  type="color"
                  value={settings.theme?.primary_color || '#1976d2'}
                  onChange={(e) => handleThemeChange('primary_color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={settings.theme?.primary_color || '#1976d2'}
                  onChange={(e) => handleThemeChange('primary_color', e.target.value)}
                  placeholder="#1976d2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رنگ ثانویه
              </label>
              <div className="flex items-center space-x-3 space-x-reverse">
                <Input
                  type="color"
                  value={settings.theme?.secondary_color || '#dc004e'}
                  onChange={(e) => handleThemeChange('secondary_color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={settings.theme?.secondary_color || '#dc004e'}
                  onChange={(e) => handleThemeChange('secondary_color', e.target.value)}
                  placeholder="#dc004e"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">پیش‌نمایش</h4>
          
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3 space-x-reverse mb-4">
              <div 
                className="w-8 h-8 rounded"
                style={{ backgroundColor: settings.theme?.primary_color || '#1976d2' }}
              ></div>
              <div 
                className="w-8 h-8 rounded"
                style={{ backgroundColor: settings.theme?.secondary_color || '#dc004e' }}
              ></div>
              <span className="text-sm text-gray-600">رنگ‌های انتخابی</span>
            </div>
            
            <div className="space-y-2">
              <button 
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: settings.theme?.primary_color || '#1976d2' }}
              >
                دکمه اصلی
              </button>
              <button 
                className="px-4 py-2 rounded text-white text-sm mr-2"
                style={{ backgroundColor: settings.theme?.secondary_color || '#dc004e' }}
              >
                دکمه ثانویه
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
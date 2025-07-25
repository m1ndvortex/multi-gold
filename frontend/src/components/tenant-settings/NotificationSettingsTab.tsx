import React from 'react';

interface NotificationSettingsTabProps {
  settings: any;
  onChange: (updates: any) => void;
}

export const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const handleEmailChange = (field: string, value: any) => {
    onChange({
      email: {
        ...settings.email,
        [field]: value,
      },
    });
  };

  const handleSmsChange = (field: string, value: any) => {
    onChange({
      sms: {
        ...settings.sms,
        [field]: value,
      },
    });
  };

  const handlePushChange = (field: string, value: any) => {
    onChange({
      push: {
        ...settings.push,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">تنظیمات اعلان‌ها</h3>
        
        {/* Email Notifications */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">اعلان‌های ایمیل</h4>
          
          <div className="flex items-center mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.enabled || false}
                onChange={(e) => handleEmailChange('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                فعال‌سازی اعلان‌های ایمیل
              </span>
            </label>
          </div>

          <div className="space-y-3 pr-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.templates?.invoice_sent || false}
                onChange={(e) => handleEmailChange('templates', {
                  ...settings.email?.templates,
                  invoice_sent: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                ارسال فاکتور
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.templates?.payment_reminder || false}
                onChange={(e) => handleEmailChange('templates', {
                  ...settings.email?.templates,
                  payment_reminder: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                یادآوری پرداخت
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.templates?.low_inventory || false}
                onChange={(e) => handleEmailChange('templates', {
                  ...settings.email?.templates,
                  low_inventory: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                موجودی کم
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.email?.templates?.user_welcome || false}
                onChange={(e) => handleEmailChange('templates', {
                  ...settings.email?.templates,
                  user_welcome: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                خوش‌آمدگویی کاربر جدید
              </span>
            </label>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">اعلان‌های پیامک</h4>
          
          <div className="flex items-center mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.enabled || false}
                onChange={(e) => handleSmsChange('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                فعال‌سازی اعلان‌های پیامک
              </span>
            </label>
          </div>

          <div className="space-y-3 pr-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.templates?.invoice_sent || false}
                onChange={(e) => handleSmsChange('templates', {
                  ...settings.sms?.templates,
                  invoice_sent: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                ارسال فاکتور
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.templates?.payment_reminder || false}
                onChange={(e) => handleSmsChange('templates', {
                  ...settings.sms?.templates,
                  payment_reminder: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                یادآوری پرداخت
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.sms?.templates?.birthday_wishes || false}
                onChange={(e) => handleSmsChange('templates', {
                  ...settings.sms?.templates,
                  birthday_wishes: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                تبریک تولد
              </span>
            </label>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">اعلان‌های فوری</h4>
          
          <div className="flex items-center mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.enabled || false}
                onChange={(e) => handlePushChange('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                فعال‌سازی اعلان‌های فوری
              </span>
            </label>
          </div>

          <div className="space-y-3 pr-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.templates?.new_order || false}
                onChange={(e) => handlePushChange('templates', {
                  ...settings.push?.templates,
                  new_order: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                سفارش جدید
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.templates?.low_inventory || false}
                onChange={(e) => handlePushChange('templates', {
                  ...settings.push?.templates,
                  low_inventory: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                موجودی کم
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.push?.templates?.overdue_payment || false}
                onChange={(e) => handlePushChange('templates', {
                  ...settings.push?.templates,
                  overdue_payment: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="mr-2 text-sm text-gray-700">
                پرداخت معوقه
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
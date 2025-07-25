import React, { useState, useEffect } from 'react';
import { Save, Upload, RotateCcw, Building, DollarSign, Shield, Bell, Palette, Settings } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BusinessSettingsTab } from '@/components/tenant-settings/BusinessSettingsTab';
import { FinancialSettingsTab } from '@/components/tenant-settings/FinancialSettingsTab';
import { SecuritySettingsTab } from '@/components/tenant-settings/SecuritySettingsTab';
import { NotificationSettingsTab } from '@/components/tenant-settings/NotificationSettingsTab';
import { CustomizationSettingsTab } from '@/components/tenant-settings/CustomizationSettingsTab';
import { SystemSettingsTab } from '@/components/tenant-settings/SystemSettingsTab';
import { useTenantSettings } from '@/hooks/useTenantSettings';

type SettingsTab = 'business' | 'financial' | 'security' | 'notifications' | 'customization' | 'system';

export const TenantSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    getTenantProfile,
    getTenantSettings,
    updateTenantInfo,
    updateTenantSettings,
    resetTenantSettings,
    updateTenantLogo,
  } = useTenantSettings();

  // Load tenant data
  const loadTenantData = async () => {
    try {
      setLoading(true);
      const [profile, tenantSettings] = await Promise.all([
        getTenantProfile(),
        getTenantSettings(),
      ]);
      setTenantProfile(profile);
      setSettings(tenantSettings);
    } catch (error) {
      console.error('Failed to load tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, []);

  // Handle settings change
  const handleSettingsChange = (section: string, updates: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
    setHasChanges(true);
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateTenantSettings(settings);
      setHasChanges(false);
      // Show success message
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  // Handle reset settings
  const handleResetSettings = async () => {
    if (!confirm('آیا از بازنشانی تنظیمات به حالت پیش‌فرض اطمینان دارید؟')) {
      return;
    }

    try {
      setSaving(true);
      const defaultSettings = await resetTenantSettings();
      setSettings(defaultSettings);
      setHasChanges(false);
      // Show success message
    } catch (error) {
      console.error('Failed to reset settings:', error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  // Tab configuration
  const tabs = [
    {
      id: 'business' as SettingsTab,
      label: 'اطلاعات کسب‌وکار',
      icon: Building,
      description: 'اطلاعات پایه و تماس کسب‌وکار',
    },
    {
      id: 'financial' as SettingsTab,
      label: 'تنظیمات مالی',
      icon: DollarSign,
      description: 'ارز، قیمت‌گذاری و مالیات',
    },
    {
      id: 'security' as SettingsTab,
      label: 'امنیت',
      icon: Shield,
      description: 'رمز عبور، احراز هویت و دسترسی',
    },
    {
      id: 'notifications' as SettingsTab,
      label: 'اعلان‌ها',
      icon: Bell,
      description: 'ایمیل، پیامک و اعلان‌های سیستم',
    },
    {
      id: 'customization' as SettingsTab,
      label: 'شخصی‌سازی',
      icon: Palette,
      description: 'تم، قالب و ظاهر سیستم',
    },
    {
      id: 'system' as SettingsTab,
      label: 'سیستم',
      icon: Settings,
      description: 'زبان، منطقه زمانی و تنظیمات کلی',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تنظیمات سیستم</h1>
          <p className="text-gray-600">مدیریت تنظیمات و پیکربندی سیستم</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <Button
            variant="outline"
            onClick={handleResetSettings}
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 ml-2" />
            بازنشانی
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={!hasChanges}
            loading={saving}
          >
            <Save className="w-4 h-4 ml-2" />
            ذخیره تغییرات
          </Button>
        </div>
      </div>

      {/* Tenant Info Card */}
      {tenantProfile && (
        <Card className="p-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              {tenantProfile.logo ? (
                <img
                  src={tenantProfile.logo}
                  alt={tenantProfile.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <Building className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {tenantProfile.name}
              </h2>
              <p className="text-gray-600">{tenantProfile.contact_email}</p>
              <div className="flex items-center space-x-4 space-x-reverse mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenantProfile.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {tenantProfile.status === 'ACTIVE' ? 'فعال' : 'آزمایشی'}
                </span>
                <span className="text-sm text-gray-500">
                  پلن: {tenantProfile.subscription_plan}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Settings Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-right p-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Icon className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {settings && (
              <>
                {activeTab === 'business' && (
                  <BusinessSettingsTab
                    settings={settings.business}
                    tenantProfile={tenantProfile}
                    onChange={(updates) => handleSettingsChange('business', updates)}
                    onUpdateInfo={updateTenantInfo}
                    onUpdateLogo={updateTenantLogo}
                  />
                )}
                {activeTab === 'financial' && (
                  <FinancialSettingsTab
                    settings={settings.financial}
                    onChange={(updates) => handleSettingsChange('financial', updates)}
                  />
                )}
                {activeTab === 'security' && (
                  <SecuritySettingsTab
                    settings={settings.security}
                    onChange={(updates) => handleSettingsChange('security', updates)}
                  />
                )}
                {activeTab === 'notifications' && (
                  <NotificationSettingsTab
                    settings={settings.notifications}
                    onChange={(updates) => handleSettingsChange('notifications', updates)}
                  />
                )}
                {activeTab === 'customization' && (
                  <CustomizationSettingsTab
                    settings={settings.customization}
                    onChange={(updates) => handleSettingsChange('customization', updates)}
                  />
                )}
                {activeTab === 'system' && (
                  <SystemSettingsTab
                    settings={settings.system}
                    onChange={(updates) => handleSettingsChange('system', updates)}
                  />
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Save Changes Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-sm text-gray-600">
              شما تغییراتی ایجاد کرده‌اید که ذخیره نشده‌اند
            </div>
            <div className="flex space-x-3 space-x-reverse">
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('آیا از لغو تغییرات اطمینان دارید؟')) {
                    loadTenantData();
                    setHasChanges(false);
                  }
                }}
              >
                لغو تغییرات
              </Button>
              <Button
                onClick={handleSaveSettings}
                loading={saving}
              >
                <Save className="w-4 h-4 ml-2" />
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
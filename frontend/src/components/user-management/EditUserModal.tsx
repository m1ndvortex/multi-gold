import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useUserManagement } from '@/hooks/useUserManagement';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  two_factor_enabled: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    permissions: user.permissions || [],
    is_active: user.is_active,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);

  const { getPermissions } = useUserManagement();

  // Load permissions
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const perms = await getPermissions();
        setPermissions(perms);
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };
    loadPermissions();
  }, []);

  // Role options
  const roleOptions = [
    { value: 'TENANT_ADMIN', label: 'مدیر' },
    { value: 'TENANT_EMPLOYEE', label: 'کارمند' },
    { value: 'CASHIER', label: 'صندوقدار' },
    { value: 'ACCOUNTANT', label: 'حسابدار' },
  ];

  // Status options
  const statusOptions = [
    { value: 'true', label: 'فعال' },
    { value: 'false', label: 'غیرفعال' },
  ];

  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionKey: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionKey)
        ? prev.permissions.filter(p => p !== permissionKey)
        : [...prev.permissions, permissionKey],
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'نام الزامی است';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name: formData.name.trim(),
        role: formData.role,
        permissions: formData.permissions,
        is_active: formData.is_active,
      });
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="ویرایش کاربر">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-blue-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">اطلاعات پایه</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام کامل *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="نام کامل کاربر"
              error={errors.name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نقش *
            </label>
            <Select
              value={formData.role}
              onChange={(value) => handleChange('role', value)}
              options={roleOptions}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              وضعیت *
            </label>
            <Select
              value={formData.is_active.toString()}
              onChange={(value) => handleChange('is_active', value === 'true')}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Custom Permissions */}
        {permissions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">دسترسی‌های سفارشی</h3>
            <p className="text-sm text-gray-600">
              در صورت عدم انتخاب، دسترسی‌های پیش‌فرض نقش اعمال خواهد شد
            </p>
            
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {permissions.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h4 className="font-medium text-gray-800">{category.category}</h4>
                  <div className="space-y-2 pr-4">
                    {category.permissions.map((permission: any) => (
                      <label key={permission.key} className="flex items-start space-x-3 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.key)}
                          onChange={() => handlePermissionToggle(permission.key)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700">
                            {permission.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {permission.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            انصراف
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            ذخیره تغییرات
          </Button>
        </div>
      </form>
    </Modal>
  );
};
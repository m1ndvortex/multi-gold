import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useUserManagement } from '@/hooks/useUserManagement';

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'TENANT_EMPLOYEE',
    permissions: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!formData.email.trim()) {
      newErrors.email = 'ایمیل الزامی است';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'فرمت ایمیل صحیح نیست';
    }

    if (!formData.password) {
      newErrors.password = 'رمز عبور الزامی است';
    } else if (formData.password.length < 8) {
      newErrors.password = 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = 'رمز عبور باید شامل حروف کوچک، بزرگ، عدد و نماد باشد';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'تکرار رمز عبور مطابقت ندارد';
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
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        permissions: formData.permissions.length > 0 ? formData.permissions : undefined,
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="ایجاد کاربر جدید">
      <form onSubmit={handleSubmit} className="space-y-6">
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
              ایمیل *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="example@domain.com"
              error={errors.email}
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
        </div>

        {/* Password */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">رمز عبور</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رمز عبور *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="رمز عبور"
                error={errors.password}
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              تکرار رمز عبور *
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="تکرار رمز عبور"
                error={errors.confirmPassword}
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
            ایجاد کاربر
          </Button>
        </div>
      </form>
    </Modal>
  );
};
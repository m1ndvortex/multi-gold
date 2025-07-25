import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Handle form field changes
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';
    
    // Ensure at least one character from each required type
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // special
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    const shuffled = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setFormData(prev => ({
      ...prev,
      newPassword: shuffled,
      confirmPassword: shuffled,
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'رمز عبور جدید الزامی است';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'رمز عبور باید حداقل ۸ کاراکتر باشد';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.newPassword)) {
      newErrors.newPassword = 'رمز عبور باید شامل حروف کوچک، بزرگ، عدد و نماد باشد';
    }

    if (formData.newPassword !== formData.confirmPassword) {
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
      await onSubmit(formData.newPassword);
    } catch (error) {
      console.error('Failed to reset password:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="بازنشانی رمز عبور">
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

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-yellow-800">
                هشدار
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  بازنشانی رمز عبور باعث خروج کاربر از تمام دستگاه‌ها خواهد شد.
                  رمز عبور جدید را به کاربر اطلاع دهید.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Password Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رمز عبور جدید *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                placeholder="رمز عبور جدید"
                error={errors.newPassword}
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
              تکرار رمز عبور جدید *
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="تکرار رمز عبور جدید"
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

          {/* Generate Password Button */}
          <Button
            type="button"
            variant="outline"
            onClick={generatePassword}
            className="w-full"
          >
            تولید رمز عبور تصادفی
          </Button>
        </div>

        {/* Password Requirements */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            الزامات رمز عبور:
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• حداقل ۸ کاراکتر</li>
            <li>• شامل حروف کوچک (a-z)</li>
            <li>• شامل حروف بزرگ (A-Z)</li>
            <li>• شامل اعداد (0-9)</li>
            <li>• شامل نمادهای خاص (@$!%*?&)</li>
          </ul>
        </div>

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
            variant="destructive"
          >
            بازنشانی رمز عبور
          </Button>
        </div>
      </form>
    </Modal>
  );
};
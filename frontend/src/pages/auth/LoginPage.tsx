import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { RootState } from '@/store';
import { login } from '@/store/slices/authSlice';
import { useLanguage } from '@/contexts';
import Container from '@/components/layout/Container';
import Flex from '@/components/layout/Flex';
import { Card, CardHeader, CardContent, Button, Input } from '@/components/ui';
import { rtlClass } from '@/utils/rtl';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const rtl = rtlClass(language);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('validation.required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('validation.email');
    }

    if (!formData.password) {
      newErrors.password = t('validation.required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('validation.minLength', { count: 6 });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(login(formData) as any);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Container size="full" padding="lg">
        <Flex justify="center" align="center" className="min-h-screen">
          <div className="w-full max-w-md">
            <Card variant="elevated" padding="none">
              <CardHeader
                title={t('auth.loginTitle')}
                subtitle={t('auth.loginSubtitle')}
                className="text-center pb-6"
              />
              
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label={t('auth.email')}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    leftIcon={<Mail className="w-5 h-5" />}
                    placeholder="example@domain.com"
                    fullWidth
                    required
                  />

                  <Input
                    label={t('auth.password')}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    error={errors.password}
                    leftIcon={<Lock className="w-5 h-5" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    }
                    placeholder={t('auth.password')}
                    fullWidth
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                  >
                    {t('auth.login')}
                  </Button>
                </form>

                <div className={`mt-6 text-center ${rtl.textRight()}`}>
                  <p className="text-sm text-gray-600">
                    {t('common.jewelrySystem', 'سامانه مدیریت طلافروشی')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Flex>
      </Container>
    </div>
  );
};

export default LoginPage;
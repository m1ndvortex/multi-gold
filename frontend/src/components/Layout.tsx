import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { LogOut, Settings, User, Globe } from 'lucide-react';

import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { useLanguage } from '@/contexts';
import Container from '@/components/layout/Container';
import Flex from '@/components/layout/Flex';
import { Button } from '@/components/ui';
import { rtlClass } from '@/utils/rtl';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const rtl = rtlClass(language);

  const handleLogout = () => {
    dispatch(logout());
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <Container size="full" padding="none">
          <div className="px-4 sm:px-6 lg:px-8">
            <Flex justify="between" align="center" className="h-16" rtlAware>
              <Flex align="center" gap="md" rtlAware>
                <h1 className="text-xl font-semibold text-gray-900">
                  {t('navigation.dashboard')} - {t('common.jewelrySystem', 'سامانه مدیریت طلافروشی')}
                </h1>
              </Flex>
              
              <Flex align="center" gap="sm" rtlAware>
                {/* Language Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleLanguage}
                  icon={<Globe className="w-4 h-4" />}
                  title={language === 'fa' ? 'English' : 'فارسی'}
                >
                  {language === 'fa' ? 'EN' : 'فا'}
                </Button>

                {/* User Menu */}
                <Flex align="center" gap="sm" rtlAware>
                  <div className={`text-sm text-gray-600 ${rtl.textRight()}`}>
                    {t('dashboard.welcome')} {user?.email || 'کاربر'}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<User className="w-4 h-4" />}
                    title={t('navigation.profile')}
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Settings className="w-4 h-4" />}
                    title={t('navigation.settings')}
                  />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    icon={<LogOut className="w-4 h-4" />}
                    title={t('auth.logout')}
                  />
                </Flex>
              </Flex>
            </Flex>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main>
        <Container size="full" padding="lg">
          {children}
        </Container>
      </main>
    </div>
  );
};

export default Layout;
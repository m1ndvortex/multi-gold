import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  TrendingUp,
  AlertTriangle,

  BarChart3
} from 'lucide-react';

import { useLanguage } from '@/contexts';
import { Grid, GridItem } from '@/components/layout/Grid';
import Flex from '@/components/layout/Flex';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { rtlClass, formatCurrency, formatNumber } from '@/utils/rtl';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  const { language } = useLanguage();
  const rtl = rtlClass(language);

  return (
    <Card variant="default" padding="md">
      <CardContent>
        <Flex justify="between" align="start" rtlAware>
          <div className="space-y-2">
            <p className={`text-sm font-medium text-gray-600 ${rtl.textRight()}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold text-gray-900 ${rtl.textRight()}`}>
              {value}
            </p>
            {trend && (
              <Flex align="center" gap="sm" rtlAware>
                <TrendingUp 
                  className={`w-4 h-4 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`} 
                />
                <span className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(trend.value, language)}%
                </span>
              </Flex>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
        </Flex>
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const rtl = rtlClass(language);

  // Mock data - in real app this would come from API
  const stats = [
    {
      title: t('dashboard.todaySales'),
      value: formatCurrency(0, language),
      icon: <DollarSign className="w-6 h-6 text-white" />,
      color: 'bg-primary-500',
      trend: { value: 0, isPositive: true },
    },
    {
      title: t('dashboard.goldSold'),
      value: `${formatNumber(0, language)} گرم`,
      icon: <Package className="w-6 h-6 text-white" />,
      color: 'bg-gold-500',
      trend: { value: 0, isPositive: false },
    },
    {
      title: t('dashboard.newCustomers'),
      value: `${formatNumber(0, language)} نفر`,
      icon: <Users className="w-6 h-6 text-white" />,
      color: 'bg-green-500',
      trend: { value: 0, isPositive: true },
    },
    {
      title: t('invoice.title', 'فاکتورها'),
      value: `${formatNumber(0, language)} فاکتور`,
      icon: <ShoppingCart className="w-6 h-6 text-white" />,
      color: 'bg-blue-500',
      trend: { value: 0, isPositive: true },
    },
  ];

  const alerts = [
    {
      type: 'warning',
      title: t('dashboard.overdueInvoices'),
      count: 0,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    },
    {
      type: 'danger',
      title: t('dashboard.lowInventory'),
      count: 0,
      icon: <Package className="w-5 h-5 text-red-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className={rtl.textRight()}>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.title')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t('dashboard.welcome')} - خلاصه‌ای از وضعیت کسب و کار شما
        </p>
      </div>

      {/* Stats Grid */}
      <Grid cols={1} gap="md" responsive={{ sm: 2, lg: 4 }}>
        {stats.map((stat, index) => (
          <GridItem key={index}>
            <StatCard {...stat} />
          </GridItem>
        ))}
      </Grid>

      {/* Alerts and Quick Actions */}
      <Grid cols={1} gap="md" responsive={{ lg: 2 }}>
        <GridItem>
          <Card variant="default" padding="md">
            <CardHeader title="هشدارها و اعلان‌ها" />
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <Flex key={index} align="center" justify="between" rtlAware>
                    <Flex align="center" gap="sm" rtlAware>
                      {alert.icon}
                      <span className="text-sm font-medium text-gray-700">
                        {alert.title}
                      </span>
                    </Flex>
                    <span className={`text-sm font-bold ${
                      alert.type === 'warning' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {formatNumber(alert.count, language)}
                    </span>
                  </Flex>
                ))}
                {alerts.every(alert => alert.count === 0) && (
                  <p className={`text-sm text-gray-500 ${rtl.textRight()}`}>
                    هیچ هشداری وجود ندارد
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </GridItem>

        <GridItem>
          <Card variant="default" padding="md">
            <CardHeader title="دسترسی سریع" />
            <CardContent>
              <Grid cols={2} gap="sm">
                <GridItem>
                  <button className="w-full p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                    <span className="text-sm font-medium text-gray-700">
                      فاکتور جدید
                    </span>
                  </button>
                </GridItem>
                <GridItem>
                  <button className="w-full p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      مشتری جدید
                    </span>
                  </button>
                </GridItem>
                <GridItem>
                  <button className="w-full p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Package className="w-6 h-6 mx-auto mb-2 text-gold-600" />
                    <span className="text-sm font-medium text-gray-700">
                      محصول جدید
                    </span>
                  </button>
                </GridItem>
                <GridItem>
                  <button className="w-full p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      گزارشات
                    </span>
                  </button>
                </GridItem>
              </Grid>
            </CardContent>
          </Card>
        </GridItem>
      </Grid>

      {/* Welcome Message */}
      <Card variant="default" padding="md">
        <CardContent>
          <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${rtl.textRight()}`}>
            به سامانه مدیریت طلافروشی خوش آمدید
          </h3>
          <p className={`text-gray-600 leading-relaxed ${rtl.textRight()}`}>
            این سامانه برای مدیریت جامع کسب و کار طلافروشی شما طراحی شده است.
            شما می‌توانید موجودی، فروش، مشتریان و سفارشات خود را به راحتی مدیریت کنید.
            از منوی بالا برای دسترسی به بخش‌های مختلف استفاده کنید.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
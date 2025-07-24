import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">داشبورد</h1>
        <p className="mt-1 text-sm text-gray-600">
          خلاصه‌ای از وضعیت کسب و کار شما
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">₹</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    فروش امروز
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ۰ تومان
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gold-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📦</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    موجودی کالا
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ۰ قطعه
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">👥</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    مشتریان
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ۰ نفر
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📊</span>
                </div>
              </div>
              <div className="mr-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    سفارشات
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ۰ سفارش
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            به سامانه مدیریت طلافروشی خوش آمدید
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              این سامانه برای مدیریت جامع کسب و کار طلافروشی شما طراحی شده است.
              شما می‌توانید موجودی، فروش، مشتریان و سفارشات خود را مدیریت کنید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
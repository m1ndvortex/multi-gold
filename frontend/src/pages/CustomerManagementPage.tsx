import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useTranslation } from 'react-i18next';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
  customer_group: 'REGULAR' | 'VIP' | 'WHOLESALER' | 'RETAILER';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  current_balance: number;
  credit_limit: number;
  created_at: string;
}

interface CustomerFilters {
  search: string;
  customer_group: string;
  status: string;
}

const CustomerManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    customer_group: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Mock data for demonstration
  const mockCustomers: Customer[] = [
    {
      id: '1',
      customer_code: 'CUS000001',
      name: 'احمد محمدی',
      email: 'ahmad@example.com',
      phone: '09123456789',
      customer_group: 'VIP',
      status: 'ACTIVE',
      current_balance: 1500000,
      credit_limit: 5000000,
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      customer_code: 'CUS000002',
      name: 'فاطمه احمدی',
      email: 'fateme@example.com',
      phone: '09987654321',
      customer_group: 'REGULAR',
      status: 'ACTIVE',
      current_balance: 750000,
      credit_limit: 2000000,
      created_at: '2024-01-20T14:15:00Z'
    },
    {
      id: '3',
      customer_code: 'CUS000003',
      name: 'علی رضایی',
      email: 'ali@example.com',
      phone: '09111111111',
      customer_group: 'WHOLESALER',
      status: 'ACTIVE',
      current_balance: 3200000,
      credit_limit: 10000000,
      created_at: '2024-02-01T09:00:00Z'
    }
  ];

  useEffect(() => {
    loadCustomers();
  }, [filters, pagination.page]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      // const response = await fetch('/api/v1/customers', { ... });
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredCustomers = mockCustomers;
      
      if (filters.search) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.name.includes(filters.search) ||
          customer.customer_code.includes(filters.search) ||
          customer.email?.includes(filters.search) ||
          customer.phone?.includes(filters.search)
        );
      }
      
      if (filters.customer_group) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.customer_group === filters.customer_group
        );
      }
      
      if (filters.status) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.status === filters.status
        );
      }
      
      setCustomers(filteredCustomers);
      setPagination(prev => ({
        ...prev,
        total: filteredCustomers.length,
        totalPages: Math.ceil(filteredCustomers.length / prev.limit)
      }));
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CustomerFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      BLOCKED: 'bg-red-100 text-red-800'
    };
    
    const statusLabels = {
      ACTIVE: 'فعال',
      INACTIVE: 'غیرفعال',
      BLOCKED: 'مسدود'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const getGroupBadge = (group: string) => {
    const groupColors = {
      VIP: 'bg-purple-100 text-purple-800',
      REGULAR: 'bg-blue-100 text-blue-800',
      WHOLESALER: 'bg-orange-100 text-orange-800',
      RETAILER: 'bg-green-100 text-green-800'
    };
    
    const groupLabels = {
      VIP: 'ویژه',
      REGULAR: 'عادی',
      WHOLESALER: 'عمده‌فروش',
      RETAILER: 'خرده‌فروش'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${groupColors[group as keyof typeof groupColors]}`}>
        {groupLabels[group as keyof typeof groupLabels]}
      </span>
    );
  };

  const columns = [
    {
      key: 'customer_code',
      title: 'کد مشتری',
      render: (customer: Customer) => (
        <span className="font-mono text-sm">{customer.customer_code}</span>
      )
    },
    {
      key: 'name',
      title: 'نام مشتری',
      render: (customer: Customer) => (
        <div>
          <div className="font-medium">{customer.name}</div>
          {customer.email && (
            <div className="text-sm text-gray-500">{customer.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'phone',
      title: 'تلفن',
      render: (customer: Customer) => (
        <span className="font-mono text-sm">{customer.phone}</span>
      )
    },
    {
      key: 'customer_group',
      title: 'گروه',
      render: (customer: Customer) => getGroupBadge(customer.customer_group)
    },
    {
      key: 'status',
      title: 'وضعیت',
      render: (customer: Customer) => getStatusBadge(customer.status)
    },
    {
      key: 'current_balance',
      title: 'موجودی',
      render: (customer: Customer) => (
        <span className={`font-medium ${customer.current_balance > 0 ? 'text-green-600' : customer.current_balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
          {formatCurrency(customer.current_balance)}
        </span>
      )
    },
    {
      key: 'credit_limit',
      title: 'سقف اعتبار',
      render: (customer: Customer) => (
        <span className="text-sm">{formatCurrency(customer.credit_limit)}</span>
      )
    },
    {
      key: 'created_at',
      title: 'تاریخ ایجاد',
      render: (customer: Customer) => (
        <span className="text-sm text-gray-500">{formatDate(customer.created_at)}</span>
      )
    },
    {
      key: 'actions',
      title: 'عملیات',
      render: (customer: Customer) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedCustomer(customer)}
          >
            مشاهده
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedCustomer(customer);
              setShowCreateModal(true);
            }}
          >
            ویرایش
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">مدیریت مشتریان</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          افزودن مشتری جدید
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="جستجو در نام، کد، ایمیل یا تلفن..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <Select
            value={filters.customer_group}
            onChange={(value) => handleFilterChange('customer_group', value)}
            placeholder="گروه مشتری"
            options={[
              { value: '', label: 'همه گروه‌ها' },
              { value: 'VIP', label: 'ویژه' },
              { value: 'REGULAR', label: 'عادی' },
              { value: 'WHOLESALER', label: 'عمده‌فروش' },
              { value: 'RETAILER', label: 'خرده‌فروش' }
            ]}
          />
          <Select
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            placeholder="وضعیت"
            options={[
              { value: '', label: 'همه وضعیت‌ها' },
              { value: 'ACTIVE', label: 'فعال' },
              { value: 'INACTIVE', label: 'غیرفعال' },
              { value: 'BLOCKED', label: 'مسدود' }
            ]}
          />
          <Button variant="outline" onClick={loadCustomers}>
            بروزرسانی
          </Button>
        </div>
      </Card>

      {/* Customer Table */}
      <Card>
        <Table
          columns={columns}
          data={customers}
          loading={loading}
          emptyMessage="هیچ مشتری یافت نشد"
        />
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <div className="text-sm text-gray-500">
              نمایش {customers.length} از {pagination.total} مشتری
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                قبلی
              </Button>
              <span className="px-3 py-1 text-sm">
                صفحه {pagination.page} از {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedCustomer(null);
          }}
          title={selectedCustomer ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
        >
          <div className="space-y-4">
            <Input
              label="نام مشتری"
              placeholder="نام کامل مشتری را وارد کنید"
              defaultValue={selectedCustomer?.name}
            />
            <Input
              label="ایمیل"
              type="email"
              placeholder="آدرس ایمیل"
              defaultValue={selectedCustomer?.email}
            />
            <Input
              label="تلفن"
              placeholder="شماره تلفن"
              defaultValue={selectedCustomer?.phone}
            />
            <Select
              label="گروه مشتری"
              defaultValue={selectedCustomer?.customer_group}
              options={[
                { value: 'REGULAR', label: 'عادی' },
                { value: 'VIP', label: 'ویژه' },
                { value: 'WHOLESALER', label: 'عمده‌فروش' },
                { value: 'RETAILER', label: 'خرده‌فروش' }
              ]}
            />
            <Input
              label="سقف اعتبار"
              type="number"
              placeholder="مبلغ سقف اعتبار"
              defaultValue={selectedCustomer?.credit_limit}
            />
            <div className="flex gap-3 pt-4">
              <Button className="flex-1">
                {selectedCustomer ? 'بروزرسانی' : 'ایجاد'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedCustomer(null);
                }}
              >
                انصراف
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerManagementPage;
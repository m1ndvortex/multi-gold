import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Key, UserCheck, UserX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { CreateUserModal } from '@/components/user-management/CreateUserModal';
import { EditUserModal } from '@/components/user-management/EditUserModal';
import { ResetPasswordModal } from '@/components/user-management/ResetPasswordModal';
import { useUserManagement } from '@/hooks/useUserManagement';
import { formatDate } from '@/utils/date';

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

interface UserFilters {
  search: string;
  role: string;
  is_active: string;
}

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    is_active: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { 
    fetchUsers, 
    createUser, 
    updateUser, 
    deleteUser, 
    resetUserPassword,
    getUserRolesSummary 
  } = useUserManagement();

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await fetchUsers({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setUsers(result.users);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters, pagination.page]);

  // Handle filter changes
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle user creation
  const handleCreateUser = async (userData: any) => {
    try {
      await createUser(userData);
      setShowCreateModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  // Handle user update
  const handleUpdateUser = async (userData: any) => {
    if (!selectedUser) return;
    
    try {
      await updateUser(selectedUser.id, userData);
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // Handle password reset
  const handleResetPassword = async (newPassword: string) => {
    if (!selectedUser) return;
    
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  // Role options
  const roleOptions = [
    { value: '', label: 'همه نقش‌ها' },
    { value: 'TENANT_ADMIN', label: 'مدیر' },
    { value: 'TENANT_EMPLOYEE', label: 'کارمند' },
    { value: 'CASHIER', label: 'صندوقدار' },
    { value: 'ACCOUNTANT', label: 'حسابدار' },
  ];

  // Status options
  const statusOptions = [
    { value: '', label: 'همه وضعیت‌ها' },
    { value: 'true', label: 'فعال' },
    { value: 'false', label: 'غیرفعال' },
  ];

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'نام',
      render: (user: User) => (
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'نقش',
      render: (user: User) => {
        const roleLabels: Record<string, string> = {
          TENANT_ADMIN: 'مدیر',
          TENANT_EMPLOYEE: 'کارمند',
          CASHIER: 'صندوقدار',
          ACCOUNTANT: 'حسابدار',
        };
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {roleLabels[user.role] || user.role}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'وضعیت',
      render: (user: User) => (
        <div className="flex items-center space-x-2 space-x-reverse">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {user.is_active ? 'فعال' : 'غیرفعال'}
          </span>
          {user.two_factor_enabled && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              2FA
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'last_login',
      title: 'آخرین ورود',
      render: (user: User) => (
        <div className="text-sm text-gray-900">
          {user.last_login ? formatDate(user.last_login) : 'هرگز'}
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'تاریخ ایجاد',
      render: (user: User) => (
        <div className="text-sm text-gray-900">
          {formatDate(user.created_at)}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'عملیات',
      render: (user: User) => (
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(user);
              setShowEditModal(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(user);
              setShowResetPasswordModal(true);
            }}
          >
            <Key className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedUser(user);
              setShowDeleteModal(true);
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مدیریت کاربران</h1>
          <p className="text-gray-600">مدیریت کاربران و دسترسی‌های سیستم</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 ml-2" />
          کاربر جدید
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="جستجو در نام یا ایمیل..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pr-10"
            />
          </div>
          <Select
            value={filters.role}
            onChange={(value) => handleFilterChange('role', value)}
            options={roleOptions}
            placeholder="نقش"
          />
          <Select
            value={filters.is_active}
            onChange={(value) => handleFilterChange('is_active', value)}
            options={statusOptions}
            placeholder="وضعیت"
          />
          <Button variant="outline" onClick={loadUsers}>
            <Filter className="w-4 h-4 ml-2" />
            اعمال فیلتر
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <Table
          columns={columns}
          data={users}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
        />
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdateUser}
        />
      )}

      {showResetPasswordModal && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => {
            setShowResetPasswordModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleResetPassword}
        />
      )}

      {showDeleteModal && selectedUser && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          title="حذف کاربر"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              آیا از حذف کاربر <strong>{selectedUser.name}</strong> اطمینان دارید؟
              این عمل قابل بازگشت نیست.
            </p>
            <div className="flex justify-end space-x-3 space-x-reverse">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                انصراف
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
              >
                حذف کاربر
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
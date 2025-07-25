import { useState } from 'react';
import { apiClient } from '@/utils/api';

export interface User {
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

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: string;
  permissions?: string[];
}

export interface UpdateUserData {
  name?: string;
  role?: string;
  permissions?: string[];
  is_active?: boolean;
}

export interface UserListFilters {
  search?: string;
  role?: string;
  is_active?: string;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RolesSummary {
  roles: Array<{
    role: string;
    count: number;
    permissions: string[];
  }>;
  totalUsers: number;
  activeUsers: number;
}

export interface Permission {
  category: string;
  permissions: Array<{
    key: string;
    name: string;
    description: string;
  }>;
}

export const useUserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch users with filters and pagination
   */
  const fetchUsers = async (filters: UserListFilters = {}): Promise<UserListResponse> => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get(`/users?${params.toString()}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch users');
      }

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch users';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get user by ID
   */
  const getUserById = async (userId: string): Promise<User> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/users/${userId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch user');
      }

      return response.data.data.user;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create new user
   */
  const createUser = async (userData: CreateUserData): Promise<User> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/users', userData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create user');
      }

      return response.data.data.user;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user
   */
  const updateUser = async (userId: string, updateData: UpdateUserData): Promise<User> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(`/users/${userId}`, updateData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update user');
      }

      return response.data.data.user;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete user
   */
  const deleteUser = async (userId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.delete(`/users/${userId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete user');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset user password
   */
  const resetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/users/${userId}/reset-password`, {
        newPassword,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get user roles summary
   */
  const getUserRolesSummary = async (): Promise<RolesSummary> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/users/roles/summary');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch roles summary');
      }

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch roles summary';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get available permissions
   */
  const getPermissions = async (): Promise<Permission[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/users/permissions');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch permissions');
      }

      return response.data.data.permissions;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch permissions';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    getUserRolesSummary,
    getPermissions,
  };
};
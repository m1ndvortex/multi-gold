import { useState, useCallback } from 'react';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  tax_id?: string;
  customer_group: 'REGULAR' | 'VIP' | 'WHOLESALER' | 'RETAILER';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  credit_limit: number;
  current_balance: number;
  opening_balance: number;
  tags?: string[];
  notes?: string;
  birthday?: string;
  anniversary?: string;
  preferred_language?: string;
  communication_preferences?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  contact_person?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  tax_id?: string;
  customer_group?: 'REGULAR' | 'VIP' | 'WHOLESALER' | 'RETAILER';
  credit_limit?: number;
  opening_balance?: number;
  tags?: string[];
  notes?: string;
  birthday?: string;
  anniversary?: string;
  preferred_language?: string;
  communication_preferences?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

export interface CustomerSearchFilters {
  search?: string;
  customer_group?: 'REGULAR' | 'VIP' | 'WHOLESALER' | 'RETAILER';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  tags?: string[];
  has_balance?: boolean;
  credit_limit_exceeded?: boolean;
  created_from?: string;
  created_to?: string;
}

export interface CustomerLedgerEntry {
  id: string;
  entry_type: 'DEBIT' | 'CREDIT' | 'OPENING_BALANCE' | 'ADJUSTMENT';
  amount: number;
  currency: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  balance_after: number;
  entry_date: string;
  created_at: string;
}

export interface CustomerTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CustomerStatistics {
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  customersWithBalance: number;
  customersOverCreditLimit: number;
  recentCustomers: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export const useCustomerManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/customers${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'An error occurred');
      }

      return result.data as T;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get customers with pagination and filters
  const getCustomers = useCallback(async (
    page: number = 1,
    limit: number = 20,
    filters: CustomerSearchFilters = {}
  ): Promise<PaginatedResponse<Customer>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return apiCall<PaginatedResponse<Customer>>(`?${params}`);
  }, [apiCall]);

  // Get customer by ID
  const getCustomer = useCallback(async (id: string): Promise<Customer> => {
    return apiCall<Customer>(`/${id}`);
  }, [apiCall]);

  // Create new customer
  const createCustomer = useCallback(async (data: CreateCustomerData): Promise<Customer> => {
    return apiCall<Customer>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [apiCall]);

  // Update customer
  const updateCustomer = useCallback(async (
    id: string,
    data: UpdateCustomerData
  ): Promise<Customer> => {
    return apiCall<Customer>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [apiCall]);

  // Delete customer
  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    return apiCall<void>(`/${id}`, {
      method: 'DELETE',
    });
  }, [apiCall]);

  // Get customer ledger
  const getCustomerLedger = useCallback(async (
    id: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    ledger: CustomerLedgerEntry[];
    customer: {
      id: string;
      name: string;
      current_balance: number;
      credit_limit: number;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiCall<any>(`/${id}/ledger?${params}`);
  }, [apiCall]);

  // Add ledger entry
  const addLedgerEntry = useCallback(async (
    customerId: string,
    data: {
      entry_type: 'DEBIT' | 'CREDIT' | 'OPENING_BALANCE' | 'ADJUSTMENT';
      amount: number;
      currency?: string;
      description: string;
      reference_type?: string;
      reference_id?: string;
      entry_date?: string;
    }
  ): Promise<void> => {
    return apiCall<void>(`/${customerId}/ledger`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [apiCall]);

  // Check credit limit
  const checkCreditLimit = useCallback(async (
    id: string,
    amount: number
  ): Promise<{
    allowed: boolean;
    availableCredit: number;
  }> => {
    const params = new URLSearchParams({
      amount: amount.toString(),
    });

    return apiCall<any>(`/${id}/credit-check?${params}`);
  }, [apiCall]);

  // Get customer tags
  const getCustomerTags = useCallback(async (): Promise<CustomerTag[]> => {
    return apiCall<CustomerTag[]>('/tags');
  }, [apiCall]);

  // Create customer tag
  const createCustomerTag = useCallback(async (data: {
    name: string;
    color?: string;
    description?: string;
  }): Promise<CustomerTag> => {
    return apiCall<CustomerTag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [apiCall]);

  // Get customer statistics
  const getCustomerStatistics = useCallback(async (): Promise<CustomerStatistics> => {
    return apiCall<CustomerStatistics>('/statistics');
  }, [apiCall]);

  // Export customers to CSV
  const exportCustomers = useCallback(async (
    filters: CustomerSearchFilters = {}
  ): Promise<Blob> => {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    );

    const response = await fetch(`/api/v1/customers/export?${params}`, {
      headers: {
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }, []);

  // Import customers from CSV
  const importCustomers = useCallback(async (file: File): Promise<{
    imported: number;
    errors: any[];
    importLogId: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/customers/import', {
        method: 'POST',
        body: formData,
      });

      const result: ApiResponse<any> = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Import failed');
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerLedger,
    addLedgerEntry,
    checkCreditLimit,
    getCustomerTags,
    createCustomerTag,
    getCustomerStatistics,
    exportCustomers,
    importCustomers,
  };
};
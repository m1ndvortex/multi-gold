import { useState } from 'react';
import { apiClient } from '@/utils/api';

export interface TenantProfile {
  id: string;
  name: string;
  subdomain: string;
  contact_email: string;
  contact_phone?: string;
  subscription_plan: string;
  status: string;
  trial_ends_at?: Date;
  is_active: boolean;
  settings: any;
  created_at: Date;
  updated_at: Date;
}

export interface TenantSettings {
  business: {
    name: string;
    logo?: string;
    address?: any;
    contact: any;
    tax_info: any;
  };
  financial: {
    default_currency: string;
    gold_pricing: any;
    tax_settings: any;
    payment_terms: any;
  };
  system: {
    language: string;
    timezone: string;
    date_format: string;
    number_format: string;
    rtl_layout: boolean;
  };
  security: {
    password_policy: any;
    session_settings: any;
    two_factor: any;
    ip_restrictions: any;
  };
  notifications: {
    email: any;
    sms: any;
    push: any;
  };
  features: any;
  customization: any;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  trial_ends_at?: Date;
  features: string[];
  limits: {
    users: number;
    storage_gb: number;
    api_calls_per_month: number;
  };
}

export const useTenantSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get tenant profile and settings
   */
  const getTenantProfile = async (): Promise<TenantProfile> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/tenant/profile');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch tenant profile');
      }

      return response.data.data.profile;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch tenant profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update tenant basic information
   */
  const updateTenantInfo = async (updateData: {
    name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: any;
  }): Promise<TenantProfile> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/info', updateData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update tenant info');
      }

      return response.data.data.profile;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update tenant info';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get tenant settings
   */
  const getTenantSettings = async (): Promise<TenantSettings> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/tenant/settings');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch tenant settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch tenant settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update tenant settings
   */
  const updateTenantSettings = async (settingsUpdate: Partial<TenantSettings>): Promise<TenantSettings> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/settings', settingsUpdate);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update tenant settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update tenant settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset tenant settings to defaults
   */
  const resetTenantSettings = async (): Promise<TenantSettings> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/tenant/settings/reset');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to reset tenant settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset tenant settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update tenant logo
   */
  const updateTenantLogo = async (logoUrl: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/logo', { logoUrl });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update tenant logo');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update tenant logo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get tenant subscription information
   */
  const getTenantSubscription = async (): Promise<SubscriptionInfo> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/tenant/subscription');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch subscription info');
      }

      return response.data.data.subscription;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch subscription info';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update business settings specifically
   */
  const updateBusinessSettings = async (businessData: any): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/settings/business', businessData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update business settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update business settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update financial settings specifically
   */
  const updateFinancialSettings = async (financialData: any): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/settings/financial', financialData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update financial settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update financial settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update security settings specifically
   */
  const updateSecuritySettings = async (securityData: any): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/settings/security', securityData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update security settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update security settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update notification settings specifically
   */
  const updateNotificationSettings = async (notificationData: any): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/tenant/settings/notifications', notificationData);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update notification settings');
      }

      return response.data.data.settings;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update notification settings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getTenantProfile,
    updateTenantInfo,
    getTenantSettings,
    updateTenantSettings,
    resetTenantSettings,
    updateTenantLogo,
    getTenantSubscription,
    updateBusinessSettings,
    updateFinancialSettings,
    updateSecuritySettings,
    updateNotificationSettings,
  };
};
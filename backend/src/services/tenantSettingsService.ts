import { PrismaClient, Tenant } from '@prisma/client';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { TenantService } from '@/services/tenantService';

export interface TenantSettings {
  // Business Information
  business: {
    name: string;
    logo?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
    contact: {
      phone?: string;
      email?: string;
      website?: string;
    };
    tax_info: {
      tax_id?: string;
      vat_number?: string;
    };
  };

  // Financial Settings
  financial: {
    default_currency: string;
    gold_pricing: {
      default_markup_percentage: number;
      auto_update_prices: boolean;
      price_source?: string;
    };
    tax_settings: {
      default_tax_rate: number;
      tax_inclusive: boolean;
    };
    payment_terms: {
      default_payment_days: number;
      late_fee_percentage: number;
    };
  };

  // System Preferences
  system: {
    language: string;
    timezone: string;
    date_format: string;
    number_format: string;
    rtl_layout: boolean;
  };

  // Security Settings
  security: {
    password_policy: {
      min_length: number;
      require_uppercase: boolean;
      require_lowercase: boolean;
      require_numbers: boolean;
      require_symbols: boolean;
      expiry_days?: number;
    };
    session_settings: {
      timeout_minutes: number;
      max_concurrent_sessions: number;
    };
    two_factor: {
      required_for_admins: boolean;
      required_for_all: boolean;
    };
    ip_restrictions: {
      enabled: boolean;
      allowed_ips: string[];
    };
  };

  // Notification Settings
  notifications: {
    email: {
      enabled: boolean;
      smtp_settings?: {
        host: string;
        port: number;
        username: string;
        password: string;
        use_tls: boolean;
      };
      templates: {
        invoice_sent: boolean;
        payment_reminder: boolean;
        low_inventory: boolean;
        user_welcome: boolean;
      };
    };
    sms: {
      enabled: boolean;
      provider?: string;
      api_key?: string;
      templates: {
        invoice_sent: boolean;
        payment_reminder: boolean;
        birthday_wishes: boolean;
      };
    };
    push: {
      enabled: boolean;
      templates: {
        new_order: boolean;
        low_inventory: boolean;
        overdue_payment: boolean;
      };
    };
  };

  // Feature Flags
  features: {
    inventory_management: boolean;
    accounting_module: boolean;
    crm_module: boolean;
    reporting_module: boolean;
    multi_currency: boolean;
    barcode_scanning: boolean;
    offline_mode: boolean;
    api_access: boolean;
  };

  // Customization
  customization: {
    theme: {
      primary_color: string;
      secondary_color: string;
      logo_url?: string;
      favicon_url?: string;
    };
    invoice_template: {
      template_id: string;
      custom_fields: Array<{
        name: string;
        type: string;
        required: boolean;
      }>;
    };
    dashboard: {
      default_widgets: string[];
      custom_kpis: Array<{
        name: string;
        formula: string;
        display_format: string;
      }>;
    };
  };
}

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
  settings: TenantSettings;
  created_at: Date;
  updated_at: Date;
}

export class TenantSettingsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get tenant profile and settings
   */
  async getTenantProfile(tenantId: string): Promise<TenantProfile> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      return this.mapTenantToProfile(tenant);
    } catch (error) {
      logger.error('Failed to get tenant profile:', error);
      throw error;
    }
  }

  /**
   * Update tenant basic information
   */
  async updateTenantInfo(tenantId: string, updateData: {
    name?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: any;
  }, updatedBy: string): Promise<TenantProfile> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      const updatedTenant = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: updateData.name || tenant.name,
          contact_email: updateData.contact_email || tenant.contact_email,
          contact_phone: updateData.contact_phone || tenant.contact_phone,
          address: updateData.address || tenant.address,
        },
      });

      logger.info(`Tenant info updated: ${tenantId} by: ${updatedBy}`);

      return this.mapTenantToProfile(updatedTenant);
    } catch (error) {
      logger.error('Failed to update tenant info:', error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(tenantId: string, settingsUpdate: Partial<TenantSettings>, updatedBy: string): Promise<TenantSettings> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      // Merge existing settings with updates
      const currentSettings = this.parseSettings(tenant.settings);
      const newSettings = this.mergeSettings(currentSettings, settingsUpdate);

      // Validate settings
      this.validateSettings(newSettings);

      // Update tenant settings
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: newSettings as any,
        },
      });

      logger.info(`Tenant settings updated: ${tenantId} by: ${updatedBy}`);

      return newSettings;
    } catch (error) {
      logger.error('Failed to update tenant settings:', error);
      throw error;
    }
  }

  /**
   * Get tenant settings only
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      if (!tenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      return this.parseSettings(tenant.settings);
    } catch (error) {
      logger.error('Failed to get tenant settings:', error);
      throw error;
    }
  }

  /**
   * Reset tenant settings to defaults
   */
  async resetTenantSettings(tenantId: string, resetBy: string): Promise<TenantSettings> {
    try {
      const defaultSettings = this.getDefaultSettings();

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: defaultSettings as any,
        },
      });

      logger.info(`Tenant settings reset to defaults: ${tenantId} by: ${resetBy}`);

      return defaultSettings;
    } catch (error) {
      logger.error('Failed to reset tenant settings:', error);
      throw error;
    }
  }

  /**
   * Update tenant logo
   */
  async updateTenantLogo(tenantId: string, logoUrl: string, updatedBy: string): Promise<void> {
    try {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { logo: logoUrl },
      });

      logger.info(`Tenant logo updated: ${tenantId} by: ${updatedBy}`);
    } catch (error) {
      logger.error('Failed to update tenant logo:', error);
      throw error;
    }
  }

  /**
   * Get tenant subscription info
   */
  async getTenantSubscription(tenantId: string): Promise<{
    plan: string;
    status: string;
    trial_ends_at?: Date;
    features: string[];
    limits: {
      users: number;
      storage_gb: number;
      api_calls_per_month: number;
    };
  }> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          subscription_plan: true,
          status: true,
          trial_ends_at: true,
        },
      });

      if (!tenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      const features = this.getPlanFeatures(tenant.subscription_plan);
      const limits = this.getPlanLimits(tenant.subscription_plan);

      return {
        plan: tenant.subscription_plan,
        status: tenant.status,
        trial_ends_at: tenant.trial_ends_at || undefined,
        features,
        limits,
      };
    } catch (error) {
      logger.error('Failed to get tenant subscription:', error);
      throw error;
    }
  }

  /**
   * Parse settings from database JSON
   */
  private parseSettings(settingsJson: any): TenantSettings {
    if (!settingsJson) {
      return this.getDefaultSettings();
    }

    try {
      const settings = typeof settingsJson === 'string' ? JSON.parse(settingsJson) : settingsJson;
      return this.mergeSettings(this.getDefaultSettings(), settings);
    } catch (error) {
      logger.warn('Failed to parse tenant settings, using defaults:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Merge settings objects deeply
   */
  private mergeSettings(defaultSettings: TenantSettings, updates: Partial<TenantSettings>): TenantSettings {
    const merged = JSON.parse(JSON.stringify(defaultSettings)); // Deep clone

    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Validate settings structure and values
   */
  private validateSettings(settings: TenantSettings): void {
    // Validate required fields
    if (!settings.business?.name) {
      throw createError('Business name is required', 400, 'INVALID_SETTINGS');
    }

    if (!settings.financial?.default_currency) {
      throw createError('Default currency is required', 400, 'INVALID_SETTINGS');
    }

    if (!settings.system?.language) {
      throw createError('System language is required', 400, 'INVALID_SETTINGS');
    }

    // Validate numeric values
    if (settings.financial.gold_pricing.default_markup_percentage < 0 || 
        settings.financial.gold_pricing.default_markup_percentage > 1000) {
      throw createError('Invalid markup percentage', 400, 'INVALID_SETTINGS');
    }

    if (settings.security.password_policy.min_length < 6 || 
        settings.security.password_policy.min_length > 128) {
      throw createError('Invalid password minimum length', 400, 'INVALID_SETTINGS');
    }
  }

  /**
   * Get default tenant settings
   */
  private getDefaultSettings(): TenantSettings {
    return {
      business: {
        name: '',
        contact: {},
        tax_info: {},
      },
      financial: {
        default_currency: 'IRR',
        gold_pricing: {
          default_markup_percentage: 10,
          auto_update_prices: true,
        },
        tax_settings: {
          default_tax_rate: 9,
          tax_inclusive: false,
        },
        payment_terms: {
          default_payment_days: 30,
          late_fee_percentage: 2,
        },
      },
      system: {
        language: 'fa',
        timezone: 'Asia/Tehran',
        date_format: 'YYYY/MM/DD',
        number_format: 'fa',
        rtl_layout: true,
      },
      security: {
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: true,
        },
        session_settings: {
          timeout_minutes: 60,
          max_concurrent_sessions: 5,
        },
        two_factor: {
          required_for_admins: false,
          required_for_all: false,
        },
        ip_restrictions: {
          enabled: false,
          allowed_ips: [],
        },
      },
      notifications: {
        email: {
          enabled: false,
          templates: {
            invoice_sent: true,
            payment_reminder: true,
            low_inventory: true,
            user_welcome: true,
          },
        },
        sms: {
          enabled: false,
          templates: {
            invoice_sent: false,
            payment_reminder: true,
            birthday_wishes: true,
          },
        },
        push: {
          enabled: true,
          templates: {
            new_order: true,
            low_inventory: true,
            overdue_payment: true,
          },
        },
      },
      features: {
        inventory_management: true,
        accounting_module: true,
        crm_module: true,
        reporting_module: true,
        multi_currency: false,
        barcode_scanning: true,
        offline_mode: true,
        api_access: false,
      },
      customization: {
        theme: {
          primary_color: '#1976d2',
          secondary_color: '#dc004e',
        },
        invoice_template: {
          template_id: 'default',
          custom_fields: [],
        },
        dashboard: {
          default_widgets: ['sales_today', 'profit_mtd', 'new_customers', 'low_inventory'],
          custom_kpis: [],
        },
      },
    };
  }

  /**
   * Get features available for a subscription plan
   */
  private getPlanFeatures(plan: string): string[] {
    const planFeatures: Record<string, string[]> = {
      BASIC: [
        'invoicing',
        'customer_management',
        'basic_inventory',
        'basic_reports',
      ],
      PROFESSIONAL: [
        'invoicing',
        'customer_management',
        'advanced_inventory',
        'accounting_module',
        'advanced_reports',
        'multi_currency',
        'api_access',
      ],
      ENTERPRISE: [
        'invoicing',
        'customer_management',
        'advanced_inventory',
        'accounting_module',
        'advanced_reports',
        'multi_currency',
        'api_access',
        'custom_integrations',
        'priority_support',
        'advanced_security',
      ],
    };

    return planFeatures[plan] || planFeatures.BASIC;
  }

  /**
   * Get limits for a subscription plan
   */
  private getPlanLimits(plan: string): {
    users: number;
    storage_gb: number;
    api_calls_per_month: number;
  } {
    const planLimits: Record<string, any> = {
      BASIC: {
        users: 3,
        storage_gb: 1,
        api_calls_per_month: 1000,
      },
      PROFESSIONAL: {
        users: 10,
        storage_gb: 10,
        api_calls_per_month: 10000,
      },
      ENTERPRISE: {
        users: -1, // Unlimited
        storage_gb: 100,
        api_calls_per_month: 100000,
      },
    };

    return planLimits[plan] || planLimits.BASIC;
  }

  /**
   * Map Tenant entity to TenantProfile
   */
  private mapTenantToProfile(tenant: Tenant): TenantProfile {
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone || undefined,
      subscription_plan: tenant.subscription_plan,
      status: tenant.status,
      trial_ends_at: tenant.trial_ends_at || undefined,
      is_active: tenant.is_active,
      settings: this.parseSettings(tenant.settings),
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
    };
  }
}
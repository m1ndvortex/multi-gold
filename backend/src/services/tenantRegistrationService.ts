import { PrismaClient, UserRole } from '@prisma/client';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { TenantService } from '@/services/tenantService';
import { AuthService } from '@/services/authService';

export interface TenantRegistrationData {
  // Tenant Information
  tenantName: string;
  subdomain: string;
  contactEmail: string;
  contactPhone?: string;
  
  // Admin User Information
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  
  // Business Information
  businessType?: string;
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Subscription
  subscriptionPlan?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
}

export interface TenantRegistrationResult {
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    trial_ends_at?: Date;
  };
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  setup: {
    completed: boolean;
    next_steps: string[];
  };
}

export class TenantRegistrationService {
  private prisma: PrismaClient;
  private authService: AuthService | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private getAuthService(): AuthService {
    if (!this.authService) {
      this.authService = new AuthService(this.prisma);
    }
    return this.authService;
  }

  /**
   * Register a new tenant with admin user
   */
  async registerTenant(registrationData: TenantRegistrationData): Promise<TenantRegistrationResult> {
    const transaction = await this.prisma.$transaction(async (tx) => {
      try {
        // Validate subdomain availability
        await this.validateSubdomain(registrationData.subdomain);

        // Validate admin email uniqueness across all tenants
        await this.validateAdminEmail(registrationData.adminEmail);

        // Create tenant
        const tenant = await TenantService.createTenant({
          name: registrationData.tenantName,
          subdomain: registrationData.subdomain,
          contact_email: registrationData.contactEmail,
          contact_phone: registrationData.contactPhone,
          subscription_plan: registrationData.subscriptionPlan || 'BASIC',
        });

        // Create admin user
        const adminUser = await this.getAuthService().register({
          email: registrationData.adminEmail,
          password: registrationData.adminPassword,
          name: registrationData.adminName,
          tenantId: tenant.id,
          role: UserRole.TENANT_ADMIN,
        });

        // Update tenant with business information if provided
        if (registrationData.businessAddress || registrationData.businessType) {
          await tx.tenant.update({
            where: { id: tenant.id },
            data: {
              address: registrationData.businessAddress as any,
              // Store business type in settings
              settings: {
                business: {
                  name: registrationData.tenantName,
                  type: registrationData.businessType,
                  address: registrationData.businessAddress,
                  contact: {
                    email: registrationData.contactEmail,
                    phone: registrationData.contactPhone,
                  },
                },
              } as any,
            },
          });
        }

        // Initialize tenant with default data
        await this.initializeTenantData(tenant.id, adminUser.id);

        logger.info(`Tenant registered successfully: ${tenant.name} (${tenant.subdomain})`);

        return {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            status: tenant.status,
            trial_ends_at: undefined, // Will be set from tenant data
          },
          admin: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
          },
          setup: {
            completed: false,
            next_steps: [
              'Complete business profile setup',
              'Configure financial settings',
              'Set up notification preferences',
              'Invite team members',
              'Import initial data (customers, products)',
            ],
          },
        };
      } catch (error) {
        logger.error('Tenant registration failed:', error);
        throw error;
      }
    });

    return transaction;
  }

  /**
   * Complete tenant setup wizard
   */
  async completeTenantSetup(tenantId: string, setupData: {
    businessProfile?: {
      description?: string;
      website?: string;
      tax_id?: string;
      vat_number?: string;
    };
    financialSettings?: {
      default_currency?: string;
      tax_rate?: number;
      gold_markup_percentage?: number;
    };
    notificationPreferences?: {
      email_notifications?: boolean;
      sms_notifications?: boolean;
      push_notifications?: boolean;
    };
  }, completedBy: string): Promise<void> {
    try {
      // Update tenant settings with setup data
      const currentTenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!currentTenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      const currentSettings = currentTenant.settings as any || {};
      
      // Merge setup data into settings
      const updatedSettings = {
        ...currentSettings,
        business: {
          ...currentSettings.business,
          ...setupData.businessProfile,
        },
        financial: {
          ...currentSettings.financial,
          ...setupData.financialSettings,
        },
        notifications: {
          ...currentSettings.notifications,
          ...setupData.notificationPreferences,
        },
        setup: {
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: completedBy,
        },
      };

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: updatedSettings,
        },
      });

      logger.info(`Tenant setup completed: ${tenantId} by: ${completedBy}`);
    } catch (error) {
      logger.error('Failed to complete tenant setup:', error);
      throw error;
    }
  }

  /**
   * Get tenant setup status
   */
  async getTenantSetupStatus(tenantId: string): Promise<{
    completed: boolean;
    steps: Array<{
      step: string;
      completed: boolean;
      required: boolean;
    }>;
    completion_percentage: number;
  }> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: {
            where: { is_active: true },
            select: { id: true, role: true },
          },
        },
      });

      if (!tenant) {
        throw createError('Tenant not found', 404, 'TENANT_NOT_FOUND');
      }

      const settings = tenant.settings as any || {};
      const business = settings.business || {};
      const financial = settings.financial || {};
      const notifications = settings.notifications || {};

      const steps = [
        {
          step: 'business_profile',
          completed: !!(business.name && business.contact?.email),
          required: true,
        },
        {
          step: 'financial_settings',
          completed: !!(financial.default_currency && financial.gold_pricing),
          required: true,
        },
        {
          step: 'notification_preferences',
          completed: !!(notifications.email || notifications.sms || notifications.push),
          required: false,
        },
        {
          step: 'team_members',
          completed: tenant.users.length > 1,
          required: false,
        },
        {
          step: 'initial_data',
          completed: false, // This would need to check if customers/products exist
          required: false,
        },
      ];

      const completedSteps = steps.filter(step => step.completed).length;
      const totalSteps = steps.length;
      const completion_percentage = Math.round((completedSteps / totalSteps) * 100);

      const allRequiredCompleted = steps
        .filter(step => step.required)
        .every(step => step.completed);

      return {
        completed: allRequiredCompleted && settings.setup?.completed,
        steps,
        completion_percentage,
      };
    } catch (error) {
      logger.error('Failed to get tenant setup status:', error);
      throw error;
    }
  }

  /**
   * Validate subdomain availability
   */
  private async validateSubdomain(subdomain: string): Promise<void> {
    // Check format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
      throw createError(
        'Subdomain must be 3-63 characters, contain only lowercase letters, numbers, and hyphens, and not start or end with a hyphen',
        400,
        'INVALID_SUBDOMAIN_FORMAT'
      );
    }

    // Check reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
      'support', 'help', 'docs', 'status', 'test', 'staging', 'dev', 'demo',
    ];

    if (reservedSubdomains.includes(subdomain)) {
      throw createError('This subdomain is reserved', 400, 'SUBDOMAIN_RESERVED');
    }

    // Check availability
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      throw createError('Subdomain is already taken', 409, 'SUBDOMAIN_TAKEN');
    }
  }

  /**
   * Validate admin email uniqueness
   */
  private async validateAdminEmail(email: string): Promise<void> {
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw createError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }
  }

  /**
   * Initialize tenant with default data
   */
  private async initializeTenantData(tenantId: string, adminUserId: string): Promise<void> {
    try {
      // This would typically create default accounts, categories, etc.
      // For now, we'll just log that initialization is complete
      logger.info(`Tenant data initialized for: ${tenantId}`);
      
      // In a real implementation, you might:
      // - Create default chart of accounts
      // - Set up default product categories
      // - Create sample data if requested
      // - Configure default templates
    } catch (error) {
      logger.error('Failed to initialize tenant data:', error);
      throw error;
    }
  }

  /**
   * Get tenant registration statistics (for admin dashboard)
   */
  async getRegistrationStats(dateRange?: { from: Date; to: Date }): Promise<{
    total_registrations: number;
    active_tenants: number;
    trial_tenants: number;
    registrations_by_plan: Array<{
      plan: string;
      count: number;
    }>;
    registrations_by_date: Array<{
      date: string;
      count: number;
    }>;
  }> {
    try {
      const whereClause: any = {};
      
      if (dateRange) {
        whereClause.created_at = {
          gte: dateRange.from,
          lte: dateRange.to,
        };
      }

      const [
        totalRegistrations,
        activeTenants,
        trialTenants,
        registrationsByPlan,
      ] = await Promise.all([
        this.prisma.tenant.count({ where: whereClause }),
        this.prisma.tenant.count({ 
          where: { ...whereClause, status: 'ACTIVE' } 
        }),
        this.prisma.tenant.count({ 
          where: { ...whereClause, status: 'TRIAL' } 
        }),
        this.prisma.tenant.groupBy({
          by: ['subscription_plan'],
          where: whereClause,
          _count: { subscription_plan: true },
        }),
      ]);

      // Get registrations by date (last 30 days if no range specified)
      const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();

      const registrationsByDate = await this.prisma.tenant.groupBy({
        by: ['created_at'],
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { created_at: true },
      });

      return {
        total_registrations: totalRegistrations,
        active_tenants: activeTenants,
        trial_tenants: trialTenants,
        registrations_by_plan: registrationsByPlan.map(item => ({
          plan: item.subscription_plan,
          count: item._count.subscription_plan,
        })),
        registrations_by_date: registrationsByDate.map(item => ({
          date: item.created_at.toISOString().split('T')[0],
          count: item._count.created_at,
        })),
      };
    } catch (error) {
      logger.error('Failed to get registration stats:', error);
      throw error;
    }
  }
}
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export interface AuditInfo {
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  description?: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
  tenant?: {
    id: string;
    name: string;
    schemaName: string;
  };
  auditInfo?: AuditInfo;
}

/**
 * Audit logging middleware
 * Logs all user actions for compliance and security
 */
export const auditLog = (action: string, entity: string, options: {
  captureRequest?: boolean;
  captureResponse?: boolean;
  sensitive?: boolean;
} = {}) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    
    // Store audit info in request for later use
    req.auditInfo = {
      action,
      entity,
      description: `${action} ${entity}`
    };

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    let responseData: any = null;
    let responseStatus = 200;

    // Override response methods to capture data
    if (options.captureResponse && !options.sensitive) {
      res.send = function(data: any) {
        responseData = data;
        responseStatus = res.statusCode;
        return originalSend.call(this, data);
      };

      res.json = function(data: any) {
        responseData = data;
        responseStatus = res.statusCode;
        return originalJson.call(this, data);
      };
    }

    // Continue with request processing
    next();

    // Log audit after response is sent
    res.on('finish', async () => {
      try {
        await logAuditEntry({
          req,
          res,
          action,
          entity,
          startTime,
          responseData: options.captureResponse ? responseData : null,
          responseStatus,
          captureRequest: options.captureRequest,
          sensitive: options.sensitive
        });
      } catch (error) {
        logger.error('Failed to log audit entry', error);
      }
    });
  };
};

/**
 * Enhanced audit logging for specific business operations
 */
export const businessAuditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original data for comparison
    let originalData: any = null;
    
    if (['UPDATE', 'DELETE'].includes(action)) {
      try {
        // Try to fetch original data based on entity and ID
        const entityId = req.params.id;
        if (entityId && req.tenant?.schemaName) {
          originalData = await getOriginalEntityData(entity, entityId, req.tenant.schemaName);
        }
      } catch (error) {
        logger.warn('Failed to fetch original data for audit', error);
      }
    }

    // Store in request for later use
    req.auditInfo = {
      action,
      entity,
      entityId: req.params.id,
      oldValues: originalData,
      description: `${action} ${entity} ${req.params.id || ''}`
    };

    next();
  };
};

/**
 * Middleware to finalize audit logging after successful operations
 */
export const finalizeAudit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  // This middleware should be called after successful operations
  if (req.auditInfo && res.statusCode < 400) {
    try {
      // Update audit info with new values if available
      if (req.auditInfo.action === 'CREATE' && res.locals.createdEntity) {
        req.auditInfo.newValues = res.locals.createdEntity;
        req.auditInfo.entityId = res.locals.createdEntity.id;
      } else if (req.auditInfo.action === 'UPDATE' && res.locals.updatedEntity) {
        req.auditInfo.newValues = res.locals.updatedEntity;
      }

      await logBusinessAuditEntry(req);
    } catch (error) {
      logger.error('Failed to finalize audit log', error);
    }
  }
  
  next();
};

/**
 * Log audit entry to database
 */
async function logAuditEntry(params: {
  req: AuthRequest;
  res: Response;
  action: string;
  entity: string;
  startTime: number;
  responseData: any;
  responseStatus: number;
  captureRequest?: boolean;
  sensitive?: boolean;
}): Promise<void> {
  const {
    req,
    res,
    action,
    entity,
    startTime,
    responseData,
    responseStatus,
    captureRequest,
    sensitive
  } = params;

  const duration = Date.now() - startTime;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Prepare audit data
  const auditData: any = {
    action,
    entity,
    entityId: req.params.id || null,
    userId: req.user?.id || null,
    tenantId: req.tenant?.id || null,
    ipAddress: clientIp,
    userAgent,
    method: req.method,
    url: req.url,
    statusCode: responseStatus,
    duration,
    details: {}
  };

  // Add request data if requested and not sensitive
  if (captureRequest && !sensitive) {
    auditData.details.request = {
      params: req.params,
      query: req.query,
      body: sanitizeRequestBody(req.body)
    };
  }

  // Add response data if available and not sensitive
  if (responseData && !sensitive) {
    auditData.details.response = sanitizeResponseData(responseData);
  }

  // Add error details if response indicates error
  if (responseStatus >= 400) {
    auditData.details.error = {
      statusCode: responseStatus,
      message: responseData?.error?.message || 'Unknown error'
    };
  }

  // Log to system audit table
  await prisma.systemAuditLog.create({
    data: auditData
  });

  // Also log to tenant-specific audit table if tenant context exists
  if (req.tenant?.schemaName) {
    await logTenantAuditEntry(auditData, req.tenant.schemaName);
  }
}

/**
 * Log business-specific audit entry
 */
async function logBusinessAuditEntry(req: AuthRequest): Promise<void> {
  if (!req.auditInfo || !req.tenant?.schemaName) {
    return;
  }

  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const auditData = {
    action: req.auditInfo.action,
    entity: req.auditInfo.entity,
    entityId: req.auditInfo.entityId || null,
    userId: req.user?.id || null,
    description: req.auditInfo.description || `${req.auditInfo.action} ${req.auditInfo.entity}`,
    oldValues: req.auditInfo.oldValues ? JSON.stringify(req.auditInfo.oldValues) : null,
    newValues: req.auditInfo.newValues ? JSON.stringify(req.auditInfo.newValues) : null,
    ipAddress: clientIp,
    userAgent,
    metadata: {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    }
  };

  await logTenantAuditEntry(auditData, req.tenant.schemaName);
}

/**
 * Log to tenant-specific audit table
 */
async function logTenantAuditEntry(auditData: any, schemaName: string): Promise<void> {
  try {
    // Use raw query to insert into tenant-specific audit table
    await prisma.$executeRawUnsafe(`
      INSERT INTO \`${schemaName}\`.\`audit_logs\` (
        \`id\`, \`action\`, \`entity\`, \`entity_id\`, \`user_id\`, 
        \`description\`, \`old_values\`, \`new_values\`, \`ip_address\`, 
        \`user_agent\`, \`metadata\`, \`created_at\`
      ) VALUES (
        UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
      )
    `,
      auditData.action,
      auditData.entity,
      auditData.entityId,
      auditData.userId,
      auditData.description || auditData.action,
      auditData.oldValues,
      auditData.newValues,
      auditData.ipAddress,
      auditData.userAgent,
      JSON.stringify(auditData.metadata || auditData.details || {})
    );
  } catch (error) {
    logger.error('Failed to log tenant audit entry', {
      error,
      schemaName,
      auditData
    });
  }
}

/**
 * Get original entity data for comparison
 */
async function getOriginalEntityData(entity: string, entityId: string, schemaName: string): Promise<any> {
  const tableName = entityToTableName(entity);
  
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT * FROM \`${schemaName}\`.\`${tableName}\` WHERE \`id\` = ?
    `, entityId);
    
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    logger.warn('Failed to fetch original entity data', {
      entity,
      entityId,
      schemaName,
      error
    });
    return null;
  }
}

/**
 * Convert entity name to table name
 */
function entityToTableName(entity: string): string {
  const entityTableMap: { [key: string]: string } = {
    'CUSTOMER': 'customers',
    'PRODUCT': 'products',
    'INVOICE': 'invoices',
    'ACCOUNT': 'accounts',
    'JOURNAL_ENTRY': 'journal_entries',
    'USER': 'users',
    'TENANT': 'tenants'
  };

  return entityTableMap[entity] || entity.toLowerCase() + 's';
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'taxId'
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitize response data to remove sensitive information
 */
function sanitizeResponseData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Limit response data size for audit logs
  const dataString = JSON.stringify(data);
  if (dataString.length > 10000) {
    return { message: '[RESPONSE_TOO_LARGE_FOR_AUDIT]', size: dataString.length };
  }

  return data;
}

/**
 * Audit configuration for different entities
 */
export const auditConfigs = {
  // High-priority business entities
  customer: {
    create: auditLog('CREATE', 'CUSTOMER', { captureRequest: true, captureResponse: true }),
    update: businessAuditLog('UPDATE', 'CUSTOMER'),
    delete: businessAuditLog('DELETE', 'CUSTOMER')
  },
  
  product: {
    create: auditLog('CREATE', 'PRODUCT', { captureRequest: true, captureResponse: true }),
    update: businessAuditLog('UPDATE', 'PRODUCT'),
    delete: businessAuditLog('DELETE', 'PRODUCT')
  },
  
  invoice: {
    create: auditLog('CREATE', 'INVOICE', { captureRequest: true, captureResponse: true }),
    update: businessAuditLog('UPDATE', 'INVOICE'),
    delete: businessAuditLog('DELETE', 'INVOICE'),
    approve: auditLog('APPROVE', 'INVOICE'),
    cancel: auditLog('CANCEL', 'INVOICE')
  },
  
  account: {
    create: auditLog('CREATE', 'ACCOUNT', { captureRequest: true, captureResponse: true }),
    update: businessAuditLog('UPDATE', 'ACCOUNT'),
    delete: businessAuditLog('DELETE', 'ACCOUNT')
  },
  
  journalEntry: {
    create: auditLog('CREATE', 'JOURNAL_ENTRY', { captureRequest: true, captureResponse: true }),
    update: businessAuditLog('UPDATE', 'JOURNAL_ENTRY'),
    delete: businessAuditLog('DELETE', 'JOURNAL_ENTRY'),
    post: auditLog('POST', 'JOURNAL_ENTRY')
  },

  // Authentication and security events
  auth: {
    login: auditLog('LOGIN', 'USER', { captureRequest: false, sensitive: true }),
    logout: auditLog('LOGOUT', 'USER', { sensitive: true }),
    register: auditLog('REGISTER', 'USER', { captureRequest: false, sensitive: true }),
    passwordReset: auditLog('PASSWORD_RESET', 'USER', { sensitive: true }),
    twoFactorEnable: auditLog('2FA_ENABLE', 'USER', { sensitive: true }),
    twoFactorDisable: auditLog('2FA_DISABLE', 'USER', { sensitive: true })
  },

  // System administration
  admin: {
    tenantCreate: auditLog('CREATE', 'TENANT', { captureRequest: true, captureResponse: true }),
    tenantUpdate: businessAuditLog('UPDATE', 'TENANT'),
    tenantDelete: businessAuditLog('DELETE', 'TENANT'),
    userCreate: auditLog('CREATE', 'USER', { captureRequest: false, sensitive: true }),
    userUpdate: businessAuditLog('UPDATE', 'USER'),
    userDelete: businessAuditLog('DELETE', 'USER')
  },

  // User management operations
  userManagement: {
    userCreate: auditLog('USER_CREATE', 'USER', { captureRequest: false, sensitive: true }),
    userUpdate: businessAuditLog('USER_UPDATE', 'USER'),
    userDelete: businessAuditLog('USER_DELETE', 'USER'),
    passwordReset: auditLog('PASSWORD_RESET', 'USER', { sensitive: true }),
  },

  // Tenant settings operations
  tenantSettings: {
    infoUpdate: businessAuditLog('TENANT_INFO_UPDATE', 'TENANT'),
    settingsUpdate: businessAuditLog('TENANT_SETTINGS_UPDATE', 'TENANT'),
    settingsReset: auditLog('TENANT_SETTINGS_RESET', 'TENANT'),
    logoUpdate: auditLog('TENANT_LOGO_UPDATE', 'TENANT'),
    businessUpdate: businessAuditLog('TENANT_BUSINESS_UPDATE', 'TENANT'),
    financialUpdate: businessAuditLog('TENANT_FINANCIAL_UPDATE', 'TENANT'),
    securityUpdate: businessAuditLog('TENANT_SECURITY_UPDATE', 'TENANT'),
    notificationUpdate: businessAuditLog('TENANT_NOTIFICATION_UPDATE', 'TENANT'),
  },

  // Tenant registration operations
  tenantRegistration: {
    register: auditLog('TENANT_REGISTER', 'TENANT', { captureRequest: false, sensitive: true }),
    setupComplete: auditLog('TENANT_SETUP_COMPLETE', 'TENANT'),
  }
};

export default auditLog;
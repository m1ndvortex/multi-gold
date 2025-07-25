import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

/**
 * Joi validation middleware factory
 * Creates middleware that validates request data against provided schemas
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: any[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      if (error) {
        validationErrors.push({
          location: 'body',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        });
      }
    }

    // Validate request parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      if (error) {
        validationErrors.push({
          location: 'params',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        });
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });
      if (error) {
        validationErrors.push({
          location: 'query',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        });
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error } = schema.headers.validate(req.headers, { 
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: true // Allow other headers
      });
      if (error) {
        validationErrors.push({
          location: 'headers',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        });
      }
    }

    // If validation errors exist, return error response
    if (validationErrors.length > 0) {
      logger.warn('Request validation failed', {
        url: req.url,
        method: req.method,
        errors: validationErrors,
        tenantId: req.headers['x-tenant-id']
      });

      return next(createError(
        'Request validation failed',
        400,
        'VALIDATION_ERROR',
        validationErrors
      ));
    }

    next();
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Tenant ID validation
  tenantId: Joi.string().uuid().required(),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Common ID patterns
  uuid: Joi.string().uuid(),
  objectId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/),
  
  // Date ranges
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),

  // Search parameters
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    filters: Joi.object().optional()
  }),

  // Common headers
  tenantHeaders: Joi.object({
    'x-tenant-id': Joi.string().uuid().required()
  }).unknown(true),

  // Authentication headers
  authHeaders: Joi.object({
    'authorization': Joi.string().pattern(/^Bearer .+$/).required()
  }).unknown(true)
};

/**
 * Business-specific validation schemas
 */
export const businessSchemas = {
  // Customer validation
  customer: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[\+]?[0-9\-\(\)\s]+$/).optional(),
    address: Joi.string().max(500).optional(),
    taxId: Joi.string().max(50).optional(),
    creditLimit: Joi.number().precision(2).min(0).optional(),
    customerGroup: Joi.string().valid('RETAIL', 'WHOLESALE', 'VIP').default('RETAIL'),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
  }),

  // Product validation
  product: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    sku: Joi.string().min(1).max(50).required(),
    category: Joi.string().valid('RAW_GOLD', 'JEWELRY', 'COINS', 'STONES').required(),
    weight: Joi.number().precision(3).min(0).optional(),
    purity: Joi.number().min(0).max(100).optional(),
    manufacturingCost: Joi.number().precision(2).min(0).optional(),
    currentStock: Joi.number().integer().min(0).default(0),
    minimumStock: Joi.number().integer().min(0).default(0),
    barcode: Joi.string().max(100).optional()
  }),

  // Invoice validation
  invoice: Joi.object({
    customerId: Joi.string().uuid().required(),
    type: Joi.string().valid('SALE', 'PURCHASE', 'TRADE').required(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        quantity: Joi.number().precision(3).min(0.001).required(),
        unitPrice: Joi.number().precision(2).min(0).required(),
        discount: Joi.number().precision(2).min(0).max(100).default(0)
      })
    ).min(1).required(),
    paymentTerms: Joi.string().valid('CASH', 'CREDIT', 'PARTIAL').default('CASH'),
    notes: Joi.string().max(1000).optional()
  }),

  // Account validation (Chart of Accounts)
  account: Joi.object({
    code: Joi.string().min(1).max(20).required(),
    name: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE').required(),
    parentId: Joi.string().uuid().optional(),
    description: Joi.string().max(500).optional()
  }),

  // Journal entry validation
  journalEntry: Joi.object({
    description: Joi.string().min(2).max(200).required(),
    reference: Joi.string().max(50).optional(),
    lines: Joi.array().items(
      Joi.object({
        accountId: Joi.string().uuid().required(),
        debit: Joi.number().precision(2).min(0).optional(),
        credit: Joi.number().precision(2).min(0).optional(),
        description: Joi.string().max(200).optional()
      }).custom((value, helpers) => {
        // Ensure either debit or credit is provided, but not both
        const hasDebit = value.debit && value.debit > 0;
        const hasCredit = value.credit && value.credit > 0;
        
        if (!hasDebit && !hasCredit) {
          return helpers.error('custom.debitOrCredit');
        }
        if (hasDebit && hasCredit) {
          return helpers.error('custom.notBoth');
        }
        
        return value;
      })
    ).min(2).required()
      .custom((lines, helpers) => {
        // Validate double-entry: total debits must equal total credits
        const totalDebits = lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
        const totalCredits = lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          return helpers.error('custom.balanceRequired');
        }
        
        return lines;
      })
  })
};

// Custom error messages
const customMessages = {
  'custom.debitOrCredit': 'Either debit or credit amount is required',
  'custom.notBoth': 'Cannot have both debit and credit amounts',
  'custom.balanceRequired': 'Total debits must equal total credits'
};

// Apply custom messages to Joi
Object.entries(customMessages).forEach(([key, message]) => {
  Joi.defaults((schema) => schema.messages({ [key]: message }));
});

export default validate;
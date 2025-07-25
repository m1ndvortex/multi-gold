import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validate, businessSchemas, commonSchemas } from '@/middleware/validationMiddleware';
import { createError } from '@/middleware/errorHandler';

// Mock the error handler
jest.mock('@/middleware/errorHandler', () => ({
  createError: jest.fn((message, statusCode, code, details) => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
  })
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      url: '/test',
      method: 'POST'
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Body Validation', () => {
    it('should pass validation with valid customer data', () => {
      const validCustomerData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        customerGroup: 'RETAIL',
        creditLimit: 1000
      };

      mockReq.body = validCustomerData;

      const middleware = validate({ body: businessSchemas.customer });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(createError).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid customer data', () => {
      const invalidCustomerData = {
        name: 'A', // Too short
        email: 'invalid-email',
        phone: '123', // Too short
        customerGroup: 'INVALID_GROUP',
        creditLimit: -100 // Negative
      };

      mockReq.body = invalidCustomerData;

      const middleware = validate({ body: businessSchemas.customer });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(createError).toHaveBeenCalledWith(
        'Request validation failed',
        400,
        'VALIDATION_ERROR',
        expect.any(Array)
      );
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate pagination parameters', () => {
      mockReq.query = {
        page: '1',
        limit: '20',
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const middleware = validate({ query: commonSchemas.pagination });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(createError).not.toHaveBeenCalled();
    });
  });

  describe('URL Parameter Validation', () => {
    it('should validate UUID parameters', () => {
      mockReq.params = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const middleware = validate({ 
        params: Joi.object({ id: commonSchemas.uuid.required() })
      });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(createError).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid UUID', () => {
      mockReq.params = {
        id: 'invalid-uuid'
      };

      const middleware = validate({ 
        params: Joi.object({ id: commonSchemas.uuid.required() })
      });
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(createError).toHaveBeenCalled();
    });
  });
});
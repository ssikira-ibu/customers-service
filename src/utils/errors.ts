import { Context } from 'koa';
import { ZodError } from 'zod';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any[];
    field?: string;
  };
}

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_UUID = 'INVALID_UUID',
  
  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Resource errors
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  PHONE_NOT_FOUND = 'PHONE_NOT_FOUND',
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  REMINDER_NOT_FOUND = 'REMINDER_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  
  // Conflict errors
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

export function createApiError(code: ErrorCode, message: string, details?: any[], field?: string): ApiError {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
      ...(field && { field })
    }
  };
}

export function handleValidationError(zodError: ZodError): ApiError {
  return createApiError(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    zodError.errors
  );
}

export function handleSequelizeError(error: any): ApiError {
  if (error.name === 'SequelizeUniqueConstraintError') {
    // Extract field name from the error if possible
    const field = error.errors?.[0]?.path;
    const message = field === 'email' 
      ? 'A customer with this email already exists'
      : 'Duplicate value detected';
    
    return createApiError(
      ErrorCode.EMAIL_ALREADY_EXISTS,
      message,
      undefined,
      field
    );
  }
  
  if (error.name === 'SequelizeValidationError') {
    return createApiError(
      ErrorCode.VALIDATION_ERROR,
      'Database validation failed',
      error.errors
    );
  }
  
  return createApiError(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed'
  );
}

export function sendError(ctx: Context, statusCode: number, apiError: ApiError): void {
  ctx.status = statusCode;
  ctx.body = apiError;
}

export function sendValidationError(ctx: Context, zodError: ZodError): void {
  sendError(ctx, 400, handleValidationError(zodError));
}

export function sendNotFoundError(ctx: Context, resourceType: string): void {
  const errorCode = `${resourceType.toUpperCase()}_NOT_FOUND` as ErrorCode;
  const message = `${resourceType} not found`;
  
  sendError(ctx, 404, createApiError(errorCode, message));
}

export function sendUnauthorizedError(ctx: Context, message: string = 'Authentication required'): void {
  sendError(ctx, 401, createApiError(ErrorCode.UNAUTHORIZED, message));
}

export function sendInvalidUuidError(ctx: Context): void {
  sendError(ctx, 400, createApiError(ErrorCode.INVALID_UUID, 'Invalid UUID format'));
}

export function sendInternalServerError(ctx: Context, message: string = 'Internal server error'): void {
  sendError(ctx, 500, createApiError(ErrorCode.INTERNAL_SERVER_ERROR, message));
}

export function sendConflictError(ctx: Context, message: string): void {
  sendError(ctx, 409, createApiError(ErrorCode.EMAIL_ALREADY_EXISTS, message));
}
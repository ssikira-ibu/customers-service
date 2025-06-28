import { Context, Next } from 'koa';
import { AuthContext } from './auth';
import { Customer } from '../db/models';
import { sendInvalidUuidError, sendNotFoundError, sendUnauthorizedError } from '../utils/errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ValidationContext extends AuthContext {
  validatedCustomerId?: string;
  validatedResourceId?: string;
  customer?: any; // Will be populated by requireCustomerAccess
}

/**
 * Middleware to validate UUID format for customerId parameter
 */
export async function validateCustomerId(ctx: ValidationContext, next: Next) {
  const customerId = ctx.params.customerId;
  
  if (!customerId || !UUID_REGEX.test(customerId)) {
    sendInvalidUuidError(ctx);
    return;
  }
  
  ctx.validatedCustomerId = customerId;
  await next();
}

/**
 * Middleware to validate UUID format for resource ID parameter (like addressId, phoneId, etc.)
 */
export async function validateResourceId(ctx: ValidationContext, next: Next) {
  const resourceId = ctx.params.id;
  
  if (!resourceId || !UUID_REGEX.test(resourceId)) {
    sendInvalidUuidError(ctx);
    return;
  }
  
  ctx.validatedResourceId = resourceId;
  await next();
}

/**
 * Middleware to validate multiple UUID parameters
 */
export async function validateUuids(ctx: ValidationContext, next: Next) {
  const customerId = ctx.params.customerId;
  const resourceId = ctx.params.id;
  
  if (customerId && !UUID_REGEX.test(customerId)) {
    sendInvalidUuidError(ctx);
    return;
  }
  
  if (resourceId && !UUID_REGEX.test(resourceId)) {
    sendInvalidUuidError(ctx);
    return;
  }
  
  if (customerId) ctx.validatedCustomerId = customerId;
  if (resourceId) ctx.validatedResourceId = resourceId;
  
  await next();
}

/**
 * Middleware to verify customer exists and belongs to current user
 * Must be used after authentication middleware
 */
export async function requireCustomerAccess(ctx: ValidationContext, next: Next) {
  if (!ctx.user?.uid) {
    sendUnauthorizedError(ctx);
    return;
  }
  
  const customerId = ctx.validatedCustomerId || ctx.params.customerId;
  
  if (!customerId) {
    sendInvalidUuidError(ctx);
    return;
  }
  
  try {
    const customer = await Customer.findOne({
      where: {
        id: customerId,
        userId: ctx.user!.uid
      }
    });
    
    if (!customer) {
      sendNotFoundError(ctx, 'Customer');
      return;
    }
    
    // Attach customer to context for downstream use
    ctx.customer = customer;
    await next();
    
  } catch (error) {
    ctx.log.error('Error checking customer access:', error);
    sendInvalidUuidError(ctx);
  }
}

/**
 * Combined middleware that validates customer ID and checks access
 */
export async function validateAndRequireCustomerAccess(ctx: ValidationContext, next: Next) {
  await validateCustomerId(ctx, async () => {
    await requireCustomerAccess(ctx, next);
  });
}
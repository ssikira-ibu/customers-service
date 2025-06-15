// Error handling utility functions for testing
export function formatValidationError(errors: any[]): { status: number; body: any } {
  return {
    status: 400,
    body: { errors }
  };
}

export function formatDatabaseError(error: any): { status: number; body: any } {
  if (error && error.name === 'SequelizeUniqueConstraintError') {
    return {
      status: 409,
      body: { error: 'A customer with this email already exists' }
    };
  }
  
  return {
    status: 500,
    body: { error: 'Internal server Error' }
  };
}

export function formatAuthError(error: any): { status: number; body: any } {
  if (error && error.code === 'auth/email-already-exists') {
    return {
      status: 409,
      body: { error: 'Email already in use' }
    };
  }
  
  if (error && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-password')) {
    return {
      status: 401,
      body: { error: 'Invalid email or password' }
    };
  }
  
  return {
    status: 500,
    body: { error: 'Authentication failed' }
  };
}

export function formatNotFoundError(resource: string): { status: number; body: any } {
  return {
    status: 404,
    body: { error: `${resource} not found` }
  };
}

export function formatBadRequestError(message: string): { status: number; body: any } {
  return {
    status: 400,
    body: { error: message }
  };
}

export function isSequelizeError(error: any): boolean {
  if (!error || typeof error !== 'object' || typeof error.name !== 'string') return false;
  return error.name.startsWith('Sequelize');
}

export function isFirebaseError(error: any): boolean {
  if (!error || typeof error !== 'object' || typeof error.code !== 'string') return false;
  return error.code.startsWith('auth/');
}

export function sanitizeErrorMessage(error: any): string {
  if (isSequelizeError(error)) {
    return 'Database operation failed';
  }
  
  if (isFirebaseError(error)) {
    return 'Authentication service error';
  }
  
  return 'Internal server error';
}

describe('Error Handling', () => {
  describe('formatValidationError', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        { path: ['firstName'], message: 'firstName is required' },
        { path: ['email'], message: 'Invalid email address' }
      ];

      const result = formatValidationError(errors);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ errors });
    });

    it('should handle empty errors array', () => {
      const errors: any[] = [];

      const result = formatValidationError(errors);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ errors: [] });
    });
  });

  describe('formatDatabaseError', () => {
    it('should handle unique constraint error', () => {
      const error = {
        name: 'SequelizeUniqueConstraintError',
        message: 'Validation error'
      };

      const result = formatDatabaseError(error);

      expect(result.status).toBe(409);
      expect(result.body).toEqual({ error: 'A customer with this email already exists' });
    });

    it('should handle generic database error', () => {
      const error = {
        name: 'SequelizeConnectionError',
        message: 'Connection failed'
      };

      const result = formatDatabaseError(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: 'Internal server Error' });
    });

    it('should handle non-Sequelize error', () => {
      const error = new Error('Generic error');

      const result = formatDatabaseError(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: 'Internal server Error' });
    });
  });

  describe('formatAuthError', () => {
    it('should handle email already exists error', () => {
      const error = {
        code: 'auth/email-already-exists',
        message: 'Email already in use'
      };

      const result = formatAuthError(error);

      expect(result.status).toBe(409);
      expect(result.body).toEqual({ error: 'Email already in use' });
    });

    it('should handle user not found error', () => {
      const error = {
        code: 'auth/user-not-found',
        message: 'User not found'
      };

      const result = formatAuthError(error);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: 'Invalid email or password' });
    });

    it('should handle invalid password error', () => {
      const error = {
        code: 'auth/invalid-password',
        message: 'Invalid password'
      };

      const result = formatAuthError(error);

      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: 'Invalid email or password' });
    });

    it('should handle generic auth error', () => {
      const error = {
        code: 'auth/too-many-requests',
        message: 'Too many requests'
      };

      const result = formatAuthError(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: 'Authentication failed' });
    });

    it('should handle non-Firebase error', () => {
      const error = new Error('Generic error');

      const result = formatAuthError(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: 'Authentication failed' });
    });
  });

  describe('formatNotFoundError', () => {
    it('should format not found error correctly', () => {
      const result = formatNotFoundError('Customer');

      expect(result.status).toBe(404);
      expect(result.body).toEqual({ error: 'Customer not found' });
    });

    it('should handle different resource types', () => {
      const result = formatNotFoundError('User');

      expect(result.status).toBe(404);
      expect(result.body).toEqual({ error: 'User not found' });
    });
  });

  describe('formatBadRequestError', () => {
    it('should format bad request error correctly', () => {
      const result = formatBadRequestError('Invalid UUID format');

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: 'Invalid UUID format' });
    });

    it('should handle different error messages', () => {
      const result = formatBadRequestError('Missing required field');

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: 'Missing required field' });
    });
  });

  describe('isSequelizeError', () => {
    it('should identify Sequelize errors', () => {
      const sequelizeErrors = [
        { name: 'SequelizeUniqueConstraintError' },
        { name: 'SequelizeValidationError' },
        { name: 'SequelizeConnectionError' },
        { name: 'SequelizeTimeoutError' }
      ];

      sequelizeErrors.forEach(error => {
        expect(isSequelizeError(error)).toBe(true);
      });
    });

    it('should reject non-Sequelize errors', () => {
      const nonSequelizeErrors = [
        { name: 'FirebaseError' },
        { name: 'ValidationError' },
        { code: 'auth/user-not-found' },
        new Error('Generic error')
      ];

      nonSequelizeErrors.forEach(error => {
        expect(isSequelizeError(error)).toBe(false);
      });
    });

    it('should handle null and undefined', () => {
      expect(isSequelizeError(null)).toBe(false);
      expect(isSequelizeError(undefined)).toBe(false);
    });
  });

  describe('isFirebaseError', () => {
    it('should identify Firebase errors', () => {
      const firebaseErrors = [
        { code: 'auth/user-not-found' },
        { code: 'auth/email-already-exists' },
        { code: 'auth/invalid-password' },
        { code: 'auth/id-token-expired' }
      ];

      firebaseErrors.forEach(error => {
        expect(isFirebaseError(error)).toBe(true);
      });
    });

    it('should reject non-Firebase errors', () => {
      const nonFirebaseErrors = [
        { name: 'SequelizeUniqueConstraintError' },
        { name: 'ValidationError' },
        { message: 'Generic error' },
        new Error('Generic error')
      ];

      nonFirebaseErrors.forEach(error => {
        expect(isFirebaseError(error)).toBe(false);
      });
    });

    it('should handle null and undefined', () => {
      expect(isFirebaseError(null)).toBe(false);
      expect(isFirebaseError(undefined)).toBe(false);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should sanitize Sequelize errors', () => {
      const error = { name: 'SequelizeUniqueConstraintError' };
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('Database operation failed');
    });

    it('should sanitize Firebase errors', () => {
      const error = { code: 'auth/user-not-found' };
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('Authentication service error');
    });

    it('should sanitize generic errors', () => {
      const error = new Error('Sensitive information');
      const result = sanitizeErrorMessage(error);
      expect(result).toBe('Internal server error');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeErrorMessage(null)).toBe('Internal server error');
      expect(sanitizeErrorMessage(undefined)).toBe('Internal server error');
    });
  });

  describe('Error handling integration', () => {
    it('should handle complete error flow for validation', () => {
      const errors = [{ path: ['email'], message: 'Invalid email' }];
      const result = formatValidationError(errors);
      
      expect(result.status).toBe(400);
      expect(result.body.errors).toEqual(errors);
    });

    it('should handle complete error flow for database', () => {
      const error = { name: 'SequelizeUniqueConstraintError' };
      const result = formatDatabaseError(error);
      
      expect(result.status).toBe(409);
      expect(result.body.error).toBe('A customer with this email already exists');
    });

    it('should handle complete error flow for authentication', () => {
      const error = { code: 'auth/email-already-exists' };
      const result = formatAuthError(error);
      
      expect(result.status).toBe(409);
      expect(result.body.error).toBe('Email already in use');
    });

    it('should provide consistent error structure', () => {
      const errorTypes = [
        formatValidationError([]),
        formatDatabaseError({ name: 'SequelizeError' }),
        formatAuthError({ code: 'auth/error' }),
        formatNotFoundError('Resource'),
        formatBadRequestError('Bad request')
      ];

      errorTypes.forEach(result => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('body');
        expect(typeof result.status).toBe('number');
        expect(typeof result.body).toBe('object');
      });
    });
  });
}); 
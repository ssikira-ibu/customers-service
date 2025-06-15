import { Context, Next } from 'koa';
import admin from '../config/firebase';
import { authenticate, AuthContext } from '../middleware/auth';

// Mock the Firebase admin SDK
jest.mock('../config/firebase');

describe('Authentication Middleware', () => {
  let mockContext: Partial<AuthContext>;
  let mockNext: jest.MockedFunction<Next>;
  let mockAuth: jest.Mocked<any>;

  beforeEach(() => {
    mockNext = jest.fn();
    mockAuth = {
      verifyIdToken: jest.fn(),
    };
    
    (admin.auth as jest.Mock).mockReturnValue(mockAuth);

    mockContext = {
      get: jest.fn(),
      log: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        level: 'info',
        fatal: jest.fn(),
        trace: jest.fn(),
        silent: jest.fn(),
      } as any,
      status: 200,
      body: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should successfully authenticate with valid Bearer token', async () => {
      const mockDecodedToken = {
        uid: 'user123',
        email: 'user@example.com',
        email_verified: true,
      };

      mockAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer valid-token-here');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('valid-token-here');
      expect(mockContext.user).toEqual(mockDecodedToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.status).toBe(200);
    });

    it('should reject request without Authorization header', async () => {
      (mockContext.get as jest.Mock).mockReturnValue(undefined);

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
      expect(mockContext.log!.error).toHaveBeenCalledWith('Authentication error:', expect.any(Error));
    });

    it('should reject request with empty Authorization header', async () => {
      (mockContext.get as jest.Mock).mockReturnValue('');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
    });

    it('should reject request without Bearer prefix', async () => {
      (mockContext.get as jest.Mock).mockReturnValue('InvalidPrefix token-here');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
    });

    it('should reject request with Bearer prefix but no token', async () => {
      const mockError = new Error('Token verification failed');
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer ');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
      expect(mockContext.log!.error).toHaveBeenCalledWith('Authentication error:', mockError);
    });

    it('should handle Firebase token verification failure', async () => {
      const mockError = new Error('Token verification failed');
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer invalid-token');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('invalid-token');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
      expect(mockContext.log!.error).toHaveBeenCalledWith('Authentication error:', mockError);
    });

    it('should handle Firebase auth errors', async () => {
      const mockError = {
        code: 'auth/id-token-expired',
        message: 'The provided ID token is expired.',
      };
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer expired-token');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('expired-token');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
      expect(mockContext.log!.error).toHaveBeenCalledWith('Authentication error:', mockError);
    });

    it('should handle malformed token', async () => {
      const mockError = {
        code: 'auth/argument-error',
        message: 'The provided ID token is malformed.',
      };
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer malformed-token');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('malformed-token');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
    });

    it('should handle revoked token', async () => {
      const mockError = {
        code: 'auth/id-token-revoked',
        message: 'The provided ID token has been revoked.',
      };
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer revoked-token');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('revoked-token');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
    });

    it('should handle user not found error', async () => {
      const mockError = {
        code: 'auth/user-not-found',
        message: 'No user record found for the given ID token.',
      };
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer user-not-found-token');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('user-not-found-token');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
    });

    it('should handle unexpected errors', async () => {
      const mockError = new Error('Unexpected database error');
      mockAuth.verifyIdToken.mockRejectedValue(mockError);
      (mockContext.get as jest.Mock).mockReturnValue('Bearer valid-token');

      await authenticate(mockContext as AuthContext, mockNext);

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ error: 'Invalid token' });
      expect(mockContext.log!.error).toHaveBeenCalledWith('Authentication error:', mockError);
    });
  });

  describe('AuthContext interface', () => {
    it('should extend DefaultContext with user property', () => {
      const context: AuthContext = {
        ...mockContext,
        user: {
          uid: 'user123',
          email: 'user@example.com',
          email_verified: true,
        },
      } as AuthContext;

      expect(context.user).toBeDefined();
      expect(context.user?.uid).toBe('user123');
      expect(context.user?.email).toBe('user@example.com');
    });

    it('should allow user property to be optional', () => {
      const context: AuthContext = {
        ...mockContext,
      } as AuthContext;

      expect(context.user).toBeUndefined();
    });
  });
}); 
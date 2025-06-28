import { ensureUserExists } from '../utils/user';
import { User } from '../db/models';
import admin from '../config/firebase';

// Mock the dependencies
jest.mock('../db/models');
jest.mock('../config/firebase');

const mockUser = User as jest.Mocked<typeof User>;
const mockAdmin = admin as jest.Mocked<typeof admin>;

describe('ensureUserExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing user if found in database', async () => {
    const existingUser = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      photoURL: null,
      disabled: false,
      lastSignInTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockUser.findByPk.mockResolvedValue(existingUser as any);

    const result = await ensureUserExists('user123');

    expect(mockUser.findByPk).toHaveBeenCalledWith('user123');
    expect(mockAdmin.auth).not.toHaveBeenCalled();
    expect(mockUser.create).not.toHaveBeenCalled();
    expect(result).toEqual(existingUser);
  });

  it('should create new user if not found in database', async () => {
    const firebaseUser = {
      uid: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      photoURL: 'https://example.com/photo.jpg',
      disabled: false,
      metadata: {
        lastSignInTime: '2023-01-01T00:00:00Z'
      }
    };

    const createdUser = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      photoURL: 'https://example.com/photo.jpg',
      disabled: false,
      lastSignInTime: new Date('2023-01-01T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockUser.findByPk.mockResolvedValue(null);
    mockAdmin.auth.mockReturnValue({
      getUser: jest.fn().mockResolvedValue(firebaseUser)
    } as any);
    mockUser.create.mockResolvedValue(createdUser as any);

    const result = await ensureUserExists('user123');

    expect(mockUser.findByPk).toHaveBeenCalledWith('user123');
    expect(mockAdmin.auth().getUser).toHaveBeenCalledWith('user123');
    expect(mockUser.create).toHaveBeenCalledWith({
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true,
      photoURL: 'https://example.com/photo.jpg',
      disabled: false,
      lastSignInTime: new Date('2023-01-01T00:00:00Z')
    });
    expect(result).toEqual(createdUser);
  });

  it('should handle Firebase user with missing optional fields', async () => {
    const firebaseUser = {
      uid: 'user123',
      email: 'test@example.com',
      displayName: null,
      emailVerified: false,
      photoURL: null,
      disabled: false,
      metadata: {
        lastSignInTime: null
      }
    };

    const createdUser = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Unknown User',
      emailVerified: false,
      photoURL: undefined,
      disabled: false,
      lastSignInTime: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockUser.findByPk.mockResolvedValue(null);
    mockAdmin.auth.mockReturnValue({
      getUser: jest.fn().mockResolvedValue(firebaseUser)
    } as any);
    mockUser.create.mockResolvedValue(createdUser as any);

    const result = await ensureUserExists('user123');

    expect(mockUser.create).toHaveBeenCalledWith({
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Unknown User',
      emailVerified: false,
      photoURL: undefined,
      disabled: false,
      lastSignInTime: undefined
    });
    expect(result).toEqual(createdUser);
  });
}); 
// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock Firebase Admin SDK
jest.mock('../config/firebase', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    createCustomToken: jest.fn(),
  })),
}));

// Mock Sequelize database
jest.mock('../db/database', () => ({
  sequelize: {
    transaction: jest.fn(),
    sync: jest.fn(),
  },
  initializeDatabase: jest.fn(),
}));

// Mock logger
jest.mock('../logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000); 
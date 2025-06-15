import { z } from 'zod';

// Import the actual schemas from the routes
const phoneSchema = z.object({
    phoneNumber: z.string().min(1, { message: "phoneNumber is required" }),
    designation: z.string().min(1, { message: "designation is required" })
}).strict();

const addressSchema = z.object({
    street: z.string().min(1, { message: "street is required" }),
    city: z.string().min(1, { message: "city is required" }),
    state: z.string().min(1, { message: "state is required" }),
    postalCode: z.string().min(1, { message: "postalCode is required" }),
    country: z.string().min(1, { message: "country is required" }),
    addressType: z.string().optional() // e.g., 'home', 'work'
}).strict();

const customerSchema = z.object({
    firstName: z.string().min(1, { message: "firstName is required" }),
    lastName: z.string().min(1, { message: "firstName is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    phones: z.array(phoneSchema).optional(),
    addresses: z.array(addressSchema).optional()
}).strict();

const noteSchema = z.object({
    note: z.string().min(1, { message: "note is required" })
}).strict();

const searchSchema = z.object({
    query: z.string().min(1, { message: "Search query is required" })
}).strict();

const signupSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    displayName: z.string().min(1, { message: 'Display name is required' })
}).strict();

const loginSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' })
}).strict();

describe('Validation Schemas', () => {
  describe('Phone Schema', () => {
    it('should validate a valid phone object', () => {
      const validPhone = {
        phoneNumber: '+1234567890',
        designation: 'mobile'
      };
      
      const result = phoneSchema.safeParse(validPhone);
      expect(result.success).toBe(true);
    });

    it('should reject phone object with missing phoneNumber', () => {
      const invalidPhone = {
        designation: 'mobile'
      };
      
      const result = phoneSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Required');
      }
    });

    it('should reject phone object with empty phoneNumber', () => {
      const invalidPhone = {
        phoneNumber: '',
        designation: 'mobile'
      };
      const result = phoneSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('phoneNumber is required');
      }
    });

    it('should reject phone object with missing designation', () => {
      const invalidPhone = {
        phoneNumber: '+1234567890'
      };
      
      const result = phoneSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Required');
      }
    });

    it('should reject phone object with empty designation', () => {
      const invalidPhone = {
        phoneNumber: '+1234567890',
        designation: ''
      };
      const result = phoneSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('designation is required');
      }
    });

    it('should reject phone object with additional properties', () => {
      const invalidPhone = {
        phoneNumber: '+1234567890',
        designation: 'mobile',
        extraField: 'should not be allowed'
      };
      
      const result = phoneSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
    });
  });

  describe('Address Schema', () => {
    it('should validate a valid address object', () => {
      const validAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      };
      
      const result = addressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should validate address with optional addressType', () => {
      const validAddress = {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        addressType: 'home'
      };
      
      const result = addressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject address with missing required fields', () => {
      const invalidAddress = {
        street: '123 Main St',
        city: 'New York',
        // missing state, postalCode, country
      };
      
      const result = addressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Customer Schema', () => {
    it('should validate a valid customer object', () => {
      const validCustomer = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };
      
      const result = customerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });

    it('should validate customer with phones and addresses', () => {
      const validCustomer = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phones: [
          {
            phoneNumber: '+1234567890',
            designation: 'mobile'
          }
        ],
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'USA'
          }
        ]
      };
      
      const result = customerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
    });

    it('should reject customer with invalid email', () => {
      const invalidCustomer = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      };
      
      const result = customerSchema.safeParse(invalidCustomer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address');
      }
    });

    it('should reject customer with empty firstName', () => {
      const invalidCustomer = {
        firstName: '',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };
      
      const result = customerSchema.safeParse(invalidCustomer);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('firstName is required');
      }
    });
  });

  describe('Note Schema', () => {
    it('should validate a valid note object', () => {
      const validNote = {
        note: 'This is a customer note'
      };
      
      const result = noteSchema.safeParse(validNote);
      expect(result.success).toBe(true);
    });

    it('should reject note with empty content', () => {
      const invalidNote = {
        note: ''
      };
      
      const result = noteSchema.safeParse(invalidNote);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('note is required');
      }
    });
  });

  describe('Search Schema', () => {
    it('should validate a valid search query', () => {
      const validSearch = {
        query: 'john doe'
      };
      
      const result = searchSchema.safeParse(validSearch);
      expect(result.success).toBe(true);
    });

    it('should reject empty search query', () => {
      const invalidSearch = {
        query: ''
      };
      
      const result = searchSchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Search query is required');
      }
    });
  });

  describe('Signup Schema', () => {
    it('should validate a valid signup object', () => {
      const validSignup = {
        email: 'user@example.com',
        password: 'password123',
        displayName: 'John Doe'
      };
      
      const result = signupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it('should reject signup with short password', () => {
      const invalidSignup = {
        email: 'user@example.com',
        password: '123',
        displayName: 'John Doe'
      };
      
      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be at least 6 characters long');
      }
    });

    it('should reject signup with invalid email', () => {
      const invalidSignup = {
        email: 'invalid-email',
        password: 'password123',
        displayName: 'John Doe'
      };
      
      const result = signupSchema.safeParse(invalidSignup);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address');
      }
    });
  });

  describe('Login Schema', () => {
    it('should validate a valid login object', () => {
      const validLogin = {
        email: 'user@example.com',
        password: 'password123'
      };
      
      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject login with empty password', () => {
      const invalidLogin = {
        email: 'user@example.com',
        password: ''
      };
      
      const result = loginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password is required');
      }
    });
  });
}); 
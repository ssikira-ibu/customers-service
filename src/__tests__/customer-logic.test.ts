// Business logic functions extracted from customer routes for testing
export function validateCustomerData(customerData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!customerData.firstName || customerData.firstName.trim() === '') {
    errors.push('firstName is required');
  }

  if (!customerData.lastName || customerData.lastName.trim() === '') {
    errors.push('lastName is required');
  }

  if (!customerData.email || customerData.email.trim() === '') {
    errors.push('email is required');
  } else if (!isValidEmail(customerData.email)) {
    errors.push('Invalid email address');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isValidEmail(email: string): boolean {
  // More strict email validation that doesn't allow consecutive dots
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check for consecutive dots
  if (email.includes('..')) return false;
  
  // Check for dots at start/end of local part or domain
  const [localPart, domain] = email.split('@');
  if (localPart.startsWith('.') || localPart.endsWith('.') || 
      domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  
  return true;
}

export function prepareCustomerForCreation(customerData: any, userId: string) {
  const { phones, addresses, ...customerFields } = customerData;
  
  const customer = {
    ...customerFields,
    userId
  };

  const phoneRecords = phones ? phones.map((phone: any) => ({ ...phone })) : [];
  const addressRecords = addresses ? addresses.map((address: any) => ({ ...address })) : [];

  return {
    customer,
    phoneRecords,
    addressRecords
  };
}

export function checkEmailUniqueness(email: string, existingCustomers: any[]): boolean {
  return !existingCustomers.some(customer => customer.email.toLowerCase() === email.toLowerCase());
}

export function processSearchQuery(query: string): string {
  const searchText = query.trim().toLowerCase();
  return searchText.split(/\s+/).join(' & ');
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeCustomerData(customerData: any): any {
  return {
    firstName: customerData.firstName?.trim(),
    lastName: customerData.lastName?.trim(),
    email: customerData.email?.trim().toLowerCase(),
    phones: customerData.phones?.map((phone: any) => ({
      phoneNumber: phone.phoneNumber?.trim(),
      designation: phone.designation?.trim()
    })),
    addresses: customerData.addresses?.map((address: any) => ({
      street: address.street?.trim(),
      city: address.city?.trim(),
      state: address.state?.trim(),
      postalCode: address.postalCode?.trim(),
      country: address.country?.trim(),
      addressType: address.addressType?.trim()
    }))
  };
}

describe('Customer Business Logic', () => {
  describe('validateCustomerData', () => {
    it('should validate correct customer data', () => {
      const validCustomer = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = validateCustomerData(validCustomer);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject customer with missing firstName', () => {
      const invalidCustomer = {
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = validateCustomerData(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('should reject customer with empty firstName', () => {
      const invalidCustomer = {
        firstName: '',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = validateCustomerData(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('should reject customer with whitespace-only firstName', () => {
      const invalidCustomer = {
        firstName: '   ',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = validateCustomerData(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('should reject customer with invalid email', () => {
      const invalidCustomer = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      };

      const result = validateCustomerData(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('should return multiple errors for multiple issues', () => {
      const invalidCustomer = {
        firstName: '',
        lastName: '',
        email: 'invalid-email'
      };

      const result = validateCustomerData(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('firstName is required');
      expect(result.errors).toContain('lastName is required');
      expect(result.errors).toContain('Invalid email address');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.co.uk',
        'user@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example..com',
        '',
        'user name@example.com',
        '.user@example.com',
        'user.@example.com',
        'user@.example.com',
        'user@example.'
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('prepareCustomerForCreation', () => {
    it('should prepare customer data without phones and addresses', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };
      const userId = 'user123';

      const result = prepareCustomerForCreation(customerData, userId);

      expect(result.customer).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userId: 'user123'
      });
      expect(result.phoneRecords).toEqual([]);
      expect(result.addressRecords).toEqual([]);
    });

    it('should prepare customer data with phones and addresses', () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phones: [
          { phoneNumber: '+1234567890', designation: 'mobile' }
        ],
        addresses: [
          { street: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'USA' }
        ]
      };
      const userId = 'user123';

      const result = prepareCustomerForCreation(customerData, userId);

      expect(result.customer).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userId: 'user123'
      });
      expect(result.phoneRecords).toEqual([
        { phoneNumber: '+1234567890', designation: 'mobile' }
      ]);
      expect(result.addressRecords).toEqual([
        { street: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'USA' }
      ]);
    });
  });

  describe('checkEmailUniqueness', () => {
    it('should return true for unique email', () => {
      const existingCustomers = [
        { email: 'jane.doe@example.com' },
        { email: 'bob.smith@example.com' }
      ];
      const newEmail = 'john.doe@example.com';

      const result = checkEmailUniqueness(newEmail, existingCustomers);
      expect(result).toBe(true);
    });

    it('should return false for duplicate email (case insensitive)', () => {
      const existingCustomers = [
        { email: 'john.doe@example.com' },
        { email: 'jane.doe@example.com' }
      ];
      const newEmail = 'JOHN.DOE@EXAMPLE.COM';

      const result = checkEmailUniqueness(newEmail, existingCustomers);
      expect(result).toBe(false);
    });

    it('should return true for empty customer list', () => {
      const existingCustomers: any[] = [];
      const newEmail = 'john.doe@example.com';

      const result = checkEmailUniqueness(newEmail, existingCustomers);
      expect(result).toBe(true);
    });
  });

  describe('processSearchQuery', () => {
    it('should process single word query', () => {
      const query = 'john';
      const result = processSearchQuery(query);
      expect(result).toBe('john');
    });

    it('should process multi-word query', () => {
      const query = 'john doe';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe');
    });

    it('should handle multiple spaces', () => {
      const query = 'john   doe   smith';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe & smith');
    });

    it('should trim whitespace', () => {
      const query = '  john doe  ';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe');
    });

    it('should convert to lowercase', () => {
      const query = 'JOHN DOE';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe');
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(validateUUID(validUUID)).toBe(true);
    });

    it('should validate UUID with uppercase letters', () => {
      const validUUID = '123E4567-E89B-12D3-A456-426614174000';
      expect(validateUUID(validUUID)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        '123e4567e89b12d3a456426614174000', // missing hyphens
        '', // empty string
        'not-a-uuid'
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('sanitizeCustomerData', () => {
    it('should sanitize customer data with phones and addresses', () => {
      const customerData = {
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  JOHN.DOE@EXAMPLE.COM  ',
        phones: [
          { phoneNumber: '  +1234567890  ', designation: '  mobile  ' }
        ],
        addresses: [
          { 
            street: '  123 Main St  ', 
            city: '  New York  ', 
            state: '  NY  ', 
            postalCode: '  10001  ', 
            country: '  USA  ',
            addressType: '  home  '
          }
        ]
      };

      const result = sanitizeCustomerData(customerData);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phones: [
          { phoneNumber: '+1234567890', designation: 'mobile' }
        ],
        addresses: [
          { 
            street: '123 Main St', 
            city: 'New York', 
            state: 'NY', 
            postalCode: '10001', 
            country: 'USA',
            addressType: 'home'
          }
        ]
      });
    });

    it('should handle customer data without phones and addresses', () => {
      const customerData = {
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  JOHN.DOE@EXAMPLE.COM  '
      };

      const result = sanitizeCustomerData(customerData);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phones: undefined,
        addresses: undefined
      });
    });

    it('should handle null/undefined values gracefully', () => {
      const customerData = {
        firstName: null,
        lastName: undefined,
        email: '  test@example.com  ',
        phones: null,
        addresses: undefined
      };

      const result = sanitizeCustomerData(customerData);

      expect(result).toEqual({
        firstName: undefined,
        lastName: undefined,
        email: 'test@example.com',
        phones: undefined,
        addresses: undefined
      });
    });
  });
}); 
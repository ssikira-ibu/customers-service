// Utility functions for testing
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function processSearchQuery(query: string): string {
  const searchText = query.trim().toLowerCase();
  return searchText.split(/\s+/).join(' & ');
}

export function extractDisplayNameFromEmail(email: string): string {
  return email.split('@')[0];
}

export function validateEmailFormat(email: string): boolean {
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

export function sanitizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

describe('Utility Functions', () => {
  describe('UUID Validation', () => {
    it('should validate a correct UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    it('should validate UUID with uppercase letters', () => {
      const validUUID = '123E4567-E89B-12D3-A456-426614174000';
      expect(isValidUUID(validUUID)).toBe(true);
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
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it('should reject null and undefined', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
    });
  });

  describe('Search Query Processing', () => {
    it('should process single word query', () => {
      const query = 'john';
      const result = processSearchQuery(query);
      expect(result).toBe('john');
    });

    it('should process multi-word query with proper formatting', () => {
      const query = 'john doe';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe');
    });

    it('should handle multiple spaces between words', () => {
      const query = 'john   doe   smith';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe & smith');
    });

    it('should trim whitespace from query', () => {
      const query = '  john doe  ';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe');
    });

    it('should convert to lowercase', () => {
      const query = 'JOHN DOE';
      const result = processSearchQuery(query);
      expect(result).toBe('john & doe');
    });

    it('should handle empty string', () => {
      const query = '';
      const result = processSearchQuery(query);
      expect(result).toBe('');
    });

    it('should handle string with only spaces', () => {
      const query = '   ';
      const result = processSearchQuery(query);
      expect(result).toBe('');
    });
  });

  describe('Email Display Name Extraction', () => {
    it('should extract username from valid email', () => {
      const email = 'john.doe@example.com';
      const result = extractDisplayNameFromEmail(email);
      expect(result).toBe('john.doe');
    });

    it('should handle email with numbers', () => {
      const email = 'user123@example.com';
      const result = extractDisplayNameFromEmail(email);
      expect(result).toBe('user123');
    });

    it('should handle email with special characters', () => {
      const email = 'user-name+tag@example.com';
      const result = extractDisplayNameFromEmail(email);
      expect(result).toBe('user-name+tag');
    });

    it('should handle email without @ symbol', () => {
      const email = 'invalid-email';
      const result = extractDisplayNameFromEmail(email);
      expect(result).toBe('invalid-email');
    });

    it('should handle empty string', () => {
      const email = '';
      const result = extractDisplayNameFromEmail(email);
      expect(result).toBe('');
    });
  });

  describe('Email Format Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.co.uk',
        'user@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmailFormat(email)).toBe(true);
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
        'user@example com',
        '.user@example.com',
        'user.@example.com',
        'user@.example.com',
        'user@example.'
      ];

      invalidEmails.forEach(email => {
        expect(validateEmailFormat(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateEmailFormat(null as any)).toBe(false);
      expect(validateEmailFormat(undefined as any)).toBe(false);
      expect(validateEmailFormat('   ')).toBe(false);
    });
  });

  describe('Search Text Sanitization', () => {
    it('should remove special characters', () => {
      const text = 'john.doe@example.com!';
      const result = sanitizeSearchText(text);
      expect(result).toBe('johndoeexamplecom');
    });

    it('should convert to lowercase', () => {
      const text = 'JOHN DOE';
      const result = sanitizeSearchText(text);
      expect(result).toBe('john doe');
    });

    it('should trim whitespace', () => {
      const text = '  john doe  ';
      const result = sanitizeSearchText(text);
      expect(result).toBe('john doe');
    });

    it('should preserve alphanumeric characters and spaces', () => {
      const text = 'John Doe 123';
      const result = sanitizeSearchText(text);
      expect(result).toBe('john doe 123');
    });

    it('should handle empty string', () => {
      const text = '';
      const result = sanitizeSearchText(text);
      expect(result).toBe('');
    });

    it('should handle string with only special characters', () => {
      const text = '!@#$%^&*()';
      const result = sanitizeSearchText(text);
      expect(result).toBe('');
    });
  });
}); 
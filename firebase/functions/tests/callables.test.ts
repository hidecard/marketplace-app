import { expect } from 'chai';

function requireAuth(req: any): string {
  if (!req.auth) {
    throw new Error('Sign in required');
  }
  return req.auth.uid;
}

function requireString(value: any, field: string, max = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  if (value.length > max) {
    throw new Error(`${field} too long`);
  }
  return value.trim();
}

function optionalString(value: any, field: string, max = 500): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }
  if (value.length > max) {
    throw new Error(`${field} too long`);
  }
  return value;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function requireMoneyInt(value: any, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

function requirePositiveInt(value: any, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped'
  | 'out_for_delivery' | 'delivered' | 'completed'
  | 'cancelled' | 'rejected';

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered', 'shipped'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Validation Helpers', () => {
  describe('requireAuth', () => {
    it('should throw if no auth', () => {
      try {
        requireAuth({ data: {} } as any);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('Sign in required');
      }
    });

    it('should return uid if auth exists', () => {
      const uid = requireAuth({ auth: { uid: 'user-1' }, data: {} } as any);
      expect(uid).to.equal('user-1');
    });
  });

  describe('requireString', () => {
    it('should throw for missing string', () => {
      try {
        requireString(null as any, 'field');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('field is required');
      }
    });

    it('should throw for empty string', () => {
      try {
        requireString('  ', 'field');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('field is required');
      }
    });

    it('should throw for too long string', () => {
      try {
        requireString('a'.repeat(501), 'field', 500);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('field too long');
      }
    });

    it('should trim and return valid string', () => {
      const result = requireString('  hello  ', 'field');
      expect(result).to.equal('hello');
    });
  });

  describe('optionalString', () => {
    it('should return undefined for null', () => {
      expect(optionalString(null, 'field')).to.be.undefined;
    });

    it('should return undefined for empty string', () => {
      expect(optionalString('', 'field')).to.be.undefined;
    });

    it('should throw for non-string', () => {
      try {
        optionalString(123, 'field');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('field must be a string');
      }
    });
  });

  describe('requireMoneyInt', () => {
    it('should throw for negative number', () => {
      try {
        requireMoneyInt(-1, 'price');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('price must be a non-negative integer');
      }
    });

    it('should throw for float', () => {
      try {
        requireMoneyInt(10.5, 'price');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('price must be a non-negative integer');
      }
    });

    it('should accept zero and positive integers', () => {
      expect(requireMoneyInt(0, 'price')).to.equal(0);
      expect(requireMoneyInt(1000, 'price')).to.equal(1000);
    });
  });

  describe('requirePositiveInt', () => {
    it('should throw for zero', () => {
      try {
        requirePositiveInt(0, 'qty');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).to.equal('qty must be a positive integer');
      }
    });

    it('should accept positive integers', () => {
      expect(requirePositiveInt(1, 'qty')).to.equal(1);
      expect(requirePositiveInt(100, 'qty')).to.equal(100);
    });
  });

  describe('slugify', () => {
    it('should slugify strings', () => {
      expect(slugify('Hello World')).to.equal('hello-world');
      expect(slugify('My Shop!')).to.equal('my-shop');
      expect(slugify('  spaces  ')).to.equal('spaces');
    });

    it('should handle empty result', () => {
      expect(slugify('!!!')).to.equal('');
    });
  });
});

describe('Order State Machine', () => {
  describe('canTransition', () => {
    it('should allow valid transitions', () => {
      expect(canTransition('pending', 'confirmed')).to.be.true;
      expect(canTransition('pending', 'cancelled')).to.be.true;
      expect(canTransition('confirmed', 'preparing')).to.be.true;
      expect(canTransition('preparing', 'shipped')).to.be.true;
      expect(canTransition('shipped', 'out_for_delivery')).to.be.true;
      expect(canTransition('out_for_delivery', 'delivered')).to.be.true;
      expect(canTransition('delivered', 'completed')).to.be.true;
    });

    it('should reject invalid transitions', () => {
      expect(canTransition('pending', 'shipped')).to.be.false;
      expect(canTransition('completed', 'pending')).to.be.false;
      expect(canTransition('cancelled', 'confirmed')).to.be.false;
    });

    it('should reject same status', () => {
      expect(canTransition('pending', 'pending')).to.be.false;
    });
  });
});
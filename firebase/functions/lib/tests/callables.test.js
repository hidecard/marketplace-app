"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
function requireAuth(req) {
    if (!req.auth) {
        throw new Error('Sign in required');
    }
    return req.auth.uid;
}
function requireString(value, field, max = 500) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${field} is required`);
    }
    if (value.length > max) {
        throw new Error(`${field} too long`);
    }
    return value.trim();
}
function optionalString(value, field, max = 500) {
    if (value == null || value === '')
        return undefined;
    if (typeof value !== 'string') {
        throw new Error(`${field} must be a string`);
    }
    if (value.length > max) {
        throw new Error(`${field} too long`);
    }
    return value;
}
function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}
function requireMoneyInt(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        throw new Error(`${field} must be a non-negative integer`);
    }
    return value;
}
function requirePositiveInt(value, field) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new Error(`${field} must be a positive integer`);
    }
    return value;
}
const ORDER_TRANSITIONS = {
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
function canTransition(from, to) {
    var _a, _b;
    return (_b = (_a = ORDER_TRANSITIONS[from]) === null || _a === void 0 ? void 0 : _a.includes(to)) !== null && _b !== void 0 ? _b : false;
}
describe('Validation Helpers', () => {
    describe('requireAuth', () => {
        it('should throw if no auth', () => {
            try {
                requireAuth({ data: {} });
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('Sign in required');
            }
        });
        it('should return uid if auth exists', () => {
            const uid = requireAuth({ auth: { uid: 'user-1' }, data: {} });
            (0, chai_1.expect)(uid).to.equal('user-1');
        });
    });
    describe('requireString', () => {
        it('should throw for missing string', () => {
            try {
                requireString(null, 'field');
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('field is required');
            }
        });
        it('should throw for empty string', () => {
            try {
                requireString('  ', 'field');
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('field is required');
            }
        });
        it('should throw for too long string', () => {
            try {
                requireString('a'.repeat(501), 'field', 500);
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('field too long');
            }
        });
        it('should trim and return valid string', () => {
            const result = requireString('  hello  ', 'field');
            (0, chai_1.expect)(result).to.equal('hello');
        });
    });
    describe('optionalString', () => {
        it('should return undefined for null', () => {
            (0, chai_1.expect)(optionalString(null, 'field')).to.be.undefined;
        });
        it('should return undefined for empty string', () => {
            (0, chai_1.expect)(optionalString('', 'field')).to.be.undefined;
        });
        it('should throw for non-string', () => {
            try {
                optionalString(123, 'field');
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('field must be a string');
            }
        });
    });
    describe('requireMoneyInt', () => {
        it('should throw for negative number', () => {
            try {
                requireMoneyInt(-1, 'price');
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('price must be a non-negative integer');
            }
        });
        it('should throw for float', () => {
            try {
                requireMoneyInt(10.5, 'price');
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('price must be a non-negative integer');
            }
        });
        it('should accept zero and positive integers', () => {
            (0, chai_1.expect)(requireMoneyInt(0, 'price')).to.equal(0);
            (0, chai_1.expect)(requireMoneyInt(1000, 'price')).to.equal(1000);
        });
    });
    describe('requirePositiveInt', () => {
        it('should throw for zero', () => {
            try {
                requirePositiveInt(0, 'qty');
                chai_1.expect.fail('Should have thrown');
            }
            catch (e) {
                (0, chai_1.expect)(e.message).to.equal('qty must be a positive integer');
            }
        });
        it('should accept positive integers', () => {
            (0, chai_1.expect)(requirePositiveInt(1, 'qty')).to.equal(1);
            (0, chai_1.expect)(requirePositiveInt(100, 'qty')).to.equal(100);
        });
    });
    describe('slugify', () => {
        it('should slugify strings', () => {
            (0, chai_1.expect)(slugify('Hello World')).to.equal('hello-world');
            (0, chai_1.expect)(slugify('My Shop!')).to.equal('my-shop');
            (0, chai_1.expect)(slugify('  spaces  ')).to.equal('spaces');
        });
        it('should handle empty result', () => {
            (0, chai_1.expect)(slugify('!!!')).to.equal('');
        });
    });
});
describe('Order State Machine', () => {
    describe('canTransition', () => {
        it('should allow valid transitions', () => {
            (0, chai_1.expect)(canTransition('pending', 'confirmed')).to.be.true;
            (0, chai_1.expect)(canTransition('pending', 'cancelled')).to.be.true;
            (0, chai_1.expect)(canTransition('confirmed', 'preparing')).to.be.true;
            (0, chai_1.expect)(canTransition('preparing', 'shipped')).to.be.true;
            (0, chai_1.expect)(canTransition('shipped', 'out_for_delivery')).to.be.true;
            (0, chai_1.expect)(canTransition('out_for_delivery', 'delivered')).to.be.true;
            (0, chai_1.expect)(canTransition('delivered', 'completed')).to.be.true;
        });
        it('should reject invalid transitions', () => {
            (0, chai_1.expect)(canTransition('pending', 'shipped')).to.be.false;
            (0, chai_1.expect)(canTransition('completed', 'pending')).to.be.false;
            (0, chai_1.expect)(canTransition('cancelled', 'confirmed')).to.be.false;
        });
        it('should reject same status', () => {
            (0, chai_1.expect)(canTransition('pending', 'pending')).to.be.false;
        });
    });
});
//# sourceMappingURL=callables.test.js.map
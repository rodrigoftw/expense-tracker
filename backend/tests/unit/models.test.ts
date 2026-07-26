import { describe, it, expect } from '@jest/globals';
import bcrypt from 'bcryptjs';
import User from '../../models/User';
import Expense from '../../models/Expense';

// These tests exercise the model's prototype methods directly (comparePassword,
// toJSON) without persisting to a real database — Sequelize.define() does not
// open a connection, so this is safe to require in isolation.

describe('User model', () => {
  it('comparePassword resolves true for a matching password', async () => {
    const hashed = await bcrypt.hash('secret123', 10);
    const fakeInstance: any = { password: hashed };

    const result = await User.prototype.comparePassword.call(fakeInstance, 'secret123');
    expect(result).toBe(true);
  });

  it('comparePassword resolves false for a non-matching password', async () => {
    const hashed = await bcrypt.hash('secret123', 10);
    const fakeInstance: any = { password: hashed };

    const result = await User.prototype.comparePassword.call(fakeInstance, 'wrongpassword');
    expect(result).toBe(false);
  });

  it('toJSON strips the password field', () => {
    const fakeInstance: any = {
      get() {
        return { id: 'user-1', name: 'John Doe', email: 'johndoe@example.com', password: 'hashed' };
      },
    };

    const json = User.prototype.toJSON.call(fakeInstance);
    expect(json).not.toHaveProperty('password');
    expect(json).toMatchObject({ id: 'user-1', name: 'John Doe' });
  });
});

describe('Expense model', () => {
  it('exposes the expected list of categories', () => {
    expect(Expense.CATEGORIES).toEqual(
      expect.arrayContaining(['Food', 'Transportation', 'Housing', 'Other'])
    );
  });

  it('rejects an amount at or below zero via validation config', () => {
    const amountAttr = Expense.rawAttributes.amount;
    expect(amountAttr.validate.min).toBe(0.01);
  });

  it('defaults category to "Other"', () => {
    expect(Expense.rawAttributes.category.defaultValue).toBe('Other');
  });
});

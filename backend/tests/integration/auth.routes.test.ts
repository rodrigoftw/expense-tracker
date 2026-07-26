import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';

import createApp from '../../../app';
import { User } from '../../models';

// Mock the models layer so controllers/middleware never touch a real database.
jest.mock('../../models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Expense: {},
}));

const app = createApp({} as any, 'test');

describe('Auth routes', () => {
  describe('POST /api/auth/register', () => {
    it('creates a new user and returns a token', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 'user-1',
        name: 'John Doe',
        email: 'johndoe@example.com',
        toJSON() {
          return { id: this.id, name: this.name, email: this.email };
        },
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'secret123',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ email: 'johndoe@example.com' });
      expect(User.create).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'secret123',
      });
    });

    it('rejects registration when the email is already in use', async () => {
      User.findOne.mockResolvedValue({ id: 'existing-user' });

      const res = await request(app).post('/api/auth/register').send({
        name: 'John Doe',
        email: 'johndoe@example.com',
        password: 'secret123',
      });

      expect(res.status).toBe(409);
      expect(User.create).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid input (bad email, short password)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'not-an-email',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      User.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'johndoe@example.com',
        comparePassword: jest.fn(async () => true),
        toJSON() {
          return { id: this.id, email: this.email };
        },
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'johndoe@example.com',
        password: 'secret123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('rejects an unknown email', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'whatever1',
      });

      expect(res.status).toBe(401);
    });

    it('rejects an incorrect password', async () => {
      User.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'johndoe@example.com',
        comparePassword: jest.fn(async () => false),
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'johndoe@example.com',
        password: 'wrongpass',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

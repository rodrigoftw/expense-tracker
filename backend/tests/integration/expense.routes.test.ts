import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

import createApp from '../../../app';
import { User, Expense } from '../../models';


jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn(),
  },
  Expense: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

const app = createApp({} as any, 'test');

const FAKE_USER = { id: 'user-1', name: 'John Doe', email: 'johndoe@example.com' };

const JWT_SECRET = process.env.JWT_SECRET ||'test-secret';

const authToken = () => jwt.sign({ id: FAKE_USER.id }, JWT_SECRET);

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

const authedRequest = (method: HttpMethod, url: string) => {
  return request(app)[method](url).set('Authorization', `Bearer ${authToken()}`);
};

describe('Expense routes', () => {
  beforeEach(() => {
    User.findByPk.mockResolvedValue(FAKE_USER);
  });

  it('rejects requests without a valid token', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });

  describe('POST /api/expenses', () => {
    it('creates an expense for the authenticated user', async () => {
      const created = {
        id: 'exp-1',
        userId: FAKE_USER.id,
        title: 'Groceries',
        amount: '87.50',
        category: 'Food',
        date: '2026-07-01',
      };
      Expense.create.mockResolvedValue(created);

      const res = await authedRequest('post', '/api/expenses').send({
        title: 'Groceries',
        amount: 87.5,
        category: 'Food',
        date: '2026-07-01',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'exp-1', title: 'Groceries' });
      expect(Expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: FAKE_USER.id, title: 'Groceries', amount: 87.5 })
      );
    });

    it('returns 400 when required fields are missing/invalid', async () => {
      const res = await authedRequest('post', '/api/expenses').send({
        title: '',
        amount: -5,
      });

      expect(res.status).toBe(400);
      expect(Expense.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/expenses', () => {
    it('lists expenses with pagination and total amount', async () => {
      Expense.findAndCountAll.mockResolvedValue({
        rows: [{ id: 'exp-1', title: 'Groceries', amount: '87.50' }],
        count: 1,
      });
      Expense.findOne.mockResolvedValue({ total: '87.50' });

      const res = await authedRequest('get', '/api/expenses?category=Food&page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, totalItems: 1 });
      expect(res.body.totalAmount).toBe(87.5);

      // Confirm the category filter was translated into the Sequelize where clause
      const whereArg = Expense.findAndCountAll.mock.calls[0][0].where;
      expect(whereArg).toMatchObject({ userId: FAKE_USER.id, category: 'Food' });
    });

    it('applies amount and date range filters to the query', async () => {
      Expense.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      Expense.findOne.mockResolvedValue({ total: '0' });

      await authedRequest(
        'get',
        '/api/expenses?minAmount=10&maxAmount=200&startDate=2026-06-01&endDate=2026-06-30'
      );

      const whereArg = Expense.findAndCountAll.mock.calls[0][0].where;
      expect(whereArg.amount[Op.gte]).toBe(10);
      expect(whereArg.amount[Op.lte]).toBe(200);
      expect(whereArg.date[Op.gte]).toBe('2026-06-01');
      expect(whereArg.date[Op.lte]).toBe('2026-06-30');
    });
  });

  describe('GET /api/expenses/:id', () => {
    it('returns a single expense', async () => {
      Expense.findOne.mockResolvedValue({ id: 'exp-1', title: 'Groceries' });

      const res = await authedRequest('get', '/api/expenses/exp-1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 'exp-1' });
    });

    it('returns 404 when the expense does not exist', async () => {
      Expense.findOne.mockResolvedValue(null);

      const res = await authedRequest('get', '/api/expenses/does-not-exist');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/expenses/:id', () => {
    it('updates an existing expense', async () => {
      const update = jest.fn(async () => undefined);
      Expense.findOne.mockResolvedValue({
        id: 'exp-1',
        title: 'Old title',
        amount: '10.00',
        category: 'Other',
        notes: null,
        date: '2026-07-01',
        update,
      });

      const res = await authedRequest('put', '/api/expenses/exp-1').send({ title: 'New title', amount: 20 });

      expect(res.status).toBe(200);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New title', amount: 20 })
      );
    });

    it('returns 404 when updating a non-existent expense', async () => {
      Expense.findOne.mockResolvedValue(null);

      const res = await authedRequest('put', '/api/expenses/missing').send({ title: 'x', amount: 5 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    it('deletes an existing expense', async () => {
      const destroy = jest.fn(async () => undefined);
      Expense.findOne.mockResolvedValue({ id: 'exp-1', destroy });

      const res = await authedRequest('delete', '/api/expenses/exp-1');

      expect(res.status).toBe(200);
      expect(destroy).toHaveBeenCalled();
    });

    it('returns 404 when deleting a non-existent expense', async () => {
      Expense.findOne.mockResolvedValue(null);

      const res = await authedRequest('delete', '/api/expenses/missing');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/expenses/summary/monthly', () => {
    it('returns monthly totals and category breakdown', async () => {
      Expense.findAll
        .mockResolvedValueOnce([{ month: '2026-06', total: '320.10', count: '4' }])
        .mockResolvedValueOnce([{ month: '2026-06', category: 'Food', total: '320.10' }]);

      const res = await authedRequest('get', '/api/expenses/summary/monthly?year=2026');

      expect(res.status).toBe(200);
      expect(res.body.monthlyTotals).toEqual([{ month: '2026-06', total: 320.1, count: 4 }]);
      expect(res.body.categoryBreakdown).toEqual([
        { month: '2026-06', category: 'Food', total: 320.1 },
      ]);
    });
  });

  describe('GET /api/expenses/export/csv', () => {
    it('returns a CSV file', async () => {
      Expense.findAll.mockResolvedValue([
        {
          toJSON: () => ({
            date: '2026-07-01',
            title: 'Groceries',
            category: 'Food',
            amount: '87.50',
            notes: '',
          }),
        },
      ]);

      const res = await authedRequest('get', '/api/expenses/export/csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Groceries');
    });
  });
});

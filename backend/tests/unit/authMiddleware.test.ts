import { describe, it, expect, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

import { protect } from '../../middleware/auth';
import { User } from '../../models';

jest.mock('../../models', () => ({
  User: { findByPk: jest.fn() },
  Expense: {},
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret'; // Ensure a default for testing

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('auth middleware (protect)', () => {
  it('calls next() and attaches req.user for a valid token', async () => {
    const token = jwt.sign({ id: 'user-1' }, JWT_SECRET);
    User.findByPk.mockResolvedValue({ id: 'user-1', name: 'John Doe' });

    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 'user-1' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when no Authorization header is present', async () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed/invalid token', async () => {
    const req: any = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', async () => {
    const expiredToken = jwt.sign({ id: 'user-1' }, JWT_SECRET, { expiresIn: -10 });
    const req: any = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining(
        { message: expect.stringMatching(/expired/i) }
      )
    );
  });

  it('returns 401 when the token is valid but the user no longer exists', async () => {
    const token = jwt.sign({ id: 'ghost-user' }, JWT_SECRET);
    User.findByPk.mockResolvedValue(null);

    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

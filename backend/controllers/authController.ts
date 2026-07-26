import jwt, { SignOptions } from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { User } from '../models';

const generateToken = (userId: number | string) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  const expiresIn: NonNullable<SignOptions['expiresIn']> =
    (process.env.JWT_EXPIRES_IN || '7d') as NonNullable<SignOptions['expiresIn']>;
  const options: SignOptions = { expiresIn };

  return jwt.sign({ id: userId }, secret, options);
};

// @route  POST /api/auth/register
const register = async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user.id!);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/login
const login = async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user.id!);
    res.json({ user, token });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/auth/me
const getMe = async (req: any, res: any) => {
  res.json({ user: req.user });
};

export { register, login, getMe };

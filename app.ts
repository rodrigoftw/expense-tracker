import express, { Express } from 'express';
import cors from 'cors';
import { Sequelize } from 'sequelize';

import authRoutes from './backend/routes/authRoutes';
import expenseRoutes from './backend/routes/expenseRoutes';
import { errorHandler, notFound } from './backend/middleware/errorHandler';
const createApp = (sequelize: Sequelize, env: string): Express => {
    const app: Express = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    app.use('/api/auth', authRoutes);
    app.use('/api/expenses', expenseRoutes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
};

export default createApp;

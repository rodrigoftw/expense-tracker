import 'dotenv/config';
import createApp from '../app';
import { connectDB, sequelize } from './config/db';
import './models'; // registers associations

const PORT = process.env.PORT || 5000;
const app = createApp(sequelize, process.env.NODE_ENV || 'development');

const start = async () => {
  await connectDB();

  // In development, sync models automatically. In production, prefer
  // running `npm run migrate` explicitly instead of auto-sync.
  if (process.env.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true });
    console.log('Database synced (development mode).');
  }

  app.listen(PORT, () => {
    console.log(`Expense Tracker API running on port ${PORT}`);
  });
};

start();

export default app;

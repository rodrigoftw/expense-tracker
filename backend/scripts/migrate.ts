// Run with: npm run migrate
// Creates/updates tables based on the current models. Safe to run repeatedly.
import 'dotenv/config';
import { sequelize } from '../config/db';
import '../models';

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Migration complete: tables are up to date.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();

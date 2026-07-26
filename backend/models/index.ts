import { sequelize } from '../config/db';
import User from './User';
import Expense from './Expense';

// Associations
User.hasMany(Expense, { foreignKey: 'userId', onDelete: 'CASCADE' });
Expense.belongsTo(User, { foreignKey: 'userId' });

export { sequelize, User, Expense };

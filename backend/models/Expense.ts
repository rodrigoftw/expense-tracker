import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db';
import { CATEGORIES } from '../constants/categories';

const Expense = sequelize.define(
  'Expense',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    category: {
      type: DataTypes.ENUM(...CATEGORIES),
      allowNull: false,
      defaultValue: 'Other',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'expenses',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['category'] },
      { fields: ['date'] },
    ],
  }
) as any;

Expense.CATEGORIES = CATEGORIES;

export { CATEGORIES };
export default Expense;

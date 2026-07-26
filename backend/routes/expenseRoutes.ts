import express from 'express';
import { body } from 'express-validator';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
  exportCSV,
  exportPDF,
} from '../controllers/expenseController';
import { protect } from '../middleware/auth';
import { CATEGORIES } from '../models/Expense';

const router = express.Router();

// Every expense route requires a valid JWT
router.use(protect);

const expenseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage('Invalid category'),
  body('date').optional().isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)'),
];

// Order matters: specific routes before /:id
router.get('/summary/monthly', getMonthlySummary);
router.get('/export/csv', exportCSV);
router.get('/export/pdf', exportPDF);

router.route('/').post(expenseValidation, createExpense).get(getExpenses);

router
  .route('/:id')
  .get(getExpenseById)
  .put(expenseValidation, updateExpense)
  .delete(deleteExpense);

export default router;

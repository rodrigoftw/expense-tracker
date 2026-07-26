import { Op, fn, col, literal } from 'sequelize';
import moment from 'moment';
import { validationResult } from 'express-validator';
import { Expense } from '../models';
import { buildExpensesCSV, streamExpensesPDF } from '../utils/exportUtils';

interface TotalAmountRow {
  total: number;
}

// Shared helper: build a Sequelize `where` clause from query params
const buildFilterWhere = (userId: string, query: any) => {
  const where: any = { userId };

  if (query.category) {
    where.category = query.category;
  }

  if (query.minAmount || query.maxAmount) {
    where.amount = {};
    if (query.minAmount) where.amount[Op.gte] = Number(query.minAmount);
    if (query.maxAmount) where.amount[Op.lte] = Number(query.maxAmount);
  }

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date[Op.gte] = moment(query.startDate).format('YYYY-MM-DD');
    if (query.endDate) where.date[Op.lte] = moment(query.endDate).format('YYYY-MM-DD');
  }

  if (query.search) {
    where.title = { [Op.iLike]: `%${query.search}%` };
  }

  return where;
};

// @route  POST /api/expenses
const createExpense = async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, amount, category, notes, date } = req.body;

    const expense = await Expense.create({
      userId: req.user.id,
      title,
      amount,
      category,
      notes,
      date: date || moment().format('YYYY-MM-DD'),
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/expenses  (supports filtering + pagination)
const getExpenses = async (req: any, res: any, next: any) => {
  try {
    const where = buildFilterWhere(req.user.id, req.query);

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const sortField = ['date', 'amount', 'title', 'category', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const { rows, count } = await Expense.findAndCountAll({
      where,
      order: [[sortField, sortOrder]],
      limit,
      offset,
    });

    const totalAmountResult = await Expense.findOne({
      where,
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      raw: true,
    }) as TotalAmountRow | null;

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
      totalAmount: Number(totalAmountResult?.total || 0),
    });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/expenses/:id
const getExpenseById = async (req: any, res: any, next: any) => {
  try {
    const expense = await Expense.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    next(error);
  }
};

// @route  PUT /api/expenses/:id
const updateExpense = async (req: any, res: any, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const { title, amount, category, notes, date } = req.body;

    await expense.update({
      title: title ?? (expense as any).title,
      amount: amount ?? (expense as any).amount,
      category: category ?? (expense as any).category,
      notes: notes ?? (expense as any).notes,
      date: date ?? (expense as any).date,
    });

    res.json(expense);
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/expenses/:id
const deleteExpense = async (req: any, res: any, next: any) => {
  try {
    const expense = await Expense.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expense.destroy();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/expenses/summary/monthly
// Returns totals grouped by month (and optionally by category within each month)
const getMonthlySummary = async (req: any, res: any, next: any) => {
  try {
    const { year, category } = req.query;

    const where: any = { userId: req.user.id };
    if (category) where.category = category;
    if (year) {
      where.date = {
        [Op.gte]: `${year}-01-01`,
        [Op.lte]: `${year}-12-31`,
      };
    }

    const monthlyTotals = await Expense.findAll({
      where,
      attributes: [
        [fn('to_char', col('date'), 'YYYY-MM'), 'month'],
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: [literal('1') as any],
      order: [[literal('1') as any, 'ASC']],
      raw: true,
    });

    const categoryBreakdown = await Expense.findAll({
      where,
      attributes: [
        [fn('to_char', col('date'), 'YYYY-MM'), 'month'],
        'category',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: [literal('1') as any, 'category'],
      order: [[literal('1') as any, 'ASC']],
      raw: true,
    });

    res.json({
      monthlyTotals: monthlyTotals.map((m: any) => ({
        month: m.month,
        total: Number(m.total),
        count: Number(m.count),
      })),
      categoryBreakdown: categoryBreakdown.map((c: any) => ({
        month: c.month,
        category: c.category,
        total: Number(c.total),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/expenses/export/csv
const exportCSV = async (req: any, res: any, next: any) => {
  try {
    const where = buildFilterWhere(req.user.id, req.query);
    const expenses = await Expense.findAll({ where, order: [['date', 'DESC']] });

    const csv = buildExpensesCSV(expenses);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/expenses/export/pdf
const exportPDF = async (req: any, res: any, next: any) => {
  try {
    const where = buildFilterWhere(req.user.id, req.query);
    const expenses = await Expense.findAll({ where, order: [['date', 'DESC']] });

    const rangeLabel =
      req.query.startDate || req.query.endDate
        ? `Range: ${req.query.startDate || 'earliest'} to ${req.query.endDate || 'latest'}`
        : undefined;

    streamExpensesPDF(res, expenses, { rangeLabel });
  } catch (error) {
    next(error);
  }
};

export { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense, getMonthlySummary, exportCSV, exportPDF };

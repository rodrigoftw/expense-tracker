import { describe, it, expect } from '@jest/globals';
import { buildExpensesCSV } from '../../utils/exportUtils';

describe('buildExpensesCSV', () => {
  const makeExpense = (overrides: any = {}) => ({
    toJSON: () => ({
      date: '2026-07-01',
      title: 'Groceries',
      category: 'Food',
      amount: '87.50',
      notes: 'Weekly shop',
      ...overrides,
    }),
  });

  it('produces a CSV header row with the expected columns', () => {
    const csv = buildExpensesCSV([makeExpense()]);
    const [header] = csv.split(/\r?\n/);

    expect(header).toBe('"Date","Title","Category","Amount","Notes"');
  });

  it('formats each expense row correctly, including amount with 2 decimals', () => {
    const csv = buildExpensesCSV([makeExpense({ amount: '87.5' })]);
    const rows = csv.split(/\r?\n/);

    expect(rows[1]).toContain('2026-07-01');
    expect(rows[1]).toContain('Groceries');
    expect(rows[1]).toContain('Food');
    expect(rows[1]).toContain('87.50');
  });

  it('falls back to an empty string when notes are missing', () => {
    const csv = buildExpensesCSV([makeExpense({ notes: null })]);
    const rows = csv.split(/\r?\n/);

    expect(rows).toHaveLength(2);
    expect(rows[1]).toBeDefined();
    expect(rows[1]?.endsWith('""')).toBe(true);
  });

  it('handles multiple expenses, producing one row per expense plus header', () => {
    const csv = buildExpensesCSV([
      makeExpense({ title: 'Groceries' }),
      makeExpense({ title: 'Bus fare', category: 'Transportation', amount: '4.50' }),
    ]);
    const rows = csv.trim().split(/\r?\n/);

    expect(rows).toHaveLength(3); // header + 2 rows
    expect(rows[2]).toContain('Bus fare');
    expect(rows[2]).toContain('Transportation');
  });

  it('returns just a header row for an empty expense list', () => {
    const csv = buildExpensesCSV([]);
    expect(csv.trim().split(/\r?\n/)).toHaveLength(1);
  });
});

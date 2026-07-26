import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import moment from 'moment';

// Builds a CSV string from an array of expense records
const buildExpensesCSV = (expenses: any[]) => {
  const fields = [
    { label: 'Date', value: (row: any) => moment(row.date).format('YYYY-MM-DD') },
    { label: 'Title', value: 'title' },
    { label: 'Category', value: 'category' },
    { label: 'Amount', value: (row: any) => Number(row.amount).toFixed(2) },
    { label: 'Notes', value: (row: any) => row.notes || '' },
  ];

  const parser = new Parser({ fields });
  return parser.parse(expenses.map((e: any) => e.toJSON()));
};

// Streams a simple PDF report of expenses directly to the HTTP response
const streamExpensesPDF = (res: any, expenses: any[], meta: any = {}) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text('Expense Report', { align: 'center' });
  if (meta.rangeLabel) {
    doc.moveDown(0.3).fontSize(10).fillColor('gray').text(meta.rangeLabel, { align: 'center' });
  }
  doc.moveDown(1).fillColor('black');

  // Table header
  const startX = 40;
  let y = doc.y;
  const colWidths = { date: 80, title: 160, category: 100, amount: 80 };

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Date', startX, y, { width: colWidths.date });
  doc.text('Title', startX + colWidths.date, y, { width: colWidths.title });
  doc.text('Category', startX + colWidths.date + colWidths.title, y, { width: colWidths.category });
  doc.text('Amount', startX + colWidths.date + colWidths.title + colWidths.category, y, {
    width: colWidths.amount,
    align: 'right',
  });
  doc.moveDown(0.5);
  doc.font('Helvetica');
  y = doc.y;
  doc.moveTo(startX, y).lineTo(555, y).strokeColor('#cccccc').stroke();
  doc.moveDown(0.3);

  let total = 0;
  expenses.forEach((expense: any) => {
    const rowY = doc.y;
    if (rowY > 760) {
      doc.addPage();
    }
    const amount = Number(expense.amount);
    total += amount;

    doc.fontSize(10);
    doc.text(moment(expense.date).format('YYYY-MM-DD'), startX, doc.y, { width: colWidths.date });
    doc.text(expense.title, startX + colWidths.date, rowY, { width: colWidths.title });
    doc.text(expense.category, startX + colWidths.date + colWidths.title, rowY, {
      width: colWidths.category,
    });
    doc.text(
      amount.toFixed(2),
      startX + colWidths.date + colWidths.title + colWidths.category,
      rowY,
      { width: colWidths.amount, align: 'right' }
    );
    doc.moveDown(0.4);
  });

  doc.moveDown(0.5);
  doc.moveTo(startX, doc.y).lineTo(555, doc.y).strokeColor('#cccccc').stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total: ${total.toFixed(2)}`, { align: 'right' });

  doc.end();
};

export { buildExpensesCSV, streamExpensesPDF };

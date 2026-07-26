// Central error handler - catches errors passed via next(err) and Sequelize errors
const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error(err);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e: any) => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
};

const notFound = (req: any, res: any) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export { errorHandler, notFound };

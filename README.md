# Expense Tracker API

A REST API for tracking personal expenses, built with **Node.js**, **Express**, **PostgreSQL** (via Sequelize), and **JWT authentication**.

## Features

- User registration & login (JWT-based auth)
- Create, read, update, delete expenses (scoped per user)
- Filter expenses by category, amount range, date range, and free-text search
- Pagination and sorting
- Monthly summaries (totals per month + category breakdown per month)
- Export filtered expenses to **CSV** or **PDF**

## Tech Stack

| Concern         | Choice                          |
|-----------------|----------------------------------|
| Server          | Node.js + Express.js             |
| Database        | PostgreSQL + Sequelize ORM       |
| Auth            | JSON Web Tokens (jsonwebtoken)   |
| Password hashing| bcryptjs                         |
| Date handling   | moment.js                        |
| Validation      | express-validator                |
| CSV export      | json2csv                         |
| PDF export      | pdfkit                           |

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A running PostgreSQL instance (local, Docker, or a hosted service like Neon/Supabase/Railway)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

You can either set individual `DB_*` variables, or set a single `DATABASE_URL`
(useful for hosted Postgres providers) — `DATABASE_URL` takes priority if present.

### 4. Create the database tables
In development, tables are auto-synced on server start. To do it explicitly
(recommended before production deploys):
```bash
npm run migrate
```

### 5. Run the server
```bash
npm run dev     # with nodemon (auto-restart)
npm start       # plain node
```

The API will be available at `http://localhost:5000/api`.

## API Reference

All expense routes require an `Authorization: Bearer <token>` header, obtained from `/api/auth/login` or `/api/auth/register`.

### Auth

| Method | Route                | Body                              | Description         |
|--------|-----------------------|-----------------------------------|----------------------|
| POST   | `/api/auth/register`  | `{ name, email, password }`       | Create a new user    |
| POST   | `/api/auth/login`     | `{ email, password }`             | Log in, get a token  |
| GET    | `/api/auth/me`        | —                                  | Get current user     |

### Expenses

| Method | Route                          | Description                                    |
|--------|----------------------------------|-------------------------------------------------|
| POST   | `/api/expenses`                 | Create an expense                               |
| GET    | `/api/expenses`                 | List expenses (filters + pagination, see below) |
| GET    | `/api/expenses/:id`              | Get one expense                                 |
| PUT    | `/api/expenses/:id`              | Update an expense                               |
| DELETE | `/api/expenses/:id`              | Delete an expense                               |
| GET    | `/api/expenses/summary/monthly`  | Monthly totals + category breakdown             |
| GET    | `/api/expenses/export/csv`       | Download filtered expenses as CSV               |
| GET    | `/api/expenses/export/pdf`       | Download filtered expenses as PDF               |

#### Query params supported on `GET /api/expenses` (and the export routes)
- `category` — exact category match (see list below)
- `minAmount`, `maxAmount` — numeric range
- `startDate`, `endDate` — `YYYY-MM-DD`, inclusive
- `search` — case-insensitive match on title
- `page`, `limit` — pagination (default `page=1`, `limit=20`, max `limit=100`)
- `sortBy` — `date` | `amount` | `title` | `category` | `createdAt`
- `sortOrder` — `asc` | `desc` (default `desc`)

Example:
```
GET /api/expenses?category=Food&minAmount=10&maxAmount=200&startDate=2026-06-01&endDate=2026-06-30&sortBy=amount&sortOrder=desc
```

#### Expense fields
```json
{
  "title": "Groceries",
  "amount": 87.50,
  "category": "Food",
  "notes": "Weekly shop",
  "date": "2026-07-01"
}
```

Valid categories: `Food, Transportation, Housing, Utilities, Entertainment, Health, Shopping, Education, Travel, Other`

#### Monthly summary response shape
```json
{
  "monthlyTotals": [
    { "month": "2026-06", "total": 1234.56, "count": 14 }
  ],
  "categoryBreakdown": [
    { "month": "2026-06", "category": "Food", "total": 320.10 }
  ]
}
```
Optional query params: `year` (e.g. `2026`), `category`.

## Example: quick end-to-end test with curl

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"johndoe@example.com","password":"secret123"}'

# Save the returned token, then create an expense
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Groceries","amount":87.50,"category":"Food","date":"2026-07-10"}'

# List with filters
curl "http://localhost:5000/api/expenses?category=Food" \
  -H "Authorization: Bearer <TOKEN>"

# Monthly summary
curl "http://localhost:5000/api/expenses/summary/monthly?year=2026" \
  -H "Authorization: Bearer <TOKEN>"

# Export CSV
curl "http://localhost:5000/api/expenses/export/csv" \
  -H "Authorization: Bearer <TOKEN>" -o expenses.csv
```

## Project Structure
```
expense-tracker/
├── config/
│   └── db.ts              # Sequelize/PostgreSQL connection
├── controllers/
│   ├── authController.ts
│   └── expenseController.ts
├── middleware/
│   ├── auth.ts             # JWT verification
│   └── errorHandler.ts
├── models/
│   ├── User.ts
│   ├── Expense.ts
│   └── index.ts             # associations
├── routes/
│   ├── authRoutes.ts
│   └── expenseRoutes.ts
├── scripts/
│   └── migrate.ts
├── utils/
│   └── exportUtils.ts       # CSV/PDF generation
├── server.ts
├── package.json
└── .env.example
```

## Notes on design decisions
- **Sequelize + PostgreSQL**: gives you real relational integrity (foreign keys, cascading deletes) between users and expenses, plus painless `SUM`/`GROUP BY` queries for the summary endpoint.
- **UUID primary keys**: avoids leaking sequential IDs and makes it trivial to merge data later if needed.
- **Filtering is centralized** in `buildFilterWhere()` inside `expenseController.ts`, so the list endpoint, CSV export, and PDF export all honor the exact same filters.
- **Passwords** are hashed with bcrypt in a model hook, so `User.create()`/`user.update()` always store hashed passwords — no controller can accidentally save one in plaintext.
- Auto-sync (`sequelize.sync({ alter: true })`) is convenient for development but for a real production deployment, run `npm run migrate` explicitly (or introduce `sequelize-cli` migrations) instead of syncing on every boot.

## Testing

The project has a Jest + Supertest test suite that mocks the Sequelize models
layer, so tests run without a real PostgreSQL connection.

```bash
npm test          # run once
npm run test:watch # watch mode
```

Coverage:
- **`tests/integration/auth.routes.test.ts`** — register/login validation, duplicate-email handling, wrong-password handling, unauthenticated `/me`
- **`tests/integration/expense.routes.test.ts`** — full CRUD, filter query params (category/amount/date range → correct Sequelize `where` clause), pagination, monthly summary shape, CSV export, and auth rejection
- **`tests/unit/authMiddleware.test.ts`** — valid/missing/malformed/expired tokens, deleted-user edge case
- **`tests/unit/exportUtils.test.ts`** — CSV header/row formatting, missing notes, multiple rows, empty list
- **`tests/unit/models.test.ts`** — `User.comparePassword`, `toJSON` password stripping, `Expense` category list and validation config

Since the model layer is mocked in the route tests, they verify **routing, validation, auth, and controller logic** rather than actual SQL behavior. If you want true integration coverage against a real database, point `DATABASE_URL` at a disposable test database and add a separate suite that skips the model mocks — that's a reasonable next step (see below).

## Possible next steps
- Add refresh tokens / token blacklisting on logout
- Add recurring expenses
- Add budget limits per category with alerts
- Add a simple frontend (React/Next.js) consuming this API

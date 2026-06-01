# Ecommerce Order Management Backend

A production-grade REST API for e-commerce order management, built as a
3-layer monolith with Node.js, Express, PostgreSQL, and Redis.

## Features

- JWT authentication with Redis-backed session revocation
- Product catalogue with Redis caching (cache-aside pattern)
- Cart management
- Order placement with database transactions
- Razorpay payment integration (COD + online)
- Webhook processing with HMAC verification and idempotency
- Structured logging with correlation IDs
- Rate limiting (general + auth-specific)
- Graceful shutdown
- Environment validation at startup
- Integration test suite (22 tests)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express |
| Database | PostgreSQL 15 |
| Cache / Sessions | Redis 7 |
| Auth | JWT + bcrypt |
| Payments | Razorpay |
| Logging | Winston |
| Validation | Zod |
| Testing | Jest + Supertest |
| Containerisation | Docker |

## Architecture

```
HTTP Request
     ↓
Middleware (correlationId → helmet → cors → rateLimit → bodyParser → requestLogger)
     ↓
Controller  — HTTP parsing and response formatting
     ↓
Service     — business logic and validation
     ↓
Repository  — database queries
     ↓
PostgreSQL / Redis
```

See [docs/architecture.md](docs/architecture.md) for detailed design decisions.

## Prerequisites

- Node.js 20+
- Docker Desktop

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ecommerce-backend.git
cd ecommerce-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. Required variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=order_management
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
REDIS_HOST=localhost
REDIS_PORT=6379
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
CORS_ORIGIN=http://localhost:3000
```

### 4. Start infrastructure

```bash
docker compose up -d
```

### 5. Run migrations

```bash
# PowerShell
Get-Content src/migrations/001_create_users.sql | docker exec -i order_mgmt_postgres psql -U postgres -d order_management
Get-Content src/migrations/002_create_addresses.sql | docker exec -i order_mgmt_postgres psql -U postgres -d order_management
Get-Content src/migrations/003_create_products.sql | docker exec -i order_mgmt_postgres psql -U postgres -d order_management
Get-Content src/migrations/004_create_cart.sql | docker exec -i order_mgmt_postgres psql -U postgres -d order_management
Get-Content src/migrations/005_create_orders.sql | docker exec -i order_mgmt_postgres psql -U postgres -d order_management
Get-Content src/migrations/006_create_payments.sql | docker exec -i order_mgmt_postgres psql -U postgres -d order_management
```

### 6. Start the server

```bash
npm run dev
```

Server runs at `http://localhost:3000`. Health check: `GET /health`

## Running Tests

```bash
npm test
```

Tests run against a separate `order_management_test` database.
Stop `npm run dev` before running tests.

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login |
| POST | /api/auth/logout | Yes | Logout (invalidates session) |

### Products

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/products | No | List products |
| GET | /api/products/:id | No | Get product |
| POST | /api/products | Admin | Create product |
| PATCH | /api/products/:id | Admin | Update product |
| DELETE | /api/products/:id | Admin | Soft delete product |

### Cart

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/cart | Yes | Get cart |
| POST | /api/cart/items | Yes | Add item to cart |
| PATCH | /api/cart/items/:id | Yes | Update quantity |
| DELETE | /api/cart/items/:id | Yes | Remove item |

### Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/orders | Yes | Place order from cart |
| GET | /api/orders | Yes | List my orders |
| GET | /api/orders/:id | Yes | Get order details |
| PATCH | /api/orders/:id/status | Admin | Update order status |

### Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/payments/initiate | Yes | Initiate payment |
| POST | /api/payments/verify | Yes | Verify Razorpay payment |
| POST | /api/payments/webhook | No | Razorpay webhook |
| GET | /api/payments/order/:orderId | Yes | Get payment for order |

### User Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/users/profile | Yes | Get profile |
| PATCH | /api/users/profile | Yes | Update profile |
| PATCH | /api/users/profile/password | Yes | Change password |

## CI/CD

GitHub Actions runs on every push to `main`:
- Spins up PostgreSQL and Redis service containers
- Runs database migrations
- Runs the full test suite (22 tests)

## Project Structure

```
src/
  config/        — database, redis, razorpay, logger, env validation
  controllers/   — HTTP request/response handling
  middleware/    — auth, rate limiting, logging, error handling
  migrations/    — SQL schema files
  repositories/  — database queries
  routes/        — Express route definitions
  services/      — business logic
  utils/         — AppError, cache helpers
  app.js         — Express app setup
  server.js      — server startup and graceful shutdown
tests/           — integration tests (Jest + Supertest)
docs/            — architecture documentation
Dockerfile       — multi-stage production build
```
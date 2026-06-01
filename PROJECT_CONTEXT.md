# Ecommerce Backend — Project Context

## Stack
- Node.js, Express, PostgreSQL, Redis
- Docker Compose
- 3-layer architecture: controller → service → repository

## Database: `order_management`
Container name: `order_mgmt_postgres`
User: `postgres`, Password: `postgres`, Port: `5432`

## Test Database: `order_management_test`
Same container, same credentials, separate database.
Run all 6 migrations against it before running tests.

## Redis
Container name: `order_mgmt_redis`
Host: localhost, Port: 6379

## Actual Table Schemas

### users
id            UUID PRIMARY KEY DEFAULT uuid_generate_v4()
email         VARCHAR(255) NOT NULL UNIQUE
password_hash VARCHAR(255) NOT NULL
first_name    VARCHAR(100) NOT NULL
last_name     VARCHAR(100) NOT NULL
phone         VARCHAR(20)
role          VARCHAR(20) NOT NULL DEFAULT 'customer'
is_active     BOOLEAN NOT NULL DEFAULT true
created_at    TIMESTAMP WITH TIME ZONE
updated_at    TIMESTAMP WITH TIME ZONE

### products
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name           VARCHAR(255) NOT NULL
description    TEXT
price          NUMERIC
stock_quantity INTEGER
sku            VARCHAR(100)
category       VARCHAR(100)
is_active      BOOLEAN NOT NULL DEFAULT true
created_at     TIMESTAMP WITH TIME ZONE
updated_at     TIMESTAMP WITH TIME ZONE

### carts
id         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id    UUID NOT NULL UNIQUE REFERENCES users(id)
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE

### cart_items
id         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
cart_id    UUID NOT NULL REFERENCES carts(id)
product_id UUID NOT NULL REFERENCES products(id)
quantity   INTEGER NOT NULL DEFAULT 1
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
UNIQUE (cart_id, product_id)

### addresses
id             UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id        UUID NOT NULL REFERENCES users(id)
label          VARCHAR(50)
address_line1  VARCHAR(255) NOT NULL
address_line2  VARCHAR(255)
city           VARCHAR(100) NOT NULL
state          VARCHAR(100) NOT NULL
postal_code    VARCHAR(20) NOT NULL
country        VARCHAR(100) NOT NULL DEFAULT 'India'
is_default     BOOLEAN NOT NULL DEFAULT false
created_at     TIMESTAMP WITH TIME ZONE
updated_at     TIMESTAMP WITH TIME ZONE

### orders
id            UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id       UUID NOT NULL REFERENCES users(id)
address_id    UUID NOT NULL REFERENCES addresses(id)
status        order_status NOT NULL DEFAULT 'pending'
subtotal      NUMERIC(10,2) NOT NULL
tax           NUMERIC(10,2) NOT NULL DEFAULT 0
shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0
total         NUMERIC(10,2) NOT NULL
notes         TEXT
created_at    TIMESTAMP WITH TIME ZONE
updated_at    TIMESTAMP WITH TIME ZONE

order_status enum: pending, confirmed, processing, shipped, delivered, cancelled, refunded

### order_items
id          UUID PRIMARY KEY DEFAULT uuid_generate_v4()
order_id    UUID NOT NULL REFERENCES orders(id)
product_id  UUID NOT NULL REFERENCES products(id)
quantity    INTEGER NOT NULL
unit_price  NUMERIC(10,2) NOT NULL
total_price NUMERIC(10,2) NOT NULL
created_at  TIMESTAMP WITH TIME ZONE

### payments
id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4()
order_id            UUID NOT NULL REFERENCES orders(id)
amount              NUMERIC(10,2) NOT NULL
status              payment_status NOT NULL DEFAULT 'pending'
method              payment_method NOT NULL
gateway_payment_id  VARCHAR(255) UNIQUE
gateway_order_id    VARCHAR(255)
idempotency_key     VARCHAR(255) UNIQUE
metadata            JSONB
created_at          TIMESTAMP WITH TIME ZONE
updated_at          TIMESTAMP WITH TIME ZONE

payment_status enum: pending, completed, failed, refunded
payment_method enum: razorpay, cod

## Key Variable/Column Name Decisions
- Users: `first_name`, `last_name`, `password_hash` (NOT `name`, `password`)
- JWT payload key: `userId` (NOT `id`)
- JWT also contains `jti` claim — unique ID per token, used as Redis session handle
- Products: soft delete via `is_active = false` (NOT hard DELETE)
- All primary keys: UUID (NOT integer SERIAL)
- Addresses: `addressLine1`, `addressLine2`, `postalCode`, `isDefault` in JS (camelCase)
  map to `address_line1`, `address_line2`, `postal_code`, `is_default` in DB (snake_case)
- Order tax rate: 18% GST
- Order shipping cost: flat 50.00
- Razorpay amounts in paise (multiply rupees by 100)
- PostgreSQL error code 23505 = unique constraint violation

## Caching Strategy
- Pattern: cache-aside (lazy loading)
- Product list TTL: 5 minutes — key pattern: products:list:{category}:{page}:{limit}
- Single product TTL: 10 minutes — key pattern: products:single:{id}
- Invalidation: on create/update/delete, del products:single:{id} + delPattern products:list:*
- Redis errors never crash the app — graceful degradation to database

## Session Strategy
- On login/register: generate JWT with jti claim, write session:{jti} → userId to Redis (TTL 7 days)
- On every authenticated request: verify JWT signature, then check session:{jti} exists in Redis
- On logout: delete session:{jti} from Redis — token becomes immediately invalid
- If Redis is down: session check is skipped, app falls back to JWT-only auth
- req.jti is attached by authenticate middleware for use by logout controller

## Rate Limiting
- General limiter: 100 requests / 15 min per IP — applied to all routes
- Auth limiter: 10 requests / 15 min per IP — applied to /api/auth routes only
- Store: Redis (rate-limit-redis + express-rate-limit)
- Skip function: rate limiting is disabled when NODE_ENV=test
- 429 response: { status: 'error', message: 'Too many requests...' }

## API Response Shapes

### POST /api/auth/login
Request:  { email, password }
Response: { user, token }

### POST /api/auth/register
Request:  { firstName, lastName, email, password }
Response: { user, token }

### POST /api/auth/logout
Response: { status, message }
Requires: Bearer token

### GET /api/products
Response: { products: [...] }  ← NOT nested under data

### GET /api/products/:id
Response: { product }  ← NOT nested under data

### GET /api/cart
Response: { status, data: { cart: { id, user_id, items: [...], totalPrice } } }

### POST /api/addresses
Request:  { label, addressLine1, addressLine2, city, state, postalCode, country, isDefault }
Response: { status, data: { address } }

### GET /api/addresses
Response: { status, data: { addresses: [...] } }

### POST /api/orders
Request:  { addressId, notes }
Response: { status, data: { order: { ...order, items: [...] } } }

### GET /api/orders
Response: { status, data: { orders: [...] } }

### GET /api/orders/:id
Response: { status, data: { order: { ...order, items: [...] } } }

### PATCH /api/orders/:id/status
Request:  { status }
Response: { status, data: { order } }

### POST /api/payments/initiate
Request:  { orderId, method }
Response (COD):      { status, data: { payment } }
Response (Razorpay): { status, data: { payment, razorpayOrderId, razorpayKeyId, amount, currency } }

### POST /api/payments/verify
Request:  { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
Response: { status, data: { payment } }

### POST /api/payments/webhook
Request:  Razorpay webhook payload (raw body)
Headers:  x-razorpay-signature
Response: { status: 'ok', received, processed }
Auth:     None — verified via HMAC signature

### GET /api/payments/order/:orderId
Response: { status, data: { payment } }

### GET /api/users/profile
Response: { status, data: { user } }

### PATCH /api/users/profile
Request:  { firstName, lastName, phone }  ← any subset, all optional
Response: { status, data: { user } }

### PATCH /api/users/profile/password
Request:  { currentPassword, newPassword }
Response: { status, data: { message } }

## Folder Structure
src/
  config/        — database.js, razorpay.js, redis.js
  controllers/   — authController.js, productController.js, cartController.js,
                   addressController.js, orderController.js, paymentController.js,
                   userController.js
  middleware/    — authenticate.js, authorize.js, errorHandler.js, requestLogger.js,
                   rateLimiter.js
  migrations/    — 001_create_users.sql, 002_create_addresses.sql,
                   003_create_products.sql, 004_create_cart.sql,
                   005_create_orders.sql, 006_create_payments.sql
  repositories/  — userRepository.js, productRepository.js, cartRepository.js,
                   addressRepository.js, orderRepository.js, paymentRepository.js
  routes/        — authRoutes.js, productRoutes.js, cartRoutes.js,
                   addressRoutes.js, orderRoutes.js, paymentRoutes.js,
                   userRoutes.js
  services/      — authService.js, productService.js, cartService.js,
                   addressService.js, orderService.js, paymentService.js,
                   userService.js
  utils/         — AppError.js, cache.js
  app.js
  server.js

tests/
  env.js         — sets NODE_ENV=test and DB_NAME before modules load
  setup.js       — globalSetup hook
  teardown.js    — globalTeardown hook
  helpers.js     — clearDatabase, createUserAndLogin, createProduct, createAddress
  auth.test.js   — 7 tests: register, login, logout
  products.test.js — 5 tests: product list, single product
  cart.test.js   — 4 tests: cart get, add item
  orders.test.js — 5 tests: order placement, listing

jest.config.js   — testMatch, maxWorkers: 1, setupFiles, globalSetup/Teardown

## Admin Test User
Email:    admin@example.com
Password: admin123
Role:     admin

## Environment Variables Required
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET, JWT_EXPIRES_IN
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
REDIS_HOST, REDIS_PORT
CORS_ORIGIN

## PowerShell Gotchas
- Use single quotes when assigning bcrypt hashes: $hash = '$2b$12$...'
- Use here-strings for JSON bodies in Invoke-RestMethod
- Use `Get-Content file.sql | docker exec -i ...` for migrations
- Always run Invoke-RestMethod in a separate terminal from `npm run dev`
- Products response is $response.products not $response.data.products
- Single product response is $response.product not $response.data.product
- All other endpoints follow { status, data: { ... } } shape
- To reset admin password: generate hash with node, assign with single quotes,
  update with docker exec psql
- To clear Redis: docker exec -i order_mgmt_redis redis-cli FLUSHDB
- To run tests: npm test (uses order_management_test database)
- NODE_ENV=test disables rate limiting and points to test database

## Days 15-21 — What was added

### New files
src/config/logger.js         — winston logger, JSON in prod, coloured text in dev
src/config/index.js          — zod env validation, single source of truth for all config
src/middleware/correlationId.js — UUID per request, attached to req and response header
src/middleware/rateLimiter.js   — general (100/15min) + auth (10/15min), Redis-backed
src/migrate.js               — runs all migrations in order, safe to run repeatedly
docs/architecture.md         — system design decisions explained in plain English
Dockerfile                   — multi-stage build, node:20-alpine, production-ready
.github/workflows/ci.yml     — runs 22 tests on every push to main
README.md                    — full project documentation

### Key decisions
- Winston replaces console.log — structured JSON logging in production
- Correlation ID is first middleware — every log line includes the request UUID
- Zod validates all env vars at startup — app crashes immediately if misconfigured
- config/index.js is the only place process.env is read — everything else imports config
- Graceful shutdown handles SIGTERM + SIGINT — closes HTTP, pool, Redis in order
- 10 second forced exit timeout prevents hanging on stuck requests
- Multi-stage Dockerfile — builder stage has devDeps, production stage omits them
- CMD uses exec form ["node", "src/server.js"] so Node receives OS signals directly
- NODE_ENV=test disables rate limiting and points to order_management_test database
- Stop npm run dev before running npm test — both compete for DB connections

### Test database
Name: order_management_test
Same container as dev, all 6 migrations applied
Run: npm test (uses tests/env.js to set NODE_ENV and DB_NAME)

### CI
GitHub Actions — .github/workflows/ci.yml
Passes: 22 tests across auth, products, cart, orders test suites
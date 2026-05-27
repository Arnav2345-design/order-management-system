# Ecommerce Backend — Project Context

## Stack
- Node.js, Express, PostgreSQL, Redis
- Docker Compose
- 3-layer architecture: controller → service → repository

## Database: `order_management`
Container name: `order_mgmt_postgres`
User: `postgres`, Password: `postgres`, Port: `5432`

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
-- schema exists, implementation Day 9+

## Key Variable/Column Name Decisions
- Users: `first_name`, `last_name`, `password_hash` (NOT `name`, `password`)
- JWT payload key: `userId` (NOT `id`)
- Products: soft delete via `is_active = false` (NOT hard DELETE)
- All primary keys: UUID (NOT integer SERIAL)
- Addresses: `addressLine1`, `addressLine2`, `postalCode`, `isDefault` in JS (camelCase)
  map to `address_line1`, `address_line2`, `postal_code`, `is_default` in DB (snake_case)
- Order tax rate: 18% GST
- Order shipping cost: flat 50.00

## API Response Shapes

### POST /api/auth/login
Request:  { email, password }
Response: { user, token }

### POST /api/auth/register
Request:  { firstName, lastName, email, password }
Response: { user, token }

### GET /api/products
Response: { products: [...] }  ← NOT nested under data

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

## Folder Structure
src/
  config/        — database.js
  controllers/   — authController.js, productController.js, cartController.js,
                   addressController.js, orderController.js
  middleware/    — authenticate.js, authorize.js, errorHandler.js, requestLogger.js
  migrations/    — 001_create_users.sql, 002_create_addresses.sql,
                   003_create_products.sql, 004_create_cart.sql,
                   005_create_orders.sql, 006_create_payments.sql
  repositories/  — userRepository.js, productRepository.js, cartRepository.js,
                   addressRepository.js, orderRepository.js
  routes/        — authRoutes.js, productRoutes.js, cartRoutes.js,
                   addressRoutes.js, orderRoutes.js
  services/      — authService.js, productService.js, cartService.js,
                   addressService.js, orderService.js
  utils/         — AppError.js
  app.js
  server.js

## Admin Test User
Email:    admin@example.com
Password: admin123
Role:     admin

## PowerShell Gotchas
- Use single quotes when assigning bcrypt hashes: $hash = '$2b$12$...'
- Use here-strings for JSON bodies in Invoke-RestMethod
- Use `Get-Content file.sql | docker exec -i ...` for migrations
- Always run Invoke-RestMethod in a separate terminal from `npm run dev`
- Products response is $response.products not $response.data.products
- All other endpoints follow { status, data: { ... } } shape
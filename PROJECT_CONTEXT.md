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
```sql
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
```

### products
```sql
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
```

### carts
```sql
id         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
user_id    UUID NOT NULL UNIQUE REFERENCES users(id)
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
```

### cart_items
```sql
id         UUID PRIMARY KEY DEFAULT uuid_generate_v4()
cart_id    UUID NOT NULL REFERENCES carts(id)
product_id UUID NOT NULL REFERENCES products(id)
quantity   INTEGER NOT NULL DEFAULT 1
created_at TIMESTAMP WITH TIME ZONE
updated_at TIMESTAMP WITH TIME ZONE
UNIQUE (cart_id, product_id)
```

### orders, order_items, payments, addresses
-- Added Day 8 onwards

## Key Variable/Column Name Decisions
- Users: `first_name`, `last_name`, `password_hash` (NOT `name`, `password`)
- JWT payload key: `userId` (NOT `id`)
- Products: soft delete via `is_active = false` (NOT hard DELETE)
- All primary keys: UUID (NOT integer SERIAL)

## API Response Shapes

### POST /api/auth/login
Request:  `{ email, password }`
Response: `{ user, token }`

### POST /api/auth/register
Request:  `{ firstName, lastName, email, password }`
Response: `{ user, token }`

### GET /api/products
Response: `{ products: [...] }`  ← note: NOT nested under `data`

### GET /api/cart
Response: `{ status, data: { cart: { id, user_id, items: [...], totalPrice } } }`

## Folder Structure
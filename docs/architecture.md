# Architecture

## Overview

This is a 3-layer monolithic backend for an e-commerce order management system.
The monolith is intentionally chosen as the starting point — it is simpler to
build, test, and reason about than a distributed system. The architecture is
designed to be decomposable into microservices later without rewriting business
logic.

## Layer Structure

### Why 3 layers?

**Single responsibility.** Each layer has one job. Controllers know about HTTP.
Services know about business rules. Repositories know about SQL. None of them
know about each other's concerns.

**Testability.** Integration tests call the HTTP layer directly using supertest.
Because business logic lives in services (not controllers), the tests exercise
the full stack without needing to mock anything.

**Replaceability.** If we switch from PostgreSQL to a different database, only
the repository layer changes. The service layer is unaffected.

## Database Design Decisions

### Why PostgreSQL over MongoDB?

Order management requires strong consistency. An order that debits stock and
creates an order record must either fully succeed or fully fail — partial writes
would corrupt data. PostgreSQL's ACID transactions give this guarantee.
MongoDB's document model would require application-level transaction management
for the same guarantees.

### Why UUIDs over integer IDs?

Integer IDs leak information (a competitor can estimate your order volume from
order #1234). UUIDs are safe to expose in URLs. They also make future database
merges trivial — two tables with UUID primary keys will never have ID collisions.

### Why soft delete for products?

Hard-deleting a product that appears in historical orders would break foreign
key constraints and corrupt order history. Setting `is_active = false` preserves
the data integrity of past orders while hiding the product from new customers.

### Why database transactions for order placement?

Order placement touches multiple tables: it reads cart items, creates an order,
creates order items, decrements stock, and clears the cart. If the server
crashes halfway through, a transaction guarantees the database rolls back to a
consistent state. Without a transaction, you could end up with an order created
but stock never decremented.

## Authentication Design

### JWT + Redis sessions

JWT alone cannot be revoked. Once issued, a token is valid until expiry — even
if the user logs out or their account is compromised.

The solution: every JWT contains a `jti` (JWT ID) claim — a unique UUID per
token. On login, the server writes `session:{jti} → userId` to Redis with a TTL
matching the token expiry. On every authenticated request, the server checks
Redis for the session. On logout, the server deletes the Redis key.

This gives us:
- **Stateless verification** — JWT signature check requires no database lookup
- **Revocability** — logout immediately invalidates the token
- **Graceful degradation** — if Redis is down, the app falls back to JWT-only
  auth rather than crashing

### Why bcrypt for passwords?

MD5 and SHA256 are fast hash functions — they can be brute-forced at billions
of attempts per second on modern hardware. bcrypt is intentionally slow
(cost factor 12 = ~250ms per hash). This makes brute force attacks
computationally infeasible.

## Caching Strategy

Cache-aside (lazy loading) pattern for product data:

1. Request arrives for a product
2. Check Redis — if found (cache hit), return immediately
3. If not found (cache miss), query PostgreSQL, store result in Redis, return

TTLs: 5 minutes for product lists, 10 minutes for single products.

**Why not cache everything?**
Orders, carts, and payments are user-specific and change frequently. The
overhead of cache invalidation would outweigh the benefit. Products change
rarely and are read by every user — ideal cache candidates.

**Why cache-aside over write-through?**
Write-through updates the cache on every write. Cache-aside only populates the
cache on reads. For products (read-heavy, write-rare), cache-aside means the
cache only contains data that's actually been requested — no wasted memory on
products nobody views.

## Payment Architecture

### Razorpay integration flow

### Why two verification paths?

The `/verify` endpoint handles the happy path — user completes payment and
the browser reports back. The webhook handles edge cases — browser crash,
network failure, user closes the tab. Without the webhook, payments where
the browser never reported back would stay in `pending` forever.

### Idempotency

The webhook may be delivered multiple times. The idempotency guard checks
if the payment is already `completed` before processing. The `gateway_payment_id`
unique constraint in PostgreSQL provides the final safety net — a duplicate
insert would fail with a `23505` error rather than double-processing.

## Rate Limiting

Two limiters backed by Redis:
- **General**: 100 requests / 15 min per IP — protects all endpoints
- **Auth**: 10 requests / 15 min per IP — protects login/register from
  brute force attacks

Redis-backed counters survive server restarts and work across multiple
server instances — unlike in-memory counters.

## Observability

### Structured logging

Every log line is a JSON object with consistent fields: `correlationId`,
`method`, `url`, `statusCode`, `responseTime`, `userId`. This makes logs
searchable and parseable by log aggregation tools.

### Correlation IDs

Every request is assigned a UUID on arrival. Every log line produced during
that request includes the UUID. When debugging an error, you search for the
correlation ID and see the complete request history — middleware, business
logic, and error — in one query.

## Graceful Shutdown

On SIGTERM (sent by Docker/Railway on deploy) or SIGINT (Ctrl+C):

1. Stop accepting new HTTP connections
2. Wait for in-flight requests to complete
3. Close the PostgreSQL connection pool
4. Close the Redis connection
5. Exit with code 0

A 10-second timeout forces exit if shutdown hangs — prevents the process
from blocking indefinitely during rolling deploys.

## Input Validation

All request bodies are validated at the route layer using Zod schemas
before reaching controllers or services. This means:

- Invalid requests are rejected immediately with field-level error messages
- Unknown fields are stripped — attackers cannot inject extra fields
- Type coercion happens at the boundary — strings are converted to numbers
  where needed, emails are normalised to lowercase

Validation middleware sits between the route and controller:

If validation fails, the request never reaches business logic.

### Why validate at the route layer and not the service layer?

Service layer validation would work but returns generic errors. Route layer
validation with Zod returns field-specific errors ("email must be a valid
email address") that clients can display directly to users. Services still
contain business logic validation (e.g. "cart must not be empty") — these
are different concerns.

## HTTP Security Headers

Helmet is configured with:

- **Content Security Policy** — tells browsers which sources are trusted.
  Blocks inline scripts and unknown origins, preventing XSS attacks.
- **HSTS** — forces HTTPS in production. Browsers will refuse to connect
  over HTTP for 1 year after the first HTTPS visit.
- **noSniff** — prevents browsers from MIME-sniffing. Forces them to
  respect the Content-Type header, preventing content injection.
- **frameguard** — prevents the app from being embedded in iframes.
  Blocks clickjacking attacks where an attacker overlays your UI.
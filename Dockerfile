# ── Stage 1: Builder ──────────────────────────────────────────────
# We use the full Node.js image to install dependencies.
# The alpine variant is a minimal Linux distribution — much smaller
# than the default Debian-based image.
FROM node:20-alpine AS builder

# Set the working directory inside the container.
# All subsequent commands run from this directory.
WORKDIR /app

# Copy package files first — before copying source code.
# Docker caches each instruction as a layer. If package.json hasn't
# changed, Docker reuses the cached node_modules layer and skips
# npm install entirely. This makes rebuilds much faster.
COPY package*.json ./

# Install ALL dependencies including devDependencies.
# We need them in the builder stage in case there's a build step.
# --frozen-lockfile ensures the exact versions in package-lock.json
# are installed — no accidental upgrades.
RUN npm ci --frozen-lockfile

# Now copy the rest of the source code.
# This is done after npm install so code changes don't invalidate
# the node_modules cache layer.
COPY . .

# ── Stage 2: Production ───────────────────────────────────────────
# Start fresh from a clean Alpine image.
# Nothing from the builder stage carries over except what we
# explicitly copy.
FROM node:20-alpine AS production

# NODE_ENV=production tells Express and other libraries to enable
# production optimisations (e.g. no stack traces in error responses)
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies — no jest, nodemon, etc.
# This keeps the final image lean.
RUN npm ci --frozen-lockfile --omit=dev

# Copy the application source from the builder stage.
# We don't copy node_modules from builder — we installed fresh above.
COPY --from=builder /app/src ./src

# The port your Express app listens on.
# EXPOSE is documentation — it doesn't actually publish the port.
# The actual port mapping happens when you run the container.
EXPOSE 3000

# The command to start the app.
# Use array form (exec form) — not string form.
# Exec form runs node directly as PID 1, which means it receives
# OS signals (SIGTERM, SIGINT) directly — critical for graceful shutdown.
# String form runs through a shell, which intercepts signals.
CMD ["node", "src/server.js"]
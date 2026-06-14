// src/middleware/validateQuery.js
//
// This is the same idea as src/middleware/validate.js, but for
// QUERY STRING parameters instead of the request body.
//
// Why a separate file instead of reusing validate.js?
// In Express, req.body is a plain object we're free to replace
// (validate.js does `req.body = result.data`). req.query, however,
// is a getter-only property in Express 5 — there's no setter, so
// `req.query = ...` or `Object.assign(req.query, ...)` silently does
// nothing. Instead, we validate req.query and store the cleaned
// result on a NEW property, req.validatedQuery, which controllers
// read from.
//
// Usage:
//   router.get('/', validateQuery(paginationQuerySchema), controller.list);
//
// After this middleware runs, req.validatedQuery.page and
// req.validatedQuery.limit are guaranteed to be numbers (not strings)
// with defaults applied — the controller doesn't need to parse or
// default anything itself.

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field:   issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        error: {
          message: 'Validation failed',
          fields:  errors,
          correlationId: req.correlationId,
        },
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}

module.exports = validateQuery;

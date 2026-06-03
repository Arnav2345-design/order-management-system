// src/middleware/validate.js

// This middleware factory takes a zod schema and returns an Express
// middleware that validates req.body against it.
//
// Usage:
//   router.post('/login', validate(loginSchema), authController.login);
//
// If validation fails, it sends a 400 with clear field-level errors.
// If validation passes, req.body is replaced with the parsed/cleaned
// data — meaning type coercions and defaults are applied.

const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Format zod errors into a readable array
      // Each item tells you which field failed and why
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

    // Replace req.body with the validated and parsed data.
    // This strips unknown fields — an attacker can't sneak in
    // extra fields that your code might accidentally use.
    req.body = result.data;
    next();
  };
}

module.exports = validate;
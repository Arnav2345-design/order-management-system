// src/utils/constants.js
//
// Single source of truth for fixed sets of values that are used in
// more than one place (validators, services, etc.).
//
// Why this file exists:
// Before, the list of valid order statuses was written out twice —
// once in orderValidator.js (for request validation) and once in
// orderService.js (for a manual check). If someone added a new status
// (e.g. "returned") and only updated one of the two lists, the app
// would behave inconsistently: the validator might accept a status
// the service then rejects, or vice versa.
//
// By keeping ONE array here and importing it everywhere it's needed,
// there is only one place to edit, and the two layers can never
// drift apart.

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

module.exports = { ORDER_STATUSES };

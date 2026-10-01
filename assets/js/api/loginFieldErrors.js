/**
 * loginFieldErrors.js — reads the validation envelope the login form renders.
 *
 * Why this exists (review FA-03): the form's `hasFieldError` read `error.field` from a callback whose
 * parameter is `errorItem`, so a login response that carried field errors threw a `ReferenceError`
 * from the template's render path. The validation list — and with it the whole error block — was
 * then unreplaceable, and the custom lint and the 74 existing tests did not catch it.
 *
 * Rules:
 * - the template calls these helpers on **every** render, so nothing here may throw: a missing,
 *   blank, non-string or hostile entry is skipped instead of dereferenced.
 * - an error is only attributed to the field it names. A missing field is never guessed to be
 *   "email", because a wrong highlight is a worse answer than no highlight.
 * - the message is passed through as plain text; the caller renders it, this module never does.
 */

/** The form fields the error list is matched against. */
export const LOGIN_FIELD_NAMES = Object.freeze(['email', 'password']);

const toFieldName = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const toMessage = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && typeof value.message === 'string') return value.message.trim();
  return '';
};

/**
 * Normalises whatever the response carried into `[{ field, message }]`, dropping anything that
 * cannot name a field.
 *
 * @param {*} payload the response body, or the `{ errors }` value itself
 * @returns {Array<{field: string, message: string}>}
 */
export function normalizeFieldErrors(payload) {
  const source = Array.isArray(payload) ? payload : payload?.errors;
  if (!Array.isArray(source)) return [];

  const normalized = [];

  for (const entry of source) {
    const field = toFieldName(entry?.field ?? entry?.path ?? entry?.param);
    if (!field) continue;
    normalized.push({ field, message: toMessage(entry) });
  }

  return normalized;
}

/**
 * Whether `fieldName` has a reported error. Safe for any list, including one built by hand.
 *
 * @param {Array<{field?: string}>} fieldErrors
 * @param {string} fieldName
 * @returns {boolean}
 */
export function hasFieldError(fieldErrors, fieldName) {
  if (!Array.isArray(fieldErrors) || !fieldName) return false;
  const wanted = toFieldName(fieldName);
  return fieldErrors.some((entry) => toFieldName(entry?.field) === wanted);
}

/**
 * The first message reported for `fieldName`, or an empty string.
 *
 * @param {Array<{field?: string, message?: string}>} fieldErrors
 * @param {string} fieldName
 * @returns {string}
 */
export function fieldErrorMessage(fieldErrors, fieldName) {
  if (!Array.isArray(fieldErrors) || !fieldName) return '';
  const wanted = toFieldName(fieldName);
  const match = fieldErrors.find((entry) => toFieldName(entry?.field) === wanted);
  return match ? toMessage(match) : '';
}

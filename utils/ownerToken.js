export function normalizeOwnerToken(value) {
  return String(value ?? '').trim();
}

export function isOwnerTokenConfigured(stored) {
  return Boolean(normalizeOwnerToken(stored));
}

export function matchesOwnerToken(stored, input) {
  const expected = normalizeOwnerToken(stored);
  if (!expected) return false;
  return expected === normalizeOwnerToken(input);
}

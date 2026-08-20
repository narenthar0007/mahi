export const formatCurrency = (amount) => `Rs ${Number(amount).toFixed(2)}`;

/** Max digits allowed before the decimal in price fields. */
export const PRICE_MAX_DIGITS = 6;

/** Max digits allowed after the decimal in price fields. */
export const PRICE_MAX_DECIMALS = 2;

/**
 * Keep only a valid price string: optional decimals, max 6 digits before `.`,
 * and up to 2 digits after.
 */
export function sanitizePriceInput(value) {
  const raw = String(value ?? '');
  let cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }

  const [intPartRaw = '', decPartRaw = ''] = cleaned.split('.');
  const intPart = intPartRaw.slice(0, PRICE_MAX_DIGITS);
  const hasDot = cleaned.includes('.');
  const decPart = hasDot ? decPartRaw.slice(0, PRICE_MAX_DECIMALS) : '';

  if (hasDot) return `${intPart}.${decPart}`;
  return intPart;
}

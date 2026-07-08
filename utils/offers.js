import { calculateTaxBreakdown } from './theme';

export const DEFAULT_SHOP_OFFER = {
  enabled: false,
  name: '',
  type: 'percent',
  value: 0,
};

export function normalizeShopOffer(offer) {
  if (!offer || typeof offer !== 'object') {
    return { ...DEFAULT_SHOP_OFFER };
  }
  const type = offer.type === 'flat' ? 'flat' : 'percent';
  const value = Math.max(0, Number(offer.value) || 0);
  return {
    enabled: Boolean(offer.enabled),
    name: typeof offer.name === 'string' ? offer.name.trim() : '',
    type,
    value: type === 'percent' ? Math.min(value, 100) : value,
  };
}

export function isShopOfferConfigured(offer) {
  const normalized = normalizeShopOffer(offer);
  return normalized.enabled && normalized.value > 0;
}

export function offersAreEqual(a, b) {
  const x = normalizeShopOffer(a);
  const y = normalizeShopOffer(b);
  return (
    x.enabled === y.enabled &&
    x.name === y.name &&
    x.type === y.type &&
    Number(x.value) === Number(y.value)
  );
}

export function calculateOfferDiscount(subtotal, offer) {
  const normalized = normalizeShopOffer(offer);
  const base = Math.max(0, Number(subtotal) || 0);
  if (!normalized.enabled || normalized.value <= 0 || base <= 0) {
    return 0;
  }
  if (normalized.type === 'flat') {
    return Math.min(normalized.value, base);
  }
  return Math.round(base * (normalized.value / 100) * 100) / 100;
}

export function calculateBillTotals(cartSubtotal, { taxEnabled = false, shopOffer, offerApplied = false } = {}) {
  const cartTotal = Math.max(0, Number(cartSubtotal) || 0);
  const discountAmount = offerApplied ? calculateOfferDiscount(cartTotal, shopOffer) : 0;
  const subtotalAfterDiscount = Math.max(0, cartTotal - discountAmount);
  const tax = calculateTaxBreakdown(subtotalAfterDiscount, taxEnabled);
  const normalizedOffer = normalizeShopOffer(shopOffer);

  return {
    cartSubtotal: cartTotal,
    discountAmount,
    subtotalAfterDiscount,
    offerApplied: Boolean(offerApplied && discountAmount > 0),
    offerName: normalizedOffer.name,
    offerType: normalizedOffer.type,
    offerValue: normalizedOffer.value,
    ...tax,
  };
}

export function formatOfferSummary(offer, formatCurrency) {
  const normalized = normalizeShopOffer(offer);
  if (!normalized.enabled || normalized.value <= 0) return '';
  const label = normalized.name || 'Offer';
  if (normalized.type === 'flat') {
    return `${label}: ${formatCurrency(normalized.value)} off`;
  }
  return `${label}: ${normalized.value}% off`;
}

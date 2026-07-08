import { Linking, Platform, Alert } from 'react-native';
import { formatCurrency } from './currency';
import { translate, DEFAULT_LANGUAGE } from './i18n/translations';

export const CUSTOMER_PHONE_PATTERN = /^[6-9]\d{9}$/;
export const CUSTOMER_PHONE_MAX_LENGTH = 12;

export function sanitizeCustomerPhoneInput(value = '') {
  let digits = String(value).replace(/\D/g, '');

  // Only treat 91 as country code when the user entered more than 10 digits.
  // Otherwise numbers like 9123456789 (valid 10-digit mobile) get stuck at "912".
  if (digits.startsWith('91') && digits.length > 10) {
    const localPart = digits.slice(2);
    if (localPart.length > 0 && !/^[6-9]/.test(localPart)) {
      return digits.length <= 2 ? digits.slice(0, 2) : `91${localPart.slice(0, 1)}`;
    }
    return `91${localPart.slice(0, 10)}`.slice(0, CUSTOMER_PHONE_MAX_LENGTH);
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length > 0 && !/^[6-9]/.test(digits)) {
    return '';
  }

  return digits.slice(0, 10);
}

export function getCustomerPhoneLocalPart(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidCustomerPhone(phone = '') {
  return CUSTOMER_PHONE_PATTERN.test(getCustomerPhoneLocalPart(phone));
}

export function normalizePhoneNumber(phone) {
  if (!phone?.trim()) return '';

  const localPart = getCustomerPhoneLocalPart(phone);
  if (!CUSTOMER_PHONE_PATTERN.test(localPart)) return '';

  return `91${localPart}`;
}

export function getCustomerPhoneValidationMessage(phone = '', language = DEFAULT_LANGUAGE) {
  if (!String(phone).trim()) return translate(language, 'enterCustomerPhone');
  if (!isValidCustomerPhone(phone)) {
    return translate(language, 'invalidCustomerPhone');
  }
  return '';
}

const formatWhatsappCurrency = (amount) => `₹${Number(amount || 0).toFixed(2)}`;

export const formatLineItem = (line) => {
  let desc = line.name;
  if (line.selectedVariant) {
    desc += ` (${line.selectedVariant.name})`;
  }
  if (line.selectedAddons?.length > 0) {
    desc += ` + ${line.selectedAddons.map((a) => a.name).join(', ')}`;
  }
  return `*${desc}*\n   Qty: ${line.quantity} x ${formatWhatsappCurrency(line.unitPrice)} = *${formatWhatsappCurrency(line.totalPrice)}*`;
};

export const formatBillText = ({
  items,
  totalAmount,
  timestamp,
  orderId = '',
  shopName = '',
}) => {
  const invoiceDate = timestamp ? new Date(timestamp) : new Date();
  const dateLabel = invoiceDate.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeLabel = invoiceDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const itemList = items.length
    ? items.map((item, index) => `${index + 1}. ${formatLineItem(item)}`).join('\n\n')
    : '_No items listed_';

  const lines = [
    `✨ ${(shopName || 'NAREN FOODS').toUpperCase()} ✨`,
    '🧾 *INVOICE*',
    '',
    `🗓️ Date: ${dateLabel} | ${timeLabel}`,
    `🆔 Order ID: #${orderId || '-'}`,
    '',
    '---',
    '🛒 *ITEMS:*',
    '',
    itemList,
    '',
    '---',
    `💵 *TOTAL AMOUNT: ${formatWhatsappCurrency(totalAmount)}*`,
    '---',
    '',
    'Thank you for your purchase! Visit us again. 🙏',
  ];

  return lines.join('\n');
};

export const formatOrderReadyMessage = ({
  items,
  totalAmount,
  orderId = '',
  shopName = '',
  itemCount = 0,
}) => {
  const itemSummary = items
    .map((line) => {
      let name = line.name;
      if (line.selectedVariant) name += ` (${line.selectedVariant.name})`;
      return `• ${name} × ${line.quantity}`;
    })
    .join('\n');

  const lines = [
    shopName ? `*${shopName}*` : null,
    `*Your order is ready!* ✅`,
    orderId ? `Order ID: ${orderId}` : null,
    '',
    itemSummary,
    '',
    `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · Total: ${formatCurrency(totalAmount)}`,
    '',
    'Please collect your order. Thank you!',
  ].filter(Boolean);

  return lines.join('\n');
};

export const sendViaWhatsApp = async (message, phoneNumber = '') => {
  const phone = normalizePhoneNumber(phoneNumber);
  const safeMessage = String(message || '').slice(0, 2800);
  const encoded = encodeURIComponent(safeMessage);

  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.warn('WhatsApp open failed:', error);
    Alert.alert(
      'WhatsApp unavailable',
      'Could not open WhatsApp. Install WhatsApp or share the bill from Order History.'
    );
  }
};

export const sendViaMessage = async (message, phoneNumber = '') => {
  const encoded = encodeURIComponent(message);
  const phone = phoneNumber.replace(/\D/g, '');
  const separator = Platform.OS === 'ios' ? '&' : '?';

  const url = phone
    ? `sms:${phone}${separator}body=${encoded}`
    : Platform.OS === 'ios'
      ? `sms:&body=${encoded}`
      : `sms:?body=${encoded}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Messages unavailable',
      'Could not open your messaging app on this device.'
    );
  }
};

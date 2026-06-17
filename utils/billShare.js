import { Linking, Platform, Alert } from 'react-native';
import { formatCurrency } from './currency';

export const CUSTOMER_PHONE_PATTERN = /^[6-9]\d{9}$/;

export function sanitizeCustomerPhoneInput(value = '') {
  let digits = String(value).replace(/\D/g, '');

  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length > 0 && !/^[6-9]/.test(digits)) {
    return '';
  }

  return digits.slice(0, 10);
}

export function isValidCustomerPhone(phone = '') {
  return CUSTOMER_PHONE_PATTERN.test(String(phone).trim());
}

export function getCustomerPhoneValidationMessage(phone = '') {
  if (!String(phone).trim()) return 'Enter customer WhatsApp number.';
  if (!isValidCustomerPhone(phone)) {
    return 'Customer number must be 10 digits and start with 6, 7, 8, or 9.';
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

export function normalizePhoneNumber(phone) {
  if (!phone?.trim()) return '';

  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && isValidCustomerPhone(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91') && isValidCustomerPhone(digits.slice(2))) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0') && isValidCustomerPhone(digits.slice(1))) {
    return `91${digits.slice(1)}`;
  }
  return '';
}

export const sendViaWhatsApp = async (message, phoneNumber = '') => {
  const encoded = encodeURIComponent(message);
  const phone = normalizePhoneNumber(phoneNumber);

  const appUrl = phone
    ? `whatsapp://send?phone=${phone}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;
  const webUrl = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    Alert.alert(
      'WhatsApp unavailable',
      'Could not open WhatsApp. Please install it or use Messages instead.'
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

import { normalizePhoneNumber, isValidCustomerPhone } from './billShare';
import { formatOfferSummary, isShopOfferConfigured } from './offers';

export const MARKETING_TEMPLATE_IDS = [
  'breakfast',
  'lunch',
  'dinner',
  'evening_snack',
  'festival',
  'new_offer',
  'welcome_back',
  'weekend_special',
  'thank_you',
  'custom',
];

export const MARKETING_TEMPLATES_WITH_ITEMS = new Set([
  'breakfast',
  'lunch',
  'dinner',
  'evening_snack',
  'festival',
  'welcome_back',
  'weekend_special',
]);

export function extractMarketingCustomers(history = []) {
  const map = new Map();

  for (const order of history) {
    const raw = order?.customerPhone || '';
    if (!isValidCustomerPhone(raw)) continue;

    const phone = normalizePhoneNumber(raw);
    if (!phone) continue;

    const ts = order.timestamp || '';
    const existing = map.get(phone);

    if (!existing) {
      map.set(phone, {
        phone,
        displayPhone: raw.trim(),
        orderCount: 1,
        lastOrderAt: ts,
      });
      continue;
    }

    existing.orderCount += 1;
    if (ts && (!existing.lastOrderAt || new Date(ts) > new Date(existing.lastOrderAt))) {
      existing.lastOrderAt = ts;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0)
  );
}

function formatItemLines(items = []) {
  if (!items.length) return '';
  return items.map((item) => `• ${item.name}`).join('\n');
}

export function buildMarketingMessage(templateId, context = {}) {
  const {
    shopName = 'Our shop',
    shopOffer,
    formatCurrency,
    selectedItems = [],
    menuWebsite = '',
    shopWebsite = '',
  } = context;

  const name = shopName.trim() || 'Our shop';
  const itemsBlock = formatItemLines(selectedItems);
  const offerLine =
    shopOffer && isShopOfferConfigured(shopOffer) && formatCurrency
      ? formatOfferSummary(shopOffer, formatCurrency)
      : '';

  const website =
    menuWebsite.trim() || shopWebsite.trim() || '';

  switch (templateId) {
    case 'breakfast':
      return [
        `Good morning from *${name}* ☀️`,
        '',
        'Start your day right — fresh breakfast is ready!',
        '',
        itemsBlock || '• Hot breakfast favourites waiting for you',
        '',
        'Visit us this morning. See you soon!',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'lunch':
      return [
        `Lunch time at *${name}* 🍽️`,
        '',
        'Hungry? We\'ve got you covered for a satisfying lunch.',
        '',
        itemsBlock || '• Today\'s lunch specials',
        '',
        'Drop in or order — lunch is served fresh!',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'dinner':
      return [
        `Dinner at *${name}* 🌙`,
        '',
        'End your day with a delicious meal from our kitchen.',
        '',
        itemsBlock || '• Tonight\'s dinner picks',
        '',
        'Join us for dinner — good food, warm welcome!',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'evening_snack':
      return [
        `This evening isn't complete without a snack from *${name}* 🐍`,
        '',
        itemsBlock || '• Today\'s fresh picks waiting for you',
        '',
        'Drop by before we close — see you tonight!',
        website ? `\n${website}` : '',
      ]
        .filter((line) => line !== undefined)
        .join('\n')
        .trim();

    case 'festival':
      return [
        `🎊 Festival greetings from *${name}*!`,
        '',
        'Celebrate with us — special treats & festive flavours await you.',
        '',
        itemsBlock || '• Festival specials & seasonal favourites',
        offerLine ? `\n${offerLine}` : '',
        '',
        'Wishing you joy — visit us and make the celebration sweeter!',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'new_offer':
      return [
        `🎉 New offer at *${name}*!`,
        '',
        offerLine || 'Special discount available today.',
        '',
        'Show this message at the counter or order as usual.',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'welcome_back':
      return [
        `Hello from *${name}* 👋`,
        '',
        'We noticed it\'s been a while — we\'d love to serve you again!',
        itemsBlock ? `\nTry:\n${itemsBlock}` : '',
        '',
        'Visit us soon. Your favourites are ready.',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'weekend_special':
      return [
        `Weekend special at *${name}* 🌟`,
        '',
        itemsBlock || '• Chef\'s picks this weekend',
        offerLine ? `\n${offerLine}` : '',
        '',
        'Bring family & friends — limited hours, full flavour!',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'thank_you':
      return [
        `Thank you for visiting *${name}* 🙏`,
        '',
        'We hope you enjoyed your order. Your support keeps our counter running.',
        '',
        'See you again soon!',
        website ? `\n${website}` : '',
      ]
        .join('\n')
        .trim();

    case 'custom':
    default:
      return '';
  }
}

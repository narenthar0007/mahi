import uuid from 'react-native-uuid';

const createId = () => String(uuid.v4());

export function normalizeWaitlistEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  const phone = String(entry.phone || '').trim();
  const party = Math.max(1, Math.floor(Number(entry.party) || 0));
  if (!name || !phone || !party) return null;
  return {
    id: entry.id ? String(entry.id) : createId(),
    name,
    phone,
    party,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
  };
}

export function normalizeWaitlist(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeWaitlistEntry).filter(Boolean);
}

export function createWaitlistEntry({ name, phone, party }) {
  return normalizeWaitlistEntry({
    id: createId(),
    name,
    phone,
    party,
    createdAt: new Date().toISOString(),
  });
}

export function getUniquePartySizes(queue = []) {
  const sizes = [...new Set(queue.map((c) => Number(c.party)).filter((n) => n > 0))];
  return sizes.sort((a, b) => a - b);
}

export function filterWaitlistByParty(queue = [], partySize = null) {
  if (partySize === null || partySize === undefined || partySize === '') {
    return queue;
  }
  const size = Number(partySize);
  if (!Number.isFinite(size) || size < 1) return queue;
  return queue.filter((c) => Number(c.party) === size);
}

export function buildTableReadyWhatsAppMessage(customer, tableNumber = '') {
  const name = customer?.name || 'Guest';
  const party = customer?.party || 1;
  if (tableNumber) {
    return `Hey ${name}, your table (${tableNumber}) for ${party} is ready!`;
  }
  return `Hey ${name}, your table for ${party} is ready!`;
}

export function buildTableReadyAnnounceMessage(customer, tableNumber = '') {
  const name = customer?.name || 'Guest';
  const party = customer?.party || 1;
  if (tableNumber) {
    return `Table ${tableNumber} ready for ${name}, party of ${party}.`;
  }
  return `Table ready for ${name}, party of ${party}.`;
}

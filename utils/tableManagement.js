import uuid from 'react-native-uuid';

const createId = () => String(uuid.v4());

export const TABLE_SEAT_TYPES = [
  { id: '2', seats: 2, labelKey: 'tableSeats2' },
  { id: '4', seats: 4, labelKey: 'tableSeats4' },
  { id: '6', seats: 6, labelKey: 'tableSeats6' },
  { id: '8', seats: 8, labelKey: 'tableSeats8' },
  { id: 'customer', seats: 0, labelKey: 'tableSeatsCustomer' },
];

/** Shared color language for table management, history, and printed bills. */
export const TABLE_COLORS = {
  available: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(5, 150, 105, 0.4)',
    swatch: '#10b981',
    labelKey: 'colorLegendAvailable',
  },
  occupied: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderColor: 'rgba(217, 119, 6, 0.55)',
    swatch: '#f59e0b',
    labelKey: 'colorLegendOccupied',
  },
  /** Guest seated, no order taken yet (same amber family, distinct label). */
  seated: {
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderColor: 'rgba(217, 119, 6, 0.45)',
    swatch: '#fbbf24',
    labelKey: 'colorLegendSeated',
  },
  historyTableOrder: {
    backgroundColor: 'rgba(244, 114, 182, 0.28)',
    borderColor: 'rgba(236, 72, 153, 0.5)',
    swatch: '#f472b6',
    labelKey: 'colorLegendHistoryTable',
  },
  runningTableBill: {
    accent: '#db2777',
    headerBg: '#9d174d',
    bodyBg: '#fff1f8',
    totalBg: '#fce7f3',
    border: '#f9a8d4',
    swatch: '#db2777',
    labelKey: 'colorLegendRunningBill',
  },
  paid: {
    backgroundColor: 'rgba(40, 167, 69, 0.14)',
    borderColor: 'rgba(40, 167, 69, 0.35)',
    swatch: '#28a745',
    labelKey: 'colorLegendPaid',
  },
  orderReady: {
    backgroundColor: 'rgba(13, 110, 253, 0.12)',
    borderColor: 'rgba(13, 110, 253, 0.3)',
    swatch: '#0d6efd',
    labelKey: 'colorLegendOrderReady',
  },
};

export const COLOR_LEGEND_KEYS = [
  'available',
  'seated',
  'occupied',
  'historyTableOrder',
  'runningTableBill',
  'paid',
  'orderReady',
];

/** Available = free. Seated = guest present, no order. Ordering = unpaid table order. */
export function getTableOccupancyKind(table) {
  if (!table || table.status !== 'occupied') return 'available';
  if (table.currentOrderId) return 'ordering';
  return 'seated';
}

const DEFAULT_TABLE_SEED = [
  { number: 'T01', seatsType: '2' },
  { number: 'T02', seatsType: '2' },
  { number: 'T03', seatsType: '2' },
  { number: 'T04', seatsType: '2' },
  { number: 'T05', seatsType: '4' },
  { number: 'T06', seatsType: '4' },
  { number: 'T07', seatsType: '4' },
  { number: 'T08', seatsType: '4' },
  { number: 'T09', seatsType: '6' },
  { number: 'T10', seatsType: '6' },
  { number: 'T11', seatsType: '8' },
  { number: 'T12', seatsType: '8' },
  { number: 'C01', seatsType: 'customer', capacity: 10 },
  { number: 'C02', seatsType: 'customer', capacity: 12 },
];

export function normalizeSeatsType(seatsType) {
  const value = String(seatsType || '').trim().toLowerCase();
  if (TABLE_SEAT_TYPES.some((entry) => entry.id === value)) return value;
  const asNumber = Number(value);
  if (asNumber === 2 || asNumber === 4 || asNumber === 6 || asNumber === 8) {
    return String(asNumber);
  }
  return 'customer';
}

export function resolveTableCapacity(seatsType, capacity) {
  const type = normalizeSeatsType(seatsType);
  const meta = TABLE_SEAT_TYPES.find((entry) => entry.id === type);
  if (type !== 'customer' && meta?.seats) {
    return Number(meta.seats);
  }
  const parsed = Number(capacity);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.min(99, Math.floor(parsed));
  }
  return 10;
}

export function createTable({ number, seatsType, capacity } = {}) {
  const cleanedNumber = String(number || '').trim().toUpperCase();
  const type = normalizeSeatsType(seatsType);
  return {
    id: createId(),
    number: cleanedNumber,
    seatsType: type,
    capacity: resolveTableCapacity(type, capacity),
    currentOrderId: null,
    status: 'available',
    guestName: '',
    guestPhone: '',
    guestPartySize: 0,
  };
}

export function createDefaultTables() {
  return DEFAULT_TABLE_SEED.map((entry) => createTable(entry));
}

export function normalizeTable(table) {
  if (!table || typeof table !== 'object') return null;
  const number = String(table.number || '').trim().toUpperCase();
  if (!number) return null;
  const seatsType = normalizeSeatsType(table.seatsType);
  return {
    id: table.id ? String(table.id) : createId(),
    number,
    seatsType,
    capacity: resolveTableCapacity(seatsType, table.capacity),
    currentOrderId: table.currentOrderId ? String(table.currentOrderId) : null,
    status: table.status === 'occupied' ? 'occupied' : 'available',
    guestName: typeof table.guestName === 'string' ? table.guestName.trim() : '',
    guestPhone: typeof table.guestPhone === 'string' ? table.guestPhone.trim() : '',
    guestPartySize: Math.max(0, Math.floor(Number(table.guestPartySize) || 0)),
  };
}

/** Available tables that can seat at least `partySize` guests. */
export function getAvailableTablesForParty(tables, partySize = 1) {
  const party = Math.max(1, Math.floor(Number(partySize) || 1));
  return (tables || [])
    .filter((table) => {
      if (table.status === 'occupied' || table.currentOrderId) return false;
      const capacity = resolveTableCapacity(table.seatsType, table.capacity);
      return capacity >= party;
    })
    .sort((a, b) => {
      const capA = resolveTableCapacity(a.seatsType, a.capacity);
      const capB = resolveTableCapacity(b.seatsType, b.capacity);
      if (capA !== capB) return capA - capB;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
    });
}

export function formatTableCapacityLabel(table, t) {
  const seats = Number(table?.capacity) || resolveTableCapacity(table?.seatsType, table?.capacity);
  if (typeof t === 'function') {
    return t('tableCapacitySeats', { count: seats });
  }
  return `${seats} seats`;
}

export function normalizeTables(tables) {
  if (!Array.isArray(tables) || tables.length === 0) {
    return createDefaultTables();
  }
  const normalized = tables.map(normalizeTable).filter(Boolean);
  return normalized.length > 0 ? normalized : createDefaultTables();
}

/** Keep table occupancy in sync with unpaid table orders in history.
 * Guest-seated tables (occupied, no order yet) are preserved. */
export function syncTablesWithHistory(tables, history) {
  const list = normalizeTables(tables);
  const occupiedByTable = new Map();

  (Array.isArray(history) ? history : []).forEach((order) => {
    if (!order?.isTableOrder || !order?.tableId || order?.isPaid) return;
    if (!occupiedByTable.has(order.tableId)) {
      occupiedByTable.set(order.tableId, order.id || order.orderId || null);
    }
  });

  return list.map((table) => {
    const orderId = occupiedByTable.get(table.id) || null;
    if (orderId) {
      return {
        ...table,
        currentOrderId: orderId,
        status: 'occupied',
      };
    }

    // Running order was paid/cleared — free the table (clear guest too).
    if (table.currentOrderId && !orderId) {
      return {
        ...table,
        currentOrderId: null,
        status: 'available',
        guestName: '',
        guestPhone: '',
        guestPartySize: 0,
      };
    }

    // Guest seated with no order yet — keep occupied + guest info.
    if (table.status === 'occupied') {
      return {
        ...table,
        currentOrderId: null,
        status: 'occupied',
      };
    }

    return {
      ...table,
      currentOrderId: null,
      status: 'available',
      guestName: '',
      guestPhone: '',
      guestPartySize: 0,
    };
  });
}

export function getSeatTypeMeta(seatsType) {
  const id = normalizeSeatsType(seatsType);
  return TABLE_SEAT_TYPES.find((entry) => entry.id === id) || TABLE_SEAT_TYPES[TABLE_SEAT_TYPES.length - 1];
}

export function groupTablesBySeatType(tables) {
  const grouped = TABLE_SEAT_TYPES.map((type) => ({
    ...type,
    tables: [],
  }));
  const byId = Object.fromEntries(grouped.map((g) => [g.id, g]));

  (tables || []).forEach((table) => {
    const key = normalizeSeatsType(table.seatsType);
    if (byId[key]) byId[key].tables.push(table);
  });

  grouped.forEach((group) => {
    group.tables.sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  });

  return grouped;
}

export function isRunningTableOrder(order) {
  return Boolean(order?.isTableOrder) && !order?.isPaid;
}

export function getTableOrderHistoryStyle(order) {
  if (!order?.isTableOrder || order?.isPaid) return null;
  const { backgroundColor, borderColor } = TABLE_COLORS.historyTableOrder;
  return { backgroundColor, borderColor };
}

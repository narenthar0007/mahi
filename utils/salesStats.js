import { startOfDay, endOfDay, filterOrdersByDateRange } from './orderExport';

export const STATS_PERIODS = ['daily', 'weekly', 'monthly'];

export function isOrderIncludedInStats(order) {
  return Boolean(order) && !order.isWrongOrder;
}

export function filterOrdersForStats(orders) {
  return (Array.isArray(orders) ? orders : []).filter(isOrderIncludedInStats);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dayKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function hourKey(date) {
  return `${dayKey(date)}T${pad2(date.getHours())}`;
}

export function getStatsPeriodRange(period, now = new Date()) {
  const to = endOfDay(now);
  if (period === 'daily') {
    return { from: startOfDay(now), to };
  }
  if (period === 'weekly') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { from: startOfDay(from), to };
}

function buildEmptyBuckets(period, from, to) {
  const buckets = [];
  if (period === 'daily') {
    for (let hour = 0; hour < 24; hour += 1) {
      const d = new Date(from);
      d.setHours(hour, 0, 0, 0);
      buckets.push({
        key: hourKey(d),
        label: `${pad2(hour)}:00`,
        shortLabel: String(hour),
        revenue: 0,
        orderCount: 0,
      });
    }
    return buckets;
  }

  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const key = dayKey(cursor);
    buckets.push({
      key,
      label: cursor.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      shortLabel: cursor.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      revenue: 0,
      orderCount: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
}

export function getSalesTrend(orders, period, now = new Date()) {
  const { from, to } = getStatsPeriodRange(period, now);
  const filtered = filterOrdersForStats(filterOrdersByDateRange(orders, from, to));
  const buckets = buildEmptyBuckets(period, from, to);
  const indexByKey = Object.fromEntries(buckets.map((b, i) => [b.key, i]));

  filtered.forEach((order) => {
    const ts = new Date(order?.timestamp || 0);
    if (Number.isNaN(ts.getTime())) return;
    const key = period === 'daily' ? hourKey(ts) : dayKey(ts);
    const idx = indexByKey[key];
    if (idx === undefined) return;
    buckets[idx].revenue += Number(order.totalAmount || 0);
    buckets[idx].orderCount += 1;
  });

  const totalRevenue = buckets.reduce((sum, b) => sum + b.revenue, 0);
  const orderCount = filtered.length;
  const maxRevenue = buckets.reduce((max, b) => Math.max(max, b.revenue), 0);

  return {
    from,
    to,
    buckets,
    totalRevenue,
    orderCount,
    maxRevenue,
  };
}

export function getItemLevelSales(orders, period, now = new Date()) {
  const { from, to } = getStatsPeriodRange(period, now);
  const filtered = filterOrdersForStats(filterOrdersByDateRange(orders, from, to));
  const byItem = new Map();

  filtered.forEach((order) => {
    (order.items || []).forEach((line) => {
      const name = String(line?.name || 'Item').trim() || 'Item';
      const variant = line?.selectedVariant?.name ? ` (${line.selectedVariant.name})` : '';
      const key = `${name}${variant}`;
      const existing = byItem.get(key) || { key, name: key, quantity: 0, revenue: 0 };
      existing.quantity += Number(line?.quantity) > 0 ? Number(line.quantity) : 1;
      existing.revenue += Number(line?.totalPrice) || 0;
      byItem.set(key, existing);
    });
  });

  const items = Array.from(byItem.values()).sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = items.reduce((max, item) => Math.max(max, item.revenue), 0);
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    from,
    to,
    items,
    maxRevenue,
    totalRevenue,
    totalQuantity,
  };
}

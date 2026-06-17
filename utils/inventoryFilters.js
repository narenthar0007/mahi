export const SORT_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'date', label: 'Date' },
];

function parseInventorySearch(rawSearch = '') {
  const query = String(rawSearch).trim().toLowerCase();
  if (!query) return { kind: 'none', query: '' };

  const idLabelMatch = query.match(/^id\s*:?\s*(\d+)$/);
  if (idLabelMatch) {
    return { kind: 'id', query, idValue: idLabelMatch[1] };
  }

  if (/^\d+$/.test(query)) {
    return { kind: 'id', query, idValue: query };
  }

  return { kind: 'text', query };
}

function matchesItemNumber(itemNumber, idValue) {
  const itemNumStr = String(itemNumber ?? '');
  if (!itemNumStr || !idValue) return false;

  if (itemNumStr === idValue || itemNumStr.startsWith(idValue)) {
    return true;
  }

  const itemNum = Number(itemNumber);
  const queryNum = Number(idValue);
  return Number.isFinite(itemNum) && Number.isFinite(queryNum) && itemNum === queryNum;
}

export function filterAndSortInventory(items, { search = '', sortBy = 'id' } = {}) {
  const parsed = parseInventorySearch(search);

  let result = [...(items || [])];

  if (parsed.kind === 'id') {
    result = result.filter((item) => matchesItemNumber(item.itemNumber, parsed.idValue));
  } else if (parsed.kind === 'text') {
    result = result.filter((item) => {
      const nameMatch = (item.name || '').toLowerCase().includes(parsed.query);
      const idMatch = String(item.itemNumber ?? '').includes(parsed.query);
      return nameMatch || idMatch;
    });
  }

  result.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      case 'price':
        return (a.basePrice || 0) - (b.basePrice || 0);
      case 'date':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'id':
      default:
        return (a.itemNumber || 0) - (b.itemNumber || 0);
    }
  });

  return result;
}

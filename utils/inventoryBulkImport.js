const OPTION_SEPARATOR = '|';
const NAME_PRICE_SEPARATOR = ':';

export const BULK_IMPORT_SAMPLE_CSV = `name,basePrice,category,variants,addons
Plain Item,100,,,
Item With Variants,60,,Small:50|Medium:60|Large:80,
Item With Addons,40,,,Extra cheese:15|Bacon:25
Item With Both,120,,Veg:120|Chicken:160,Cheese:15|Extra sauce:10`;

export const BULK_IMPORT_ITEM_TYPES = [
  {
    id: 'plain',
    label: 'Plain item',
    example: 'Plain Item,100,,,',
  },
  {
    id: 'variants',
    label: 'Item with variants',
    example: 'Coffee,60,,Small:50|Medium:60|Large:80,',
  },
  {
    id: 'addons',
    label: 'Item with add-ons',
    example: 'Tea,40,,,Extra shot:20|Honey:10',
  },
  {
    id: 'both',
    label: 'Item with variants and add-ons',
    example: 'Sandwich,120,,Veg:120|Chicken:160,Cheese:15|Sauce:10',
  },
];

const isHeaderRow = (cells) => String(cells[0] || '').trim().toLowerCase() === 'name';

const parsePrice = (value, fieldLabel, lineNumber) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') {
    throw new Error(`Line ${lineNumber}: ${fieldLabel} is required.`);
  }
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0) {
    throw new Error(`Line ${lineNumber}: ${fieldLabel} must be a valid number >= 0.`);
  }
  return num;
};

export const parseOptionList = (raw, fieldLabel, lineNumber) => {
  const text = String(raw ?? '').trim();
  if (!text) return [];

  return text.split(OPTION_SEPARATOR).map((part, index) => {
    const segment = part.trim();
    if (!segment) {
      throw new Error(`Line ${lineNumber}: Empty ${fieldLabel} entry at position ${index + 1}.`);
    }

    const colonIndex = segment.indexOf(NAME_PRICE_SEPARATOR);
    if (colonIndex <= 0 || colonIndex === segment.length - 1) {
      throw new Error(
        `Line ${lineNumber}: Invalid ${fieldLabel} "${segment}". Use Name:Price format.`
      );
    }

    const name = segment.slice(0, colonIndex).trim();
    const priceText = segment.slice(colonIndex + 1).trim();

    if (!name) {
      throw new Error(`Line ${lineNumber}: ${fieldLabel} name is required.`);
    }

    return {
      name,
      price: parsePrice(priceText, `${fieldLabel} "${name}" price`, lineNumber),
    };
  });
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const normalizeJsonItem = (entry, lineNumber) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Line ${lineNumber}: Each JSON item must be an object.`);
  }

  const name = String(entry.name ?? '').trim();
  if (!name) {
    throw new Error(`Line ${lineNumber}: Item name is required.`);
  }

  const basePrice = parsePrice(entry.basePrice, 'basePrice', lineNumber);
  const category = typeof entry.category === 'string' ? entry.category.trim() : '';

  const variants = Array.isArray(entry.variants)
    ? entry.variants.map((variant, index) => {
        const variantName = String(variant?.name ?? '').trim();
        if (!variantName) {
          throw new Error(`Line ${lineNumber}: Variant ${index + 1} name is required.`);
        }
        return {
          name: variantName,
          price: parsePrice(variant?.price, `variant "${variantName}" price`, lineNumber),
        };
      })
    : [];

  const addons = Array.isArray(entry.addons)
    ? entry.addons.map((addon, index) => {
        const addonName = String(addon?.name ?? '').trim();
        if (!addonName) {
          throw new Error(`Line ${lineNumber}: Add-on ${index + 1} name is required.`);
        }
        return {
          name: addonName,
          price: parsePrice(addon?.price, `add-on "${addonName}" price`, lineNumber),
        };
      })
    : [];

  return { name, basePrice, category, variants, addons };
};

const parseJsonImport = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON. Paste a JSON array of items or use CSV format.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON import must be an array of item objects.');
  }

  if (parsed.length === 0) {
    throw new Error('JSON import contains no items.');
  }

  const items = parsed.map((entry, index) => normalizeJsonItem(entry, index + 1));
  return { items, errors: [], format: 'json' };
};

const parseCsvImport = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('Paste CSV rows to import.');
  }

  const items = [];
  const errors = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const cells = parseCsvLine(line);

    if (index === 0 && isHeaderRow(cells)) {
      return;
    }

    if (cells.length < 2) {
      errors.push({ line: lineNumber, message: 'Each row needs at least name and basePrice.' });
      return;
    }

    try {
      const name = String(cells[0] ?? '').trim();
      if (!name) {
        throw new Error('Item name is required.');
      }

      const basePrice = parsePrice(cells[1], 'basePrice', lineNumber);
      const category = String(cells[2] ?? '').trim();
      const variants = parseOptionList(cells[3], 'variant', lineNumber);
      const addons = parseOptionList(cells[4], 'add-on', lineNumber);

      items.push({ name, basePrice, category, variants, addons });
    } catch (error) {
      errors.push({ line: lineNumber, message: error.message.replace(/^Line \d+: /, '') });
    }
  });

  if (items.length === 0 && errors.length === 0) {
    throw new Error('No item rows found. Add data rows below the header.');
  }

  return { items, errors, format: 'csv' };
};

export const parseBulkImportText = (text) => {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    throw new Error('Paste CSV or JSON data to import.');
  }

  if (trimmed.startsWith('[')) {
    return parseJsonImport(trimmed);
  }

  return parseCsvImport(trimmed);
};

export const describeImportItem = (item) => {
  const variantCount = item.variants?.length ?? 0;
  const addonCount = item.addons?.length ?? 0;

  if (variantCount === 0 && addonCount === 0) return 'Plain item';
  if (variantCount > 0 && addonCount === 0) return 'With variants';
  if (variantCount === 0 && addonCount > 0) return 'With add-ons';
  return 'With variants and add-ons';
};

export const formatImportErrors = (errors) => {
  if (!errors?.length) return '';
  return errors.map((entry) => `Row ${entry.line}: ${entry.message}`).join('\n');
};

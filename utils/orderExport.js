import { Share, Platform } from 'react-native';
import {
  buildExportLogoHtml,
  getExportLogoCss,
  resolveShopLogo,
} from './shopLogo';

async function downloadOnWeb(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function filterOrdersByDateRange(orders, fromDate, toDate) {
  const start = startOfDay(fromDate).getTime();
  const end = endOfDay(toDate).getTime();

  return (orders || []).filter((order) => {
    const ts = new Date(order?.timestamp || 0).getTime();
    return ts >= start && ts <= end;
  });
}

function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ordersToCsv(orders, shopName = '') {
  const summaryHeaders = [
    'Shop',
    'Date',
    'Order ID',
    'Customer Phone',
    'Items Count',
    'Order Total (Rs)',
  ];

  const detailHeaders = [
    'Date',
    'Order ID',
    'Item',
    'Variant',
    'Add-ons',
    'Qty',
    'Unit Price (Rs)',
    'Line Total (Rs)',
    'Order Total (Rs)',
  ];

  const summaryRows = [];
  const detailRows = [];

  orders.forEach((order) => {
    const date = new Date(order.timestamp).toLocaleString();
    const items = order.items || [];
    const orderId = order.orderId || order.id;

    summaryRows.push(
      [
        escapeCsv(shopName),
        escapeCsv(date),
        escapeCsv(orderId),
        escapeCsv(order.customerPhone || ''),
        order.itemCount,
        Number(order.totalAmount || 0).toFixed(2),
      ].join(',')
    );

    items.forEach((line) => {
      detailRows.push(
        [
          escapeCsv(date),
          escapeCsv(orderId),
          escapeCsv(line.name),
          escapeCsv(line.selectedVariant?.name || '-'),
          escapeCsv(line.selectedAddons?.map((a) => a.name).join(', ') || '-'),
          line.quantity,
          Number(line.unitPrice || 0).toFixed(2),
          Number(line.totalPrice || 0).toFixed(2),
          Number(order.totalAmount || 0).toFixed(2),
        ].join(',')
      );
    });
  });

  const { totalRevenue, totalItems, orderCount } = getExportSummary(orders);

  return [
    '\uFEFFORDER SUMMARY',
    summaryHeaders.map(escapeCsv).join(','),
    ...summaryRows,
    '',
    'ORDER DETAILS',
    detailHeaders.map(escapeCsv).join(','),
    ...detailRows,
    '',
    escapeCsv('TOTALS'),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    totalItems,
    totalRevenue.toFixed(2),
    '',
    escapeCsv(`Orders: ${orderCount}`),
  ].join('\n');
}

export function ordersToHtmlTable(
  orders,
  shopName = '',
  fromLabel = '',
  toLabel = '',
  { shopLogoUri, shopLogoStyle, fssaiNumber = '', gstinNumber = '' } = {}
) {
  const { totalRevenue, totalItems, orderCount } = getExportSummary(orders);
  const logo = resolveShopLogo({ shopLogoUri, shopLogoStyle });
  const logoHtml = buildExportLogoHtml(logo, shopName || 'Shop');

  const summaryRows = orders
    .map((order) => {
      const date = new Date(order.timestamp).toLocaleString();
      const orderId = order.orderId || order.id;
      return `<tr>
        <td>${escapeHtml(shopName)}</td>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(orderId)}</td>
        <td>${escapeHtml(order.customerPhone || '-')}</td>
        <td>${order.itemCount}</td>
        <td>Rs ${Number(order.totalAmount || 0).toFixed(2)}</td>
      </tr>`;
    })
    .join('');

  const detailRows = orders
    .flatMap((order) => {
      const date = new Date(order.timestamp).toLocaleString();
      const orderId = order.orderId || order.id;
      return (order.items || []).map(
        (line) => `<tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(orderId)}</td>
          <td>${escapeHtml(line.name)}</td>
          <td>${escapeHtml(line.selectedVariant?.name || '-')}</td>
          <td>${escapeHtml(line.selectedAddons?.map((a) => a.name).join(', ') || '-')}</td>
          <td>${line.quantity}</td>
          <td>Rs ${Number(line.unitPrice || 0).toFixed(2)}</td>
          <td>Rs ${Number(line.totalPrice || 0).toFixed(2)}</td>
          <td>Rs ${Number(order.totalAmount || 0).toFixed(2)}</td>
        </tr>`
      );
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(shopName || 'POS')} Orders</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; background: #f8f9fa; }
    h1, h2 { color: #1a1a2e; }
    .meta { color: #6c757d; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #fff; }
    th, td { border: 1px solid #dee2e6; padding: 10px 8px; text-align: left; font-size: 13px; }
    th { background: #1a1a2e; color: #fff; }
    tr:nth-child(even) { background: #f8f9fa; }
    .totals { font-weight: bold; background: #fff0f3; }
    .report-header { text-align: center; margin-bottom: 8px; }
    .shop-meta { text-align: center; color: #495057; font-size: 12px; margin-bottom: 16px; }
    ${getExportLogoCss()}
  </style>
</head>
<body>
  ${logoHtml}
  <div class="report-header">
    <h1>${escapeHtml(shopName || 'POS')} — Order Report</h1>
  </div>
  ${
    fssaiNumber
      ? `<div class="shop-meta">FSSAI No: ${escapeHtml(fssaiNumber)}</div>`
      : ''
  }
  ${
    gstinNumber
      ? `<div class="shop-meta">GSTIN: ${escapeHtml(gstinNumber)}</div>`
      : ''
  }
  <p class="meta">Period: ${escapeHtml(fromLabel)} to ${escapeHtml(toLabel)}</p>

  <h2>Order Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Shop</th><th>Date</th><th>Order ID</th><th>Customer Phone</th><th>Items</th><th>Total (Rs)</th>
      </tr>
    </thead>
    <tbody>${summaryRows}</tbody>
  </table>

  <h2>Order Details</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Order ID</th><th>Item</th><th>Variant</th><th>Add-ons</th>
        <th>Qty</th><th>Unit Price</th><th>Line Total</th><th>Order Total</th>
      </tr>
    </thead>
    <tbody>${detailRows}</tbody>
    <tfoot>
      <tr class="totals">
        <td colspan="5">TOTALS (${orderCount} orders)</td>
        <td>${totalItems}</td>
        <td colspan="2"></td>
        <td>Rs ${totalRevenue.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

export async function shareWithFile(content, fileName, mimeType, dialogTitle) {
  if (Platform.OS === 'web') {
    downloadOnWeb(content, fileName, mimeType);
    return;
  }

  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');

  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle });
    return;
  }

  await Share.share({ message: content, title: dialogTitle });
}

async function sharePdfReport(html, fileName, dialogTitle) {
  if (Platform.OS === 'web') {
    const Print = await import('expo-print');
    const { uri } = await Print.printToFileAsync({ html });
    const response = await fetch(uri);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const Print = await import('expo-print');
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  const destUri = `${FileSystem.cacheDirectory}${fileName}`;
  const existing = await FileSystem.getInfoAsync(destUri);
  if (existing.exists) {
    await FileSystem.deleteAsync(destUri, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: uri, to: destUri });

  const pdfInfo = await FileSystem.getInfoAsync(destUri);
  if (!pdfInfo.exists || Number(pdfInfo.size || 0) <= 0) {
    throw new Error('pdf_missing_or_empty');
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
    return;
  }

  await Share.share({ url: destUri, title: dialogTitle });
}

export async function shareOrderExport({
  orders,
  shopName,
  fromDate,
  toDate,
  format = 'csv',
  shopLogoUri,
  shopLogoStyle,
  fssaiNumber,
  gstinNumber,
}) {
  const fromLabel = fromDate.toLocaleDateString();
  const toLabel = toDate.toLocaleDateString();
  const stamp = `${fromDate.toISOString().slice(0, 10)}_to_${toDate.toISOString().slice(0, 10)}`;
  const logoOptions = { shopLogoUri, shopLogoStyle, fssaiNumber, gstinNumber };
  const dialogTitle = `Export Orders (${fromLabel} – ${toLabel})`;

  if (format === 'pdf') {
    const html = ordersToHtmlTable(orders, shopName, fromLabel, toLabel, logoOptions);
    const fileName = `orders_${stamp}.pdf`;
    await sharePdfReport(html, fileName, dialogTitle);
    return;
  }

  if (format === 'html') {
    const html = ordersToHtmlTable(orders, shopName, fromLabel, toLabel, logoOptions);
    const fileName = `orders_${stamp}.html`;
    await shareWithFile(html, fileName, 'text/html', dialogTitle);
    return;
  }

  const content = ordersToCsv(orders, shopName);
  const fileName = `orders_${stamp}.csv`;

  await shareWithFile(content, fileName, 'text/csv', dialogTitle);
}

export function getExportSummary(orders) {
  const list = orders || [];
  const totalRevenue = list.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const totalItems = list.reduce((sum, o) => sum + Number(o.itemCount || 0), 0);
  return { orderCount: list.length, totalRevenue, totalItems };
}

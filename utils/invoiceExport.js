import { Platform, Share } from 'react-native';
import { isValidCustomerPhone, normalizePhoneNumber, sendViaWhatsApp } from './billShare';
import { TABLE_COLORS, isRunningTableOrder } from './tableManagement';
import { materializeUpiQrFile, normalizeUpiQrUri } from './upiQr';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInvoiceDate(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return {
    dateLabel: date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    timeLabel: date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function formatLineDescription(line) {
  let desc = line.name || 'Item';
  if (line.selectedVariant) {
    desc += ` (${line.selectedVariant.name})`;
  }
  if (line.selectedAddons?.length > 0) {
    desc += ` + ${line.selectedAddons.map((a) => a.name).join(', ')}`;
  }
  return desc;
}

function sanitizeFileName(value) {
  return String(value || 'order').replace(/[^\w.-]+/g, '_');
}

export function orderToInvoiceHtml({
  items = [],
  totalAmount = 0,
  subtotalAmount,
  cartSubtotal,
  discountAmount = 0,
  offerApplied = false,
  offerName = '',
  taxEnabled = false,
  cgstAmount = 0,
  sgstAmount = 0,
  timestamp,
  orderId = '',
  shopName = '',
  fssaiNumber = '',
  gstinNumber = '',
  customerPhone = '',
  title = 'Tax Invoice',
  isTableOrder = false,
  tableNumber = '',
  isPaid = false,
}) {
  const { dateLabel, timeLabel } = formatInvoiceDate(timestamp);
  const displayShop = shopName || 'POS';
  const subtotal = subtotalAmount !== undefined ? Number(subtotalAmount) : Number(totalAmount);
  const discount = Number(discountAmount) || 0;
  const discountLabel = offerName ? `Discount (${offerName})` : 'Discount';
  const runningTable = isRunningTableOrder({ isTableOrder, isPaid });
  const billTheme = runningTable
    ? {
        bodyBg: TABLE_COLORS.runningTableBill.bodyBg,
        accent: TABLE_COLORS.runningTableBill.accent,
        headerBg: TABLE_COLORS.runningTableBill.headerBg,
        totalBg: TABLE_COLORS.runningTableBill.totalBg,
        border: TABLE_COLORS.runningTableBill.border,
        headerBorder: TABLE_COLORS.runningTableBill.accent,
      }
    : {
        bodyBg: '#fff',
        accent: '#e94560',
        headerBg: '#1a1a2e',
        totalBg: '#fff0f3',
        border: '#dee2e6',
        headerBorder: '#1a1a2e',
      };
  const discountRow =
    offerApplied && discount > 0
      ? `<tr>
        <td colspan="4" style="text-align:right;">${escapeHtml(discountLabel)}</td>
        <td>- Rs ${discount.toFixed(2)}</td>
      </tr>`
      : '';
  const preTaxSubtotal =
    cartSubtotal !== undefined && Number(cartSubtotal) > 0 ? Number(cartSubtotal) : subtotal + discount;
  const itemSubtotalRow =
    offerApplied && discount > 0
      ? `<tr>
        <td colspan="4" style="text-align:right;">Items subtotal</td>
        <td>Rs ${preTaxSubtotal.toFixed(2)}</td>
      </tr>`
      : '';
  const rows = (items || [])
    .map(
      (line, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(formatLineDescription(line))}</td>
        <td>${line.quantity}</td>
        <td>Rs ${Number(line.unitPrice || 0).toFixed(2)}</td>
        <td>Rs ${Number(line.totalPrice || 0).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const taxRows = taxEnabled
    ? `${itemSubtotalRow}${discountRow}<tr>
        <td colspan="4" style="text-align:right;">Subtotal</td>
        <td>Rs ${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align:right;">CGST @ 2.5%</td>
        <td>Rs ${Number(cgstAmount || 0).toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align:right;">SGST @ 2.5%</td>
        <td>Rs ${Number(sgstAmount || 0).toFixed(2)}</td>
      </tr>`
    : offerApplied && discount > 0
      ? `${itemSubtotalRow}${discountRow}`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(displayShop)} Invoice</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a2e;
      padding: 24px;
      margin: 0;
      background: ${billTheme.bodyBg};
    }
    .header {
      text-align: center;
      border-bottom: 2px solid ${billTheme.headerBorder};
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .shop-name {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 6px;
      letter-spacing: 0.5px;
    }
    .invoice-title {
      font-size: 14px;
      font-weight: 700;
      color: ${billTheme.accent};
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .table-banner {
      margin-top: 10px;
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: ${TABLE_COLORS.historyTableOrder.backgroundColor};
      border: 1px solid ${TABLE_COLORS.historyTableOrder.borderColor};
      color: ${TABLE_COLORS.runningTableBill.accent};
      font-size: 12px;
      font-weight: 800;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #495057;
    }
    .meta-block { flex: 1; }
    .meta-label {
      font-size: 11px;
      font-weight: 700;
      color: #868e96;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid ${billTheme.border};
      padding: 10px 8px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background: ${billTheme.headerBg};
      color: #fff;
      font-weight: 700;
    }
    tr:nth-child(even) { background: ${runningTable ? '#fff7fb' : '#f8f9fa'}; }
    .total-row td {
      font-size: 15px;
      font-weight: 800;
      background: ${billTheme.totalBg};
      color: ${billTheme.accent};
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 13px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="shop-name">${escapeHtml(displayShop)}</h1>
    <div class="invoice-title">${escapeHtml(runningTable ? 'Table Bill (Running)' : title)}</div>
    ${
      isTableOrder && tableNumber
        ? `<div class="table-banner">Table ${escapeHtml(tableNumber)}${runningTable ? ' · Occupied' : ''}</div>`
        : ''
    }
    ${
      fssaiNumber
        ? `<div style="font-size:12px;color:#495057;margin-top:6px;">FSSAI No: ${escapeHtml(fssaiNumber)}</div>`
        : ''
    }
    ${
      gstinNumber
        ? `<div style="font-size:12px;color:#495057;margin-top:6px;">GSTIN: ${escapeHtml(gstinNumber)}</div>`
        : ''
    }
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Order ID</div>
      <div>#${escapeHtml(orderId || '-')}</div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Date &amp; Time</div>
      <div>${escapeHtml(dateLabel)} · ${escapeHtml(timeLabel)}</div>
    </div>
    ${
      isTableOrder && tableNumber
        ? `<div class="meta-block">
      <div class="meta-label">Table</div>
      <div>${escapeHtml(tableNumber)}</div>
    </div>`
        : ''
    }
    ${
      customerPhone
        ? `<div class="meta-block">
      <div class="meta-label">Customer</div>
      <div>${escapeHtml(customerPhone)}</div>
    </div>`
        : ''
    }
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows ||
        `<tr><td colspan="5" style="text-align:center;color:#868e96;">No items listed</td></tr>`
      }
      ${taxRows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right;">${taxEnabled ? 'Grand Total' : 'Total Amount'}</td>
        <td>Rs ${Number(totalAmount || 0).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">Thank you for your purchase. Visit us again.</div>
</body>
</html>`;
}

async function downloadPdfOnWeb(pdfBytes, fileName) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function sharePdfOnWeb(pdfBytes, fileName, dialogTitle) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: dialogTitle,
        });
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  await downloadPdfOnWeb(pdfBytes, fileName);
}

function buildWebInvoicePdf({
  items = [],
  totalAmount = 0,
  subtotalAmount,
  taxEnabled = false,
  cgstAmount = 0,
  sgstAmount = 0,
  timestamp,
  orderId = '',
  shopName = '',
  fssaiNumber = '',
  gstinNumber = '',
  customerPhone = '',
  title = 'Tax Invoice',
  isTableOrder = false,
  tableNumber = '',
  isPaid = false,
}) {
  const { jsPDF } = require('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const { dateLabel, timeLabel } = formatInvoiceDate(timestamp);
  const displayShop = shopName || 'POS';
  const subtotal = subtotalAmount !== undefined ? Number(subtotalAmount) : Number(totalAmount);
  const runningTable = isRunningTableOrder({ isTableOrder, isPaid });
  const accentRgb = runningTable ? [219, 39, 119] : [233, 69, 96];
  const headerRgb = runningTable ? [157, 23, 77] : [26, 26, 46];
  const billTitle = runningTable ? 'TABLE BILL (RUNNING)' : title.toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(displayShop, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(11);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.text(billTitle, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(26, 26, 46);
  y += 6;

  if (isTableOrder && tableNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.text(
      `Table ${tableNumber}${runningTable ? ' · Occupied' : ''}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    doc.setTextColor(26, 26, 46);
    y += 6;
  }

  if (fssaiNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`FSSAI No: ${fssaiNumber}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  if (gstinNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`GSTIN: ${gstinNumber}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  y += 4;

  doc.setDrawColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Order ID: #${orderId || '-'}`, margin, y);
  doc.text(`${dateLabel} · ${timeLabel}`, pageWidth - margin, y, { align: 'right' });
  y += 6;

  if (isTableOrder && tableNumber) {
    doc.text(`Table: ${tableNumber}`, margin, y);
    y += 6;
  }

  if (customerPhone) {
    doc.text(`Customer: ${customerPhone}`, margin, y);
    y += 6;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Item', margin + 2, y + 5.5);
  doc.text('Qty', margin + 98, y + 5.5);
  doc.text('Rate', margin + 112, y + 5.5);
  doc.text('Amount', margin + 138, y + 5.5);
  y += 10;
  doc.setTextColor(26, 26, 46);
  doc.setFont('helvetica', 'normal');

  const lineHeight = 6;
  (items || []).forEach((line, index) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }

    const description = formatLineDescription(line);
    const wrapped = doc.splitTextToSize(description, 88);
    const rowHeight = Math.max(wrapped.length, 1) * lineHeight;

    doc.text(String(index + 1) + '.', margin, y);
    doc.text(wrapped, margin + 6, y);
    doc.text(String(line.quantity), margin + 100, y);
    doc.text(`Rs ${Number(line.unitPrice || 0).toFixed(2)}`, margin + 112, y);
    doc.text(`Rs ${Number(line.totalPrice || 0).toFixed(2)}`, margin + 138, y);
    y += rowHeight + 2;
  });

  y += 4;
  doc.setDrawColor(222, 226, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);

  if (taxEnabled) {
    doc.text(`Subtotal: Rs ${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 6;
    doc.text(`CGST @ 2.5%: Rs ${Number(cgstAmount || 0).toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 6;
    doc.text(`SGST @ 2.5%: Rs ${Number(sgstAmount || 0).toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.text(
    `${taxEnabled ? 'Grand Total' : 'Total'}: Rs ${Number(totalAmount || 0).toFixed(2)}`,
    pageWidth - margin,
    y,
    {
      align: 'right',
    }
  );
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text('Thank you for your purchase. Visit us again.', pageWidth / 2, y, {
    align: 'center',
  });

  return doc;
}

async function createNativeInvoicePdfUri(invoiceData) {
  const html = orderToInvoiceHtml(invoiceData);
  const Print = await import('expo-print');
  const FileSystem = await import('expo-file-system/legacy');
  const { uri } = await Print.printToFileAsync({ html });
  const safeOrderId = sanitizeFileName(invoiceData.orderId || 'order');
  const destUri = `${FileSystem.cacheDirectory}invoice_${safeOrderId}.pdf`;
  const existing = await FileSystem.getInfoAsync(destUri);
  if (existing.exists) {
    await FileSystem.deleteAsync(destUri, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: uri, to: destUri });

  const pdfInfo = await FileSystem.getInfoAsync(destUri);
  if (!pdfInfo.exists || Number(pdfInfo.size || 0) <= 0) {
    throw new Error('pdf_missing_or_empty');
  }

  return destUri;
}

const WHATSAPP_PACKAGES = ['com.whatsapp', 'com.whatsapp.w4b'];

async function sharePdfViaWhatsAppAndroid(fileUri, customerPhone) {
  const phone = normalizePhoneNumber(customerPhone);
  if (!phone) return false;

  const FileSystem = await import('expo-file-system/legacy');
  const IntentLauncher = await import('expo-intent-launcher');

  let contentUri = fileUri;
  if (FileSystem.getContentUriAsync) {
    try {
      contentUri = await FileSystem.getContentUriAsync(fileUri);
    } catch {
      // Fall back to file URI if content URI is unavailable.
    }
  }

  for (const packageName of WHATSAPP_PACKAGES) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
        packageName,
        type: 'application/pdf',
        flags: 1,
        extra: {
          'android.intent.extra.STREAM': contentUri,
          jid: `${phone}@s.whatsapp.net`,
        },
      });
      return true;
    } catch {
      // Try WhatsApp Business or fall back to the system share sheet.
    }
  }

  return false;
}

async function sharePdfFileUri(uri, dialogTitle, { deliverViaWhatsApp = false, customerPhone = '' } = {}) {
  const Sharing = await import('expo-sharing');
  const FileSystem = await import('expo-file-system/legacy');
  let shareUri = uri;

  const validatePdf = async (targetUri) => {
    const info = await FileSystem.getInfoAsync(targetUri);
    return {
      exists: !!info.exists,
      size: Number(info.size || 0),
      uri: targetUri,
    };
  };

  let pdfInfo = await validatePdf(shareUri);
  if (!pdfInfo.exists || pdfInfo.size <= 0) {
    throw new Error('pdf_missing_or_empty');
  }

  if (
    deliverViaWhatsApp &&
    Platform.OS === 'android' &&
    isValidCustomerPhone(customerPhone)
  ) {
    const whatsAppShared = await sharePdfViaWhatsAppAndroid(shareUri, customerPhone);
    if (whatsAppShared) {
      return true;
    }
  }

  const sharingAvailable = await Sharing.isAvailableAsync();

  const shareWithExpo = async (targetUri) => {
    if (!sharingAvailable) {
      await Share.share({ url: targetUri, title: dialogTitle });
      return;
    }

    await Sharing.shareAsync(targetUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
  };

  try {
    await shareWithExpo(shareUri);
    return true;
  } catch (error) {
    const fileName = shareUri.split('/').pop() || 'invoice.pdf';
    const fallbackUri = `${FileSystem.documentDirectory}${fileName}`;
    const existing = await FileSystem.getInfoAsync(fallbackUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(fallbackUri, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: shareUri, to: fallbackUri });
    shareUri = fallbackUri;
    pdfInfo = await validatePdf(shareUri);
    if (!pdfInfo.exists || pdfInfo.size <= 0) {
      throw error;
    }
    await shareWithExpo(shareUri);
    return true;
  }
}

function appendWebsiteLinks(lines, invoiceData) {
  if (!invoiceData?.includeWebsitesInWhatsApp) return;
  const shopWebsite = String(invoiceData.shopWebsite || '').trim();
  const menuWebsite = String(invoiceData.menuWebsite || '').trim();
  if (!shopWebsite && !menuWebsite) return;

  lines.push('');
  if (shopWebsite) lines.push(`Shop website: ${shopWebsite}`);
  if (menuWebsite) lines.push(`Menu: ${menuWebsite}`);
}

function buildWhatsAppInvoiceText(invoiceData) {
  const {
    items = [],
    totalAmount,
    subtotalAmount,
    cartSubtotal,
    discountAmount = 0,
    offerApplied = false,
    offerName = '',
    taxEnabled = false,
    cgstAmount = 0,
    sgstAmount = 0,
    timestamp,
    orderId,
    shopName,
    isTableOrder = false,
    tableNumber = '',
    isPaid = false,
  } = invoiceData;

  const { dateLabel, timeLabel } = formatInvoiceDate(timestamp);
  const runningTable = isRunningTableOrder({ isTableOrder, isPaid });
  const lines = [
    shopName ? `*${shopName}*` : '*Invoice*',
    runningTable ? '*Table Bill (Running)*' : '',
    `Order ID: ${orderId || '-'}`,
    isTableOrder && tableNumber ? `Table: ${tableNumber}` : '',
    `${dateLabel} · ${timeLabel}`,
    '',
  ].filter(Boolean);

  (items || []).slice(0, 10).forEach((line, index) => {
    lines.push(
      `${index + 1}. ${formatLineDescription(line)} x${line.quantity || 1} — Rs ${Number(line.totalPrice || 0).toFixed(2)}`
    );
  });

  if ((items || []).length > 10) {
    lines.push(`...and ${items.length - 10} more item(s)`);
  }

  lines.push('');
  const discount = Number(discountAmount) || 0;
  if (offerApplied && discount > 0) {
    const preTaxSubtotal =
      cartSubtotal !== undefined && Number(cartSubtotal) > 0
        ? Number(cartSubtotal)
        : Number(subtotalAmount || totalAmount) + discount;
    lines.push(`Items subtotal: Rs ${preTaxSubtotal.toFixed(2)}`);
    const discountLabel = offerName ? `Discount (${offerName})` : 'Discount';
    lines.push(`${discountLabel}: - Rs ${discount.toFixed(2)}`);
  }
  if (taxEnabled) {
    const subtotal = subtotalAmount !== undefined ? Number(subtotalAmount) : Number(totalAmount);
    lines.push(`Subtotal: Rs ${subtotal.toFixed(2)}`);
    lines.push(`CGST @ 2.5%: Rs ${Number(cgstAmount || 0).toFixed(2)}`);
    lines.push(`SGST @ 2.5%: Rs ${Number(sgstAmount || 0).toFixed(2)}`);
    lines.push(`*Grand Total: Rs ${Number(totalAmount || 0).toFixed(2)}*`);
  } else {
    lines.push(`*Total: Rs ${Number(totalAmount || 0).toFixed(2)}*`);
  }
  lines.push('', 'Thank you for your purchase!');
  if (normalizeUpiQrUri(invoiceData?.upiQrUri)) {
    lines.push('', 'Pay via UPI — scan the QR code image shared with this bill.');
  }
  appendWebsiteLinks(lines, invoiceData);

  return lines.join('\n');
}

async function shareImageViaWhatsAppAndroid(fileUri, mimeType, caption, customerPhone) {
  const phone = normalizePhoneNumber(customerPhone);
  if (!phone) return false;

  const FileSystem = await import('expo-file-system/legacy');
  const IntentLauncher = await import('expo-intent-launcher');

  let contentUri = fileUri;
  if (FileSystem.getContentUriAsync) {
    try {
      contentUri = await FileSystem.getContentUriAsync(fileUri);
    } catch {
      // keep file URI
    }
  }

  for (const packageName of WHATSAPP_PACKAGES) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
        packageName,
        type: mimeType || 'image/jpeg',
        flags: 1,
        extra: {
          'android.intent.extra.STREAM': contentUri,
          'android.intent.extra.TEXT': String(caption || '').slice(0, 2800),
          jid: `${phone}@s.whatsapp.net`,
        },
      });
      return true;
    } catch {
      // try next package
    }
  }
  return false;
}

/**
 * Share UPI QR photo. WhatsApp text links (wa.me) cannot attach images —
 * on Android we open WhatsApp with the image + caption; otherwise system share.
 */
export async function shareUpiQrOnWhatsApp({
  upiQrUri,
  caption = '',
  customerPhone = '',
  dialogTitle = 'Share UPI QR',
} = {}) {
  const dataUri = normalizeUpiQrUri(upiQrUri);
  if (!dataUri) return { shared: false, reason: 'no_qr' };

  if (Platform.OS === 'web') {
    // Web: open image in a new tab; user can save/forward manually.
    try {
      const win = window.open();
      if (win) {
        win.document.write(
          `<title>${dialogTitle}</title><img src="${dataUri}" style="max-width:100%;height:auto" alt="UPI QR" />`
        );
      }
      return { shared: true, method: 'web_preview' };
    } catch {
      return { shared: false, reason: 'web_failed' };
    }
  }

  const file = await materializeUpiQrFile(dataUri);

  if (Platform.OS === 'android' && isValidCustomerPhone(customerPhone)) {
    const sent = await shareImageViaWhatsAppAndroid(
      file.uri,
      file.mimeType,
      caption,
      customerPhone
    );
    if (sent) return { shared: true, method: 'whatsapp_intent' };
  }

  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType || 'image/jpeg',
      dialogTitle,
    });
    return { shared: true, method: 'share_sheet' };
  }

  await Share.share({ url: file.uri, message: caption, title: dialogTitle });
  return { shared: true, method: 'share_api' };
}

export async function shareWhatsAppInvoiceText(invoiceData) {
  const phone = invoiceData?.customerPhone;
  if (!isValidCustomerPhone(phone)) {
    throw new Error('invalid_phone');
  }

  const text = buildWhatsAppInvoiceText(invoiceData);
  const upiQrUri = normalizeUpiQrUri(invoiceData?.upiQrUri);

  // Prefer sending QR image with bill caption (WhatsApp accepts image + text on Android).
  if (upiQrUri) {
    try {
      const imageShare = await shareUpiQrOnWhatsApp({
        upiQrUri,
        caption: text,
        customerPhone: phone,
        dialogTitle: 'Share bill + UPI QR',
      });
      if (imageShare.shared && imageShare.method === 'whatsapp_intent') {
        return { textSent: true, qrShared: true, method: imageShare.method };
      }
      // Share sheet used — still open chat with text so customer gets the bill words.
      await sendViaWhatsApp(text, phone);
      return { textSent: true, qrShared: imageShare.shared, method: imageShare.method };
    } catch (error) {
      console.warn('UPI QR WhatsApp share failed, falling back to text:', error);
    }
  }

  await sendViaWhatsApp(text, phone);
  return { textSent: true, qrShared: false };
}

export async function shareOrderInvoicePdf({
  items,
  totalAmount,
  subtotalAmount,
  cartSubtotal,
  discountAmount = 0,
  offerApplied = false,
  offerName = '',
  taxEnabled = false,
  cgstAmount = 0,
  sgstAmount = 0,
  timestamp,
  orderId,
  shopName,
  fssaiNumber = '',
  gstinNumber = '',
  customerPhone = '',
  shopWebsite = '',
  menuWebsite = '',
  includeWebsitesInWhatsApp = false,
  title = 'Tax Invoice',
  openWhatsAppChat = true,
  sharePdf = true,
  isTableOrder = false,
  tableNumber = '',
  isPaid = false,
}) {
  const safeOrderId = sanitizeFileName(orderId || 'order');
  const fileName = `invoice_${safeOrderId}.pdf`;
  const dialogTitle = `Invoice #${orderId || safeOrderId}`;
  const invoiceData = {
    items,
    totalAmount,
    subtotalAmount,
    cartSubtotal,
    discountAmount,
    offerApplied,
    offerName,
    taxEnabled,
    cgstAmount,
    sgstAmount,
    timestamp,
    orderId,
    shopName,
    fssaiNumber,
    gstinNumber,
    customerPhone,
    shopWebsite,
    menuWebsite,
    includeWebsitesInWhatsApp,
    title,
    isTableOrder,
    tableNumber,
    isPaid,
  };

  if (Platform.OS === 'web') {
    const doc = buildWebInvoicePdf(invoiceData);
    const pdfBytes = doc.output('arraybuffer');
    await sharePdfOnWeb(pdfBytes, fileName, dialogTitle);
    return { whatsAppSent: false, pdfShared: true };
  }

  const result = { whatsAppSent: false, pdfShared: false };
  const whatsAppText = buildWhatsAppInvoiceText(invoiceData);

  if (openWhatsAppChat && isValidCustomerPhone(customerPhone)) {
    try {
      await sendViaWhatsApp(whatsAppText, customerPhone);
      result.whatsAppSent = true;
    } catch (error) {
      console.warn('WhatsApp invoice text failed:', error);
    }
  }

  if (!sharePdf) {
    return result;
  }

  try {
    const uri = await createNativeInvoicePdfUri(invoiceData);
    await sharePdfFileUri(uri, dialogTitle, {
      deliverViaWhatsApp: openWhatsAppChat && isValidCustomerPhone(customerPhone),
      customerPhone,
    });
    result.pdfShared = true;
  } catch (error) {
    console.warn('PDF share failed:', error);
    if (!result.whatsAppSent) {
      throw error;
    }
  }

  return result;
}

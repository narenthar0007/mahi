/* eslint-disable no-console */
/**
 * NAM bill — Product Demo deck
 * Run: npm run ppt:demo
 */
const path = require('path');
const fs = require('fs');

const pptxgen = require('pptxgenjs');

const ROOT = process.cwd();
const ASSETS = {
  logo: path.join(ROOT, 'assets', 'nam-bill-logo.png'),
  billing: path.join(ROOT, 'website', 'assets', 'ppt', 'shot-billing.png'),
  inventory: path.join(ROOT, 'website', 'assets', 'ppt', 'shot-inventory.png'),
  history: path.join(ROOT, 'website', 'assets', 'ppt', 'shot-history.png'),
};

const BRAND = {
  bg: '040B14',
  panel: '0C1524',
  ink: '102A44',
  text: '1A2332',
  muted: '5C6B7A',
  white: 'FFFFFF',
  soft: 'F4F7FA',
  accent: 'C9A227',
  accentHot: 'E8C547',
  card: 'FFFFFF',
  cardBorder: 'D9E2EC',
  phoneBezel: '0A1624',
};

function assertAssets() {
  Object.entries(ASSETS).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing PPT asset (${key}): ${filePath}`);
    }
  });
}

function addTopBar(slide, title) {
  slide.background = { color: BRAND.soft };
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 0.72, fill: { color: BRAND.bg } });
  slide.addImage({ path: ASSETS.logo, x: 0.35, y: 0.12, w: 0.48, h: 0.48 });
  slide.addText(title, {
    x: 1.0,
    y: 0.18,
    w: 10.2,
    h: 0.4,
    fontFace: 'Aptos Display',
    fontSize: 20,
    color: BRAND.white,
    bold: true,
  });
  slide.addText('NAM bill', {
    x: 11.0,
    y: 0.2,
    w: 1.8,
    h: 0.35,
    fontFace: 'Aptos',
    fontSize: 12,
    color: BRAND.accent,
    align: 'right',
    bold: true,
  });
  slide.addShape('rect', { x: 0, y: 0.72, w: 13.333, h: 0.05, fill: { color: BRAND.accent } });
}

function addCard(slide, { x, y, w, h, title, body, fill }) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    fill: { color: fill || BRAND.card },
    line: { color: BRAND.cardBorder, width: 1 },
    radius: 10,
  });
  if (title) {
    slide.addText(title, {
      x: x + 0.28,
      y: y + 0.22,
      w: w - 0.56,
      h: 0.38,
      fontFace: 'Aptos Display',
      fontSize: 15,
      color: BRAND.text,
      bold: true,
    });
  }
  if (body) {
    slide.addText(body, {
      x: x + 0.28,
      y: y + (title ? 0.68 : 0.28),
      w: w - 0.56,
      h: h - (title ? 0.9 : 0.55),
      fontFace: 'Aptos',
      fontSize: 13,
      color: BRAND.muted,
      valign: 'top',
    });
  }
}

function addPhoneShot(slide, { x, y, w, h, imagePath, label, labelColor }) {
  const pad = 0.07;
  const labelH = label ? 0.34 : 0;
  const frameH = h - labelH;
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h: frameH,
    fill: { color: BRAND.phoneBezel },
    line: { color: '1A2C40', width: 1 },
    radius: 14,
  });
  slide.addImage({
    path: imagePath,
    x: x + pad,
    y: y + pad,
    w: w - pad * 2,
    h: frameH - pad * 2,
  });
  if (label) {
    slide.addText(label, {
      x,
      y: y + frameH + 0.04,
      w,
      h: 0.28,
      fontFace: 'Aptos',
      fontSize: 12,
      color: labelColor || BRAND.ink,
      align: 'center',
      bold: true,
    });
  }
}

function bullets(lines) {
  return lines.map((t) => `• ${t}`).join('\n');
}

function buildDeck() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'NAM bill';
  pptx.company = 'NAM bill';
  pptx.subject = 'Product demo deck';
  pptx.title = 'NAM bill — Product Demo';

  // 1 — Title
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: BRAND.accent } });
    s.addImage({ path: ASSETS.logo, x: 0.85, y: 0.85, w: 1.25, h: 1.25 });
    s.addText('PRODUCT DEMO', {
      x: 2.35,
      y: 1.05,
      w: 6.0,
      h: 0.3,
      fontFace: 'Aptos',
      fontSize: 13,
      color: BRAND.accent,
      bold: true,
      charSpacing: 3,
    });
    s.addText('NAM bill', {
      x: 2.35,
      y: 1.4,
      w: 6.0,
      h: 0.65,
      fontFace: 'Aptos Display',
      fontSize: 46,
      color: BRAND.white,
      bold: true,
    });
    s.addText('Fast POS billing for shops & cafés', {
      x: 0.85,
      y: 2.4,
      w: 7.2,
      h: 0.4,
      fontFace: 'Aptos Display',
      fontSize: 20,
      color: 'A8B8C8',
    });
    s.addText(
      'Inventory  ·  Billing  ·  GST  ·  WhatsApp PDF invoices\nOrder history  ·  Sales reports  ·  Android · Web · Windows',
      {
        x: 0.85,
        y: 3.0,
        w: 7.0,
        h: 0.8,
        fontFace: 'Aptos',
        fontSize: 15,
        color: '8A9AAB',
      }
    );
    addPhoneShot(s, {
      x: 8.55,
      y: 1.0,
      w: 3.55,
      h: 5.65,
      imagePath: ASSETS.billing,
      label: 'Live billing UI',
      labelColor: BRAND.accentHot,
    });
    s.addShape('roundRect', {
      x: 0.85,
      y: 5.55,
      w: 7.2,
      h: 1.2,
      fill: { color: BRAND.panel },
      radius: 12,
    });
    s.addText('Demo shop: Naren Cafe (sample data)\nWalkthrough: Inventory → Billing → Invoice → History → Export', {
      x: 1.1,
      y: 5.8,
      w: 6.7,
      h: 0.8,
      fontFace: 'Aptos',
      fontSize: 14,
      color: 'DDE6EF',
    });
  }

  // 2 — Agenda
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Agenda');
    const items = [
      ['01', 'Problem', 'Why paper billing fails at the counter'],
      ['02', 'Product', 'What NAM bill does in one suite'],
      ['03', 'UI tour', 'Inventory, Billing, History screens'],
      ['04', 'Live flow', '5–7 minute demo checklist'],
      ['05', 'Reports', 'Exports owners & accountants use'],
      ['06', 'Go-live', 'Platforms, license, next steps'],
    ];
    items.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addCard(s, {
        x: 0.7 + col * 4.15,
        y: 1.4 + row * 2.7,
        w: 3.95,
        h: 2.4,
        title: `${item[0]}  ${item[1]}`,
        body: item[2],
      });
    });
  }

  // 3 — Problem
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Why this product');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 5.9,
      h: 5.7,
      title: 'Common pain points',
      body: bullets([
        'Manual totals slow checkout during rush',
        'Variants & add-ons get missed on paper',
        'Customers ask for WhatsApp bills — staff retype',
        'No clean order history or Order ID',
        'Owner has no daily/weekly sales view',
        'Heavy POS hardware is expensive & slow to set up',
      ]),
    });
    addCard(s, {
      x: 6.85,
      y: 1.25,
      w: 5.8,
      h: 5.7,
      title: 'What shops need instead',
      fill: 'FFF9E8',
      body: bullets([
        'Tap-to-bill on phone or counter PC',
        'GST, FSSAI, GSTIN on professional invoices',
        'WhatsApp PDF in seconds',
        'Menu with variants, add-ons, bulk import',
        'History + Excel/HTML exports',
        'Works offline after install',
      ]),
    });
  }

  // 4 — Solution overview
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Solution overview — NAM bill');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 12.0,
      h: 2.35,
      title: 'One licensed suite for the counter',
      body:
        'Simple POS for cafés, stalls, and retail counters.\n' +
        bullets([
          'Inventory with variants, add-ons, categories, and CSV bulk import',
          'Fast cart billing with GST toggle, paid status, and Order IDs',
          'WhatsApp PDF invoices + Order Ready messages',
          'History, sales stats, backup/restore, themes, and multi-language',
        ]),
    });
    addCard(s, {
      x: 0.7,
      y: 3.85,
      w: 3.95,
      h: 3.1,
      title: 'Android',
      body: bullets(['Installable APK', 'Cashier / waiter phone', 'No Expo Go in shops']),
    });
    addCard(s, {
      x: 4.85,
      y: 3.85,
      w: 3.95,
      h: 3.1,
      title: 'Web',
      body: bullets(['Browser counter', 'Laptop / tablet demos', 'Same feature set']),
    });
    addCard(s, {
      x: 9.0,
      y: 3.85,
      w: 3.65,
      h: 3.1,
      title: 'Windows',
      body: bullets(['Electron desktop', 'NSIS installer', 'Fixed shop PC']),
    });
  }

  // 5 — UI tour (images)
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Product UI — three core screens');
    s.addText('Show these live during the demo (phone or browser)', {
      x: 0.7,
      y: 0.95,
      w: 12.0,
      h: 0.3,
      fontFace: 'Aptos',
      fontSize: 14,
      color: BRAND.muted,
    });
    const shots = [
      { path: ASSETS.inventory, label: '1 · Inventory' },
      { path: ASSETS.billing, label: '2 · Billing' },
      { path: ASSETS.history, label: '3 · Order History' },
    ];
    shots.forEach((shot, i) => {
      addPhoneShot(s, {
        x: 1.05 + i * 4.05,
        y: 1.4,
        w: 3.35,
        h: 5.55,
        imagePath: shot.path,
        label: shot.label,
      });
    });
  }

  // 6 — Key features
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Key features');
    const features = [
      ['Billing', 'Search & sort menu\nCart qty control\nGST 5% toggle\nMark paid + Order ID'],
      ['Inventory', 'Variants & add-ons\nCategories\nBulk CSV import\nEdit / delete items'],
      ['Invoices', 'WhatsApp PDF\nFSSAI & GSTIN\nResend from history\nOrder Ready message'],
      ['History', 'Order ID lookup\nPaid / unpaid\nSales stats\nDate filters'],
      ['Reports', 'Today / 7 / 30 / custom\nHTML table export\nCSV for Excel'],
      ['Shop ops', 'License login\nThemes & branding\ni18n languages\nBackup / restore'],
    ];
    features.forEach((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addCard(s, {
        x: 0.7 + col * 4.15,
        y: 1.25 + row * 2.9,
        w: 3.95,
        h: 2.7,
        title: f[0],
        body: f[1],
      });
    });
  }

  // 7 — Demo data
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Demo data (sample menu)');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 7.6,
      h: 5.7,
      title: 'Use this menu while presenting',
      body:
        bullets([
          'Coffee — Base ₹60 | S ₹50 · M ₹60 · L ₹80 | Extra shot ₹20',
          'Masala Tea — Base ₹40 | Regular ₹40 · Strong ₹45 | Lemon ₹5',
          'Sandwich — Base ₹120 | Veg ₹120 · Chicken ₹160 | Cheese ₹15',
          'Muffin — Base ₹55 / ₹70 | Chocolate add-on ₹10',
          'Pasta — Base ₹160 | plain or with add-ons',
          'Brownie — Base ₹70',
        ]) +
        '\n\nTip: bulk-import the full menu from CSV for a faster setup demo.',
    });
    addPhoneShot(s, {
      x: 8.7,
      y: 1.25,
      w: 3.8,
      h: 5.7,
      imagePath: ASSETS.inventory,
      label: 'Inventory screen',
    });
  }

  // 8 — Live demo flow
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Live demo flow (5–7 minutes)');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 12.0,
      h: 5.7,
      title: 'Suggested walkthrough',
      body: bullets([
        '1. Login with license key → show shop name on header',
        '2. Settings: shop name, FSSAI, GSTIN, theme colors',
        '3. Inventory: add Coffee with S/M/L + Extra shot (or bulk import)',
        '4. Billing: add Coffee (Large) + Extra shot, Sandwich (Veg) + Cheese',
        '5. Toggle GST 5% · enter WhatsApp number · Mark Paid → Checkout',
        '6. Show Order ID (e.g. ORD-000042) → send WhatsApp PDF invoice',
        '7. History: open order, resend invoice / Order Ready',
        '8. Export Today report as HTML + CSV · open sales stats',
        '9. Optional: export backup JSON → explain restore on new phone',
      ]),
    });
  }

  // 9 — Example order
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Example order');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 6.0,
      h: 5.7,
      title: 'Sample bill',
      body:
        'Order ID: ORD-000042\nShop: Naren Cafe\n\n' +
        bullets([
          'Coffee (Large) + Extra shot × 2  —  ₹200',
          'Sandwich (Veg) + Cheese × 1     —  ₹135',
          'Mineral Water × 1               —   ₹25',
        ]) +
        '\n\nSubtotal: ₹360\nGST 5%: ₹18\nGrand Total: ₹378',
    });
    addCard(s, {
      x: 6.95,
      y: 1.25,
      w: 5.7,
      h: 5.7,
      title: 'What the customer gets',
      fill: 'FFF9E8',
      body: bullets([
        'Professional PDF tax invoice',
        'Shop name, FSSAI, GSTIN (if set)',
        'Item lines with variants & add-ons',
        'Order ID for easy reference',
        'Optional “Order Ready” WhatsApp later',
      ]),
    });
  }

  // 10 — Reports
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Reports, stats & backup');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'Exports',
      body: bullets([
        'Today / 7 / 30 / All / custom dates',
        'HTML table — share instantly',
        'CSV — opens in Excel / Sheets',
        'Line items, variants, totals',
      ]),
    });
    addCard(s, {
      x: 4.9,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'Sales stats',
      body: bullets([
        'Revenue for selected range',
        'Orders & items sold',
        'Top-selling items',
        'Owner-friendly snapshot',
      ]),
    });
    addCard(s, {
      x: 9.1,
      y: 1.25,
      w: 3.55,
      h: 5.7,
      title: 'Backup',
      body: bullets([
        'Export menu + orders + settings',
        'Import on a new device',
        'Safe shop migrations',
      ]),
    });
  }

  // 11 — Platforms & license
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Deployment & license');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 6.0,
      h: 5.7,
      title: 'How shops run it',
      body: bullets([
        'Android APK for floor staff phones',
        'Web browser for laptop / tablet counters',
        'Windows Electron installer for fixed PCs',
        'One codebase — same UX everywhere',
        'Offline-capable billing after install',
      ]),
    });
    addCard(s, {
      x: 6.95,
      y: 1.25,
      w: 5.7,
      h: 5.7,
      title: 'License model',
      fill: 'FFF9E8',
      body: bullets([
        'Shop name + 10-character license key',
        'Time-bound validity with renewal code',
        'Optional API credentials for integrations',
        'Simple for pilots and partner distribution',
      ]),
    });
  }

  // 12 — Next steps
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Next steps after the demo');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 12.0,
      h: 2.4,
      title: 'Recommended path',
      body: bullets([
        'Pilot at 1 shop for 3–7 days with real menu',
        'Collect feedback from cashier + owner',
        'Finalize branding (logo, theme, invoice fields)',
        'Train staff → go live → renewals',
      ]),
    });
    addCard(s, {
      x: 0.7,
      y: 3.9,
      w: 5.9,
      h: 3.05,
      title: 'What to prepare',
      body: bullets([
        'Shop name + license key',
        'Menu CSV (or 8–12 items ready)',
        'FSSAI / GSTIN if needed on bills',
        'Android phone or laptop for demo',
      ]),
    });
    addCard(s, {
      x: 6.85,
      y: 3.9,
      w: 5.8,
      h: 3.05,
      title: 'Success signals',
      fill: 'F0F7F4',
      body: bullets([
        'First bill under 30 seconds',
        'WhatsApp invoice sent successfully',
        'Owner exports today’s sales',
        'Staff can bill without help',
      ]),
    });
  }

  // 13 — Closing
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: BRAND.accent } });
    s.addImage({ path: ASSETS.logo, x: 0.85, y: 1.4, w: 1.1, h: 1.1 });
    s.addText('Ready for a live walkthrough?', {
      x: 0.85,
      y: 2.8,
      w: 11.5,
      h: 0.7,
      fontFace: 'Aptos Display',
      fontSize: 34,
      color: BRAND.white,
      bold: true,
    });
    s.addText('NAM bill — Simple · Fast · Professional', {
      x: 0.85,
      y: 3.6,
      w: 11.5,
      h: 0.45,
      fontFace: 'Aptos',
      fontSize: 18,
      color: BRAND.accentHot,
    });
    s.addShape('roundRect', {
      x: 0.85,
      y: 4.5,
      w: 11.5,
      h: 2.0,
      fill: { color: BRAND.panel },
      radius: 14,
    });
    s.addText(
      'Open the app → login → bill a sample order → send WhatsApp invoice.\n\nContact: [Your name]  ·  WhatsApp: [Your number]  ·  Email: [Your email]',
      {
        x: 1.2,
        y: 4.85,
        w: 10.8,
        h: 1.4,
        fontFace: 'Aptos',
        fontSize: 16,
        color: 'DDE6EF',
      }
    );
  }

  return pptx;
}

async function main() {
  assertAssets();
  const pptx = buildDeck();
  const primary = path.join(ROOT, 'NAM-bill-Product-Demo.pptx');
  const legacy = path.join(ROOT, 'POS-Billing-Product-Demo.pptx');
  await pptx.writeFile({ fileName: primary });
  console.log(`Created: ${primary}`);
  try {
    await pptx.writeFile({ fileName: legacy });
    console.log(`Also wrote legacy name: ${legacy}`);
  } catch (err) {
    if (err && err.code === 'EBUSY') {
      console.log(`Skipped locked legacy file: ${legacy}`);
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

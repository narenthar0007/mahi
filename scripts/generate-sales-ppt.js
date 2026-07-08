/* eslint-disable no-console */
const path = require('path');

const pptxgen = require('pptxgenjs');

const BRAND = {
  bg: '0B132B',
  ink: '1A1A2E',
  text: '1A1A2E',
  muted: '6C757D',
  white: 'FFFFFF',
  accent: 'E94560',
  accent2: '228BE6',
  green: '2D6A4F',
  card: 'FFFFFF',
  cardBorder: 'E9ECEF',
  soft: 'F8F9FA',
  gold: 'D4AF37',
};

function addTopBar(slide, title) {
  slide.background = { color: BRAND.soft };
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 0.7, fill: { color: BRAND.bg } });
  slide.addText(title, {
    x: 0.7,
    y: 0.16,
    w: 12.0,
    h: 0.4,
    fontFace: 'Aptos Display',
    fontSize: 20,
    color: BRAND.white,
    bold: true,
  });
  slide.addShape('rect', { x: 0, y: 0.7, w: 13.333, h: 0.06, fill: { color: BRAND.accent } });
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
      x: x + 0.3,
      y: y + 0.25,
      w: w - 0.6,
      h: 0.4,
      fontFace: 'Aptos Display',
      fontSize: 16,
      color: BRAND.text,
      bold: true,
    });
  }
  if (body) {
    slide.addText(body, {
      x: x + 0.3,
      y: y + (title ? 0.75 : 0.3),
      w: w - 0.6,
      h: h - (title ? 0.95 : 0.6),
      fontFace: 'Aptos',
      fontSize: 13,
      color: BRAND.muted,
      valign: 'top',
    });
  }
}

function bullets(lines) {
  return lines.map((t) => `• ${t}`).join('\n');
}

function buildSalesDeck() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'GEET app';
  pptx.company = 'GEET app';
  pptx.subject = 'Customer sales presentation';
  pptx.title = 'GEET app — Smart POS & Billing';

  // Slide 1 — Title
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addShape('rect', { x: 0, y: 6.2, w: 13.333, h: 1.3, fill: { color: '121A33' } });
    s.addText('GEET app', {
      x: 0.8,
      y: 1.6,
      w: 11.8,
      h: 0.9,
      fontFace: 'Aptos Display',
      fontSize: 52,
      color: BRAND.white,
      bold: true,
    });
    s.addText('Smart POS & Billing for Small Shops', {
      x: 0.8,
      y: 2.55,
      w: 11.8,
      h: 0.55,
      fontFace: 'Aptos Display',
      fontSize: 28,
      color: BRAND.accent,
      bold: true,
    });
    s.addText(
      'Fast billing  •  Inventory & bulk import  •  WhatsApp PDF invoices\nOrder history  •  GST bills  •  Mobile · Web · Desktop',
      {
        x: 0.8,
        y: 3.35,
        w: 11.8,
        h: 0.9,
        fontFace: 'Aptos',
        fontSize: 17,
        color: 'DDE3EA',
      }
    );
    s.addText('Sales presentation  •  June 2026', {
      x: 0.8,
      y: 6.45,
      w: 11.8,
      h: 0.4,
      fontFace: 'Aptos',
      fontSize: 14,
      color: 'AEB8C4',
    });
  }

  // Slide 2 — Who is it for
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Built for real shops');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 3.85,
      h: 2.6,
      title: 'Cafés & restaurants',
      body: bullets(['Quick menu billing', 'Variants & add-ons', 'Order Ready on WhatsApp']),
    });
    addCard(s, {
      x: 4.75,
      y: 1.3,
      w: 3.85,
      h: 2.6,
      title: 'Retail counters',
      body: bullets(['Product catalog', 'Bulk item import', 'Daily sales export']),
    });
    addCard(s, {
      x: 8.8,
      y: 1.3,
      w: 3.9,
      h: 2.6,
      title: 'Food stalls & kiosks',
      body: bullets(['Works on Android phone', 'No internet after install', 'Simple staff training']),
    });
    addCard(s, {
      x: 0.7,
      y: 4.15,
      w: 12.0,
      h: 2.85,
      title: 'Why shop owners choose GEET app',
      body: bullets([
        'Affordable alternative to heavy POS machines',
        'No complicated setup — login and start billing',
        'Professional PDF invoices customers trust',
        'Owner gets daily/weekly sales reports in Excel',
        'Runs on phone, browser, or shop counter PC',
      ]),
    });
  }

  // Slide 3 — Pain vs solution
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Problem → Solution');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 5.9,
      h: 5.7,
      title: 'Without GEET app',
      body: bullets([
        'Manual calculation errors at checkout',
        'Paper bills — hard to track and share',
        'No record of daily sales',
        'Customers ask “send bill on WhatsApp” — manual work',
        'Menu changes require rewriting price lists',
        'Long queues during rush hours',
      ]),
    });
    addCard(s, {
      x: 6.9,
      y: 1.3,
      w: 5.8,
      h: 5.7,
      title: 'With GEET app',
      fill: 'FFF5F7',
      body: bullets([
        'Tap-to-bill with accurate totals',
        'PDF tax invoice on WhatsApp in seconds',
        'Full order history with Order ID',
        'Export HTML/CSV for accountant',
        'Bulk import entire menu from spreadsheet',
        'Faster checkout = happier customers',
      ]),
    });
  }

  // Slide 4 — Feature overview
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Complete feature set');
    const features = [
      ['Inventory', 'Single + bulk import\nVariants & add-ons\nEdit / delete items'],
      ['Billing', 'Search & sort menu\nCart with qty control\nGST 5% toggle\nMark paid'],
      ['Invoices', 'WhatsApp PDF invoice\nFSSAI & GSTIN on bill\nResend from history'],
      ['History', 'Order ID tracking\nPaid / unpaid status\nOrder Ready message'],
      ['Reports', 'Today / 7 / 30 days\nExport HTML table\nExport CSV for Excel'],
      ['Branding', '5 theme presets\nCustom shop colors\nShop name on every bill'],
    ];
    features.forEach((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addCard(s, {
        x: 0.7 + col * 4.05,
        y: 1.25 + row * 2.95,
        w: 3.85,
        h: 2.65,
        title: f[0],
        body: f[1],
      });
    });
  }

  // Slide 5 — Inventory & bulk import
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Menu setup — single or bulk');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 6.0,
      h: 5.7,
      title: 'Four item types supported',
      body:
        bullets([
          'Plain item — name + base price only',
          'With variants — Small / Medium / Large (price replaces base)',
          'With add-ons — extras added on top (cheese, extra shot…)',
          'With both — variant + multiple add-ons',
        ]) +
        '\n\nExample:\nCoffee — variants: S/M/L\nSandwich — variants: Veg/Chicken + add-ons: Cheese, Sauce',
    });
    addCard(s, {
      x: 6.9,
      y: 1.3,
      w: 5.8,
      h: 5.7,
      title: 'Bulk import from CSV',
      body:
        'Import 50+ items in one step from Excel/Google Sheets.\n\n' +
        bullets([
          'Paste CSV or load sample in app',
          'Preview before import',
          'Mix plain, variant, and add-on rows',
          'Perfect for new shop setup or menu updates',
        ]) +
        '\n\nFormat: name, basePrice, category, variants, addons',
    });
  }

  // Slide 6 — Billing flow
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Billing in 30 seconds');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 2.2,
      title: 'Live demo flow (show customer on phone)',
      body: bullets([
        '1. Tap menu items → auto-add or pick variant/add-ons',
        '2. Open cart → adjust quantities',
        '3. Optional: Add GST 5% · enter WhatsApp number · Mark Paid',
        '4. Checkout → Order ID generated (e.g. ORD-000042)',
        '5. Customer receives PDF invoice on WhatsApp',
      ]),
    });
    addCard(s, {
      x: 0.7,
      y: 3.75,
      w: 5.9,
      h: 3.25,
      title: 'Sample order',
      body:
        'Order ID: ORD-000042\nShop: Demo Cafe\n\n' +
        bullets([
          'Coffee (Large) + Extra shot × 2  —  ₹200',
          'Sandwich (Veg) + Cheese × 1     —  ₹135',
          'Mineral Water × 1               —   ₹25',
        ]) +
        '\n\nGrand Total (with GST): ₹360',
    });
    addCard(s, {
      x: 6.9,
      y: 3.75,
      w: 5.8,
      h: 3.25,
      title: 'What customer receives',
      body: bullets([
        'Professional PDF tax invoice',
        'Shop name, FSSAI, GSTIN (if configured)',
        'Item lines with variants & add-ons',
        'Order ID for easy reference',
        '“Order Ready” WhatsApp when food is prepared',
      ]),
    });
  }

  // Slide 7 — Reports
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Owner dashboard & reports');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 7.5,
      h: 5.7,
      title: 'Export any date range',
      body:
        bullets([
          'Presets: Today · 7 Days · 30 Days · All',
          'Custom from/to date picker',
          'HTML table — share instantly',
          'CSV — opens in Excel / Google Sheets',
          'Includes line items, variants, add-ons, totals',
        ]) +
        '\n\nSample day summary:\n' +
        bullets(['42 orders', '97 items sold', '₹18,640 revenue', 'Top: Coffee, Sandwich, Tea']),
    });
    addCard(s, {
      x: 8.4,
      y: 1.3,
      w: 4.3,
      h: 5.7,
      title: 'Business value',
      body: bullets([
        'Owner sees real numbers daily',
        'Accountant gets clean CSV',
        'Track paid vs unpaid orders',
        'No manual register counting',
        'Data stays on your device',
      ]),
    });
  }

  // Slide 8 — Platforms
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Works everywhere you need');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 3.85,
      h: 5.7,
      title: '📱 Android',
      body: bullets([
        'Installable APK',
        'Works like WhatsApp — no Expo Go',
        'Perfect for waiter / cashier phone',
        'Offline billing after install',
      ]),
    });
    addCard(s, {
      x: 4.75,
      y: 1.3,
      w: 3.85,
      h: 5.7,
      title: '🌐 Web',
      body: bullets([
        'Runs in browser',
        'Large screen for counter',
        'Same features as mobile',
        'Quick demo on laptop',
      ]),
    });
    addCard(s, {
      x: 8.8,
      y: 1.3,
      w: 3.9,
      h: 5.7,
      title: '🖥 Desktop',
      body: bullets([
        'Windows Electron app',
        'Fixed shop counter PC',
        'Keyboard + mouse friendly',
        'Professional counter setup',
      ]),
    });
  }

  // Slide 9 — Comparison
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Why GEET app vs alternatives');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 5.7,
      title: 'Comparison at a glance',
      body:
        'Feature                    GEET app    Paper bills    Generic POS\n' +
        '─────────────────────────────────────────────────────────────\n' +
        'Setup time                 Minutes     None           Days/weeks\n' +
        'WhatsApp PDF invoice       ✓           ✗              Extra cost\n' +
        'Variants & add-ons         ✓           ✗              Sometimes\n' +
        'Bulk menu import           ✓           ✗              Rare\n' +
        'GST 5% billing             ✓           Manual         ✓\n' +
        'Sales export (Excel)       ✓           ✗              Extra module\n' +
        'Works on your phone        ✓           ✓              Often hardware only\n' +
        'License — simple login     ✓           —              Subscription',
    });
  }

  // Slide 10 — Pricing / offer (placeholder for sales team)
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Packages & next steps');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 4.0,
      h: 5.7,
      title: 'Starter',
      body:
        bullets([
          'GEET app license',
          'Android APK install',
          'Menu setup assistance',
          'Staff training (1 session)',
          'Email / WhatsApp support',
        ]) + '\n\n[Your price here]',
    });
    addCard(s, {
      x: 4.85,
      y: 1.3,
      w: 4.0,
      h: 5.7,
      title: 'Business',
      fill: 'FFF5F7',
      body:
        bullets([
          'Everything in Starter',
          'Bulk menu import setup',
          'Custom theme / branding',
          'Desktop install on counter PC',
          'Priority support',
        ]) + '\n\n[Your price here]',
    });
    addCard(s, {
      x: 9.0,
      y: 1.3,
      w: 3.7,
      h: 5.7,
      title: 'Next steps',
      body: bullets([
        '1. Free live demo (5 min)',
        '2. Pilot at your shop (3–7 days)',
        '3. Menu import + training',
        '4. Go live',
        '5. Monthly license renewal',
      ]),
    });
  }

  // Slide 11 — Closing
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addText('Ready to bill smarter?', {
      x: 0.8,
      y: 2.0,
      w: 11.8,
      h: 0.8,
      fontFace: 'Aptos Display',
      fontSize: 40,
      color: BRAND.white,
      bold: true,
    });
    s.addText('GEET app — Simple · Fast · Professional', {
      x: 0.8,
      y: 3.0,
      w: 11.8,
      h: 0.5,
      fontFace: 'Aptos',
      fontSize: 22,
      color: BRAND.accent,
    });
    s.addShape('roundRect', {
      x: 0.8,
      y: 4.2,
      w: 11.8,
      h: 2.2,
      fill: { color: '121A33' },
      line: { color: '121A33' },
      radius: 16,
    });
    s.addText(
      'Contact: [Your name / company]\nWhatsApp: [Your number]\nEmail: [Your email]\n\nIncludes: User manual · APK install · License key · Training',
      {
        x: 1.2,
        y: 4.45,
        w: 11.0,
        h: 1.7,
        fontFace: 'Aptos',
        fontSize: 16,
        color: 'DDE3EA',
      }
    );
  }

  return pptx;
}

async function main() {
  const pptx = buildSalesDeck();
  const outPath = path.join(process.cwd(), 'GEET-App-Sales-Presentation.pptx');
  await pptx.writeFile({ fileName: outPath });
  console.log(`Created: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

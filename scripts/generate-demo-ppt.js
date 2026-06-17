/* eslint-disable no-console */
const path = require('path');

const pptxgen = require('pptxgenjs');

const BRAND = {
  bg: '0B1020',
  ink: '0B1020',
  text: '1A1A2E',
  muted: '6C757D',
  white: 'FFFFFF',
  accent: 'E94560',
  accent2: '228BE6',
  card: 'FFFFFF',
  cardBorder: 'E9ECEF',
  soft: 'F8F9FA',
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

function addCard(slide, { x, y, w, h, title, body }) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    fill: { color: BRAND.card },
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

function buildDeck() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'POS Billing';
  pptx.company = 'POS Billing';
  pptx.subject = 'Product demo deck';
  pptx.title = 'POS Billing — Product Demo';

  // Slide 1: Title
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addText('POS Billing & Inventory', {
      x: 0.8,
      y: 1.8,
      w: 11.8,
      h: 0.8,
      fontFace: 'Aptos Display',
      fontSize: 44,
      color: BRAND.white,
      bold: true,
    });
    s.addText('Product Demo', {
      x: 0.8,
      y: 2.7,
      w: 11.8,
      h: 0.5,
      fontFace: 'Aptos Display',
      fontSize: 26,
      color: BRAND.accent,
      bold: true,
    });
    s.addText(
      'Fast billing • Inventory management • WhatsApp PDF invoices • Order history & export',
      {
        x: 0.8,
        y: 3.5,
        w: 11.8,
        h: 0.6,
        fontFace: 'Aptos',
        fontSize: 16,
        color: 'DDE3EA',
      }
    );
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 5.4,
      w: 11.8,
      h: 1.0,
      fill: { color: '121A33' },
      line: { color: '121A33' },
      radius: 16,
    });
    s.addText('Demo shop: Naren Cafe (sample data)\nDate: 15 Jun 2026', {
      x: 1.1,
      y: 5.55,
      w: 11.2,
      h: 0.7,
      fontFace: 'Aptos',
      fontSize: 14,
      color: 'DDE3EA',
    });
  }

  // Slide 2: Agenda
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Agenda');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 5.7,
      title: 'What we will cover',
      body: bullets([
        'Business problem we solve',
        'Solution overview & platforms (Mobile/Web/Desktop)',
        'Key features',
        'Demo flow (Inventory → Billing → Invoice → History → Export)',
        'Deployment options & next steps',
      ]),
    });
  }

  // Slide 3: Problem
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Why this product');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 5.9,
      h: 5.7,
      title: 'Common pain points',
      body: bullets([
        'Manual billing slows checkout',
        'No consistent receipts / invoices',
        'Inventory and pricing errors',
        'No order history and reporting',
        'Hard to share bills on WhatsApp',
      ]),
    });
    addCard(s, {
      x: 6.9,
      y: 1.3,
      w: 5.8,
      h: 5.7,
      title: 'Impact',
      body: bullets([
        'Longer queues and missed sales',
        'Customer disputes on totals',
        'Revenue leakage due to wrong pricing',
        'No visibility into daily/weekly sales',
      ]),
    });
  }

  // Slide 4: Solution
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Solution overview');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 2.6,
      title: 'POS Billing & Inventory',
      body:
        'A simple, fast POS app designed for small shops/cafes.\n' +
        bullets([
          'Create items with base price, variants and add-ons',
          'Quick cart billing with accurate totals',
          'Generate and share WhatsApp PDF invoice',
          'Order history with Order ID and export (HTML/CSV)',
        ]),
    });
    addCard(s, {
      x: 0.7,
      y: 4.2,
      w: 3.85,
      h: 2.8,
      title: 'Mobile',
      body: bullets(['Android APK', 'iOS (EAS build)', 'Expo Go for quick testing']),
    });
    addCard(s, {
      x: 4.75,
      y: 4.2,
      w: 3.85,
      h: 2.8,
      title: 'Web',
      body: bullets(['Runs in browser', 'Good for larger screens', 'Same features']),
    });
    addCard(s, {
      x: 8.8,
      y: 4.2,
      w: 3.9,
      h: 2.8,
      title: 'Desktop',
      body: bullets(['Electron desktop app', 'Windows/macOS', 'Uses built web bundle']),
    });
  }

  // Slide 5: Key features
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Key features');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 6.0,
      h: 2.8,
      title: 'Billing',
      body: bullets([
        'Fast cart billing with quantities',
        'Variants (e.g., Small/Medium/Large)',
        'Add-ons (e.g., Extra cheese)',
        'Order ID generated for every checkout',
      ]),
    });
    addCard(s, {
      x: 6.9,
      y: 1.3,
      w: 5.8,
      h: 2.8,
      title: 'Invoices & sharing',
      body: bullets([
        'WhatsApp PDF invoice',
        'SMS/Message bill text',
        'Customer phone optional',
      ]),
    });
    addCard(s, {
      x: 0.7,
      y: 4.3,
      w: 6.0,
      h: 2.7,
      title: 'History & export',
      body: bullets([
        'Order History (newest first)',
        'Export date range to HTML / CSV (Excel)',
        'Totals: orders, items, revenue',
      ]),
    });
    addCard(s, {
      x: 6.9,
      y: 4.3,
      w: 5.8,
      h: 2.7,
      title: 'Admin',
      body: bullets(['License-key based login', 'Reset storage when needed']),
    });
  }

  // Slide 6: Demo data (inventory)
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Demo data (sample)');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 5.7,
      title: 'Sample menu setup (for demo)',
      body:
        'Use this sample data while presenting:\n\n' +
        bullets([
          'Coffee — Base ₹60 | Variants: Small ₹50, Medium ₹60, Large ₹80 | Add-ons: Extra shot ₹20',
          'Tea — Base ₹40 | Variants: Regular ₹40, Strong ₹45 | Add-ons: Lemon ₹5',
          'Sandwich — Base ₹120 | Variants: Veg ₹120, Chicken ₹160 | Add-ons: Cheese ₹15, Extra sauce ₹10',
          'Muffin — Base ₹70 | Add-ons: Chocolate ₹10',
        ]),
    });
  }

  // Slide 7: Demo flow
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Demo flow (live)');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 5.7,
      title: 'Suggested demo steps (5–7 minutes)',
      body: bullets([
        'Login with license key → show shop name',
        'Add 2 items with variant + add-on (Inventory tab)',
        'Go to Billing → add items to cart',
        'Enter customer WhatsApp number (optional) → Checkout',
        'Show generated Order ID (e.g., ORD-000023)',
        'Send WhatsApp PDF invoice',
        'Open History → show order and export report (HTML/CSV)',
      ]),
    });
  }

  // Slide 8: Example order + invoice message
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Example order');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 6.0,
      h: 5.7,
      title: 'Sample bill',
      body:
        'Order ID: ORD-000023\nDate: 15 Jun 2026, 9:20 PM\n\n' +
        bullets([
          'Coffee (Large) + Extra shot × 2',
          'Sandwich (Veg) + Cheese × 1',
          'Tea (Strong) × 1',
        ]) +
        '\n\nTotal: ₹355',
    });
    addCard(s, {
      x: 6.9,
      y: 1.3,
      w: 5.8,
      h: 5.7,
      title: 'WhatsApp invoice',
      body:
        'Customer receives:\n' +
        bullets([
          'A clean PDF invoice (with Order ID)',
          'Bill text message (Order ID + item lines + total)',
          'Optionally “Order Ready” message later',
        ]) +
        '\n\nThis reduces disputes and improves customer trust.',
    });
  }

  // Slide 9: Reporting
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Reports & export');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 12.0,
      h: 2.9,
      title: 'Exports for owners / accountants',
      body: bullets([
        'Export any date range (Today / 7 days / 30 days / All)',
        'HTML table export (shareable report)',
        'CSV export (opens in Excel) with summary + line-item details',
      ]),
    });
    addCard(s, {
      x: 0.7,
      y: 4.4,
      w: 12.0,
      h: 2.6,
      title: 'Sample day summary (example numbers)',
      body: bullets([
        'Orders: 42',
        'Items sold: 97',
        'Revenue: ₹18,640',
        'Top items: Coffee, Sandwich, Tea',
      ]),
    });
  }

  // Slide 10: Deployment & next steps
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Deployment & next steps');
    addCard(s, {
      x: 0.7,
      y: 1.3,
      w: 6.0,
      h: 5.7,
      title: 'Deployment options',
      body: bullets([
        'Android: installable APK (EAS build)',
        'iOS: EAS build (simulator or device with Apple credentials)',
        'Desktop: Electron app (Windows/macOS)',
        'Web: browser access for bigger screens',
      ]),
    });
    addCard(s, {
      x: 6.9,
      y: 1.3,
      w: 5.8,
      h: 5.7,
      title: 'Next steps',
      body: bullets([
        'Pilot at 1 store for 3–7 days',
        'Collect feedback from cashier + owner',
        'Finalize customizations (logo, invoice text, extra fields)',
        'Training + go-live',
      ]),
    });
  }

  return pptx;
}

async function main() {
  const pptx = buildDeck();
  const outPath = path.join(process.cwd(), 'POS-Billing-Product-Demo.pptx');
  await pptx.writeFile({ fileName: outPath });
  console.log(`Created: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


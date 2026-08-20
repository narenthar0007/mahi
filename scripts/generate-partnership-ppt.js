/* eslint-disable no-console */
/**
 * NAM bill — High-level tech partnership deck
 * Run: npm run ppt:partnership
 */
const path = require('path');
const fs = require('fs');

const pptxgen = require('pptxgenjs');

const ROOT = process.cwd();
const ASSETS = {
  logo: path.join(ROOT, 'assets', 'nam-bill-logo.png'),
  logoFull: path.join(ROOT, 'website', 'assets', 'nam-bill-logo-full.jpeg'),
  icon: path.join(ROOT, 'assets', 'icon.png'),
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
  teal: '1F6F8B',
  green: '2D6A4F',
  card: 'FFFFFF',
  cardBorder: 'D9E2EC',
  line: '243447',
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
  slide.addImage({
    path: ASSETS.logo,
    x: 0.35,
    y: 0.12,
    w: 0.48,
    h: 0.48,
  });
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

function addCard(slide, { x, y, w, h, title, body, fill, titleColor }) {
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
      color: titleColor || BRAND.text,
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

function buildPartnershipDeck() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'NAM bill';
  pptx.company = 'NAM bill';
  pptx.subject = 'High-level tech partnership presentation';
  pptx.title = 'NAM bill — Partnership Tech Brief';

  // 1 — Title
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: BRAND.accent } });

    s.addImage({
      path: ASSETS.logo,
      x: 0.85,
      y: 0.85,
      w: 1.35,
      h: 1.35,
    });

    s.addText('PARTNERSHIP DISCUSSION', {
      x: 2.45,
      y: 1.15,
      w: 9.5,
      h: 0.35,
      fontFace: 'Aptos',
      fontSize: 13,
      color: BRAND.accent,
      bold: true,
      charSpacing: 3,
    });
    s.addText('NAM bill', {
      x: 2.45,
      y: 1.5,
      w: 9.5,
      h: 0.7,
      fontFace: 'Aptos Display',
      fontSize: 48,
      color: BRAND.white,
      bold: true,
    });

    s.addText('High-Level Tech Brief  ·  Product Partnership Proposal', {
      x: 0.85,
      y: 2.5,
      w: 7.2,
      h: 0.4,
      fontFace: 'Aptos Display',
      fontSize: 18,
      color: 'A8B8C8',
    });
    s.addText(
      'A production-ready POS & billing platform for shops and cafés —\nAndroid · Web · Windows — with license model and API-ready architecture.',
      {
        x: 0.85,
        y: 3.1,
        w: 7.0,
        h: 0.9,
        fontFace: 'Aptos',
        fontSize: 15,
        color: '8A9AAB',
      }
    );

    // Hero phone preview
    addPhoneShot(s, {
      x: 8.55,
      y: 1.1,
      w: 3.55,
      h: 5.55,
      imagePath: ASSETS.billing,
      label: 'Billing screen',
      labelColor: BRAND.accentHot,
    });

    s.addShape('roundRect', {
      x: 0.85,
      y: 5.55,
      w: 7.2,
      h: 1.25,
      fill: { color: BRAND.panel },
      radius: 12,
    });
    s.addText(
      'Ask: Explore a partnership to take NAM bill to market together —\nproduct + engineering already shipped; looking for go-to-market, distribution, and scale.',
      {
        x: 1.1,
        y: 5.8,
        w: 6.7,
        h: 0.85,
        fontFace: 'Aptos',
        fontSize: 14,
        color: 'DDE6EF',
      }
    );
  }

  // 2 — Agenda
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Agenda');
    const items = [
      ['01', 'Opportunity', 'Why small-shop billing is broken'],
      ['02', 'Product', 'What NAM bill does today'],
      ['03', 'Technology', 'Stack, architecture, platforms'],
      ['04', 'Business model', 'Licensing & monetization'],
      ['05', 'Partnership', 'How we can work together'],
      ['06', 'Next steps', 'Concrete ask & timeline'],
    ];
    items.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.7 + col * 4.15;
      const y = 1.4 + row * 2.7;
      addCard(s, {
        x,
        y,
        w: 3.95,
        h: 2.4,
        title: `${item[0]}  ${item[1]}`,
        body: item[2],
      });
    });
  }

  // 3 — Opportunity
  {
    const s = pptx.addSlide();
    addTopBar(s, 'The opportunity');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 6.0,
      h: 5.7,
      title: 'Market reality (India SMB)',
      body: bullets([
        'Millions of cafés, stalls, and retail counters still use paper + calculator',
        'Customers already expect WhatsApp invoices',
        'Heavy POS systems are expensive, slow to install, and overkill',
        'Shop owners want phone-first tools with GST, history, and reports',
        'License + simple install beats complex SaaS for many shops',
      ]),
    });
    addCard(s, {
      x: 6.95,
      y: 1.25,
      w: 5.7,
      h: 5.7,
      title: 'Where NAM bill fits',
      fill: 'FFF9E8',
      body: bullets([
        'Lightweight POS built for real counters',
        'Works offline after install — no always-on cloud required',
        'Professional PDF invoices via WhatsApp',
        'One product across Android, Web, and Windows',
        'Ready now — not a pitch deck product',
      ]),
    });
  }

  // 4 — Product overview
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Product overview — NAM bill');
    s.addText('Point of Sale + Inventory + Invoices + Reports — one licensed suite', {
      x: 0.7,
      y: 1.05,
      w: 12.0,
      h: 0.35,
      fontFace: 'Aptos',
      fontSize: 14,
      color: BRAND.muted,
    });
    const features = [
      ['Billing', 'Fast cart, variants, add-ons, GST, checkout in seconds'],
      ['Inventory', 'Menu items, categories, bulk CSV import'],
      ['Invoices', 'WhatsApp PDF with shop name, FSSAI, GSTIN'],
      ['History', 'Order IDs, paid/unpaid, resend invoice, Order Ready'],
      ['Reports', 'Date-range exports (HTML / Excel CSV) + sales stats'],
      ['Ops', 'Themes, i18n, backup/restore, license login'],
    ];
    features.forEach((f, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addCard(s, {
        x: 0.7 + col * 4.15,
        y: 1.55 + row * 2.65,
        w: 3.95,
        h: 2.4,
        title: f[0],
        body: f[1],
      });
    });
  }

  // 5 — Product UI (images)
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Product in action — real app UI');
    s.addText('Three core screens your partner can demo live on phone or web', {
      x: 0.7,
      y: 0.95,
      w: 12.0,
      h: 0.3,
      fontFace: 'Aptos',
      fontSize: 14,
      color: BRAND.muted,
    });

    const shots = [
      { path: ASSETS.inventory, label: 'Inventory' },
      { path: ASSETS.billing, label: 'Billing' },
      { path: ASSETS.history, label: 'Order History' },
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

  // 6 — Tech stack
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Technology stack (high level)');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'Client application',
      body: bullets([
        'Expo / React Native (~54)',
        'React 19 + RN 0.81',
        'Zustand (persisted state)',
        'AsyncStorage local data',
        'React Navigation tabs',
        'jsPDF + expo-print / share',
      ]),
    });
    addCard(s, {
      x: 4.9,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'Platforms',
      body: bullets([
        'Android APK (EAS / local)',
        'Web (Metro / react-native-web)',
        'Windows desktop (Electron)',
        'One codebase → three surfaces',
        'Shop-ready installers',
      ]),
    });
    addCard(s, {
      x: 9.1,
      y: 1.25,
      w: 3.55,
      h: 5.7,
      title: 'Product systems',
      body: bullets([
        'License key auth',
        'API credential model',
        'Backup / restore JSON',
        'Bulk inventory import',
        'i18n (EN + regional)',
        'Marketing website',
      ]),
    });
  }

  // 7 — Architecture
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Architecture — designed for shops');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 6.0,
      h: 2.7,
      title: 'Client-first, offline-capable',
      body: bullets([
        'Core billing works on-device — no cloud dependency for checkout',
        'State persisted locally (menu, orders, settings)',
        'Ideal for unstable shop internet',
      ]),
    });
    addCard(s, {
      x: 6.95,
      y: 1.25,
      w: 5.7,
      h: 2.7,
      title: 'License & access control',
      body: bullets([
        'Shop login with license key + expiry',
        'Renewal-code flow for support ops',
        'Simple distribution model for partners',
      ]),
    });
    addCard(s, {
      x: 0.7,
      y: 4.2,
      w: 6.0,
      h: 2.75,
      title: 'API-ready layer',
      body: bullets([
        'App Unique Key + App Key / Secret / Client tokens',
        'Postman collection for Items & Orders APIs',
        'Path to cloud sync, multi-device, integrations',
      ]),
    });
    addCard(s, {
      x: 6.95,
      y: 4.2,
      w: 5.7,
      h: 2.75,
      title: 'Share & reporting pipeline',
      body: bullets([
        'PDF invoice generation → WhatsApp share',
        'HTML / CSV exports for owners & accountants',
        'Sales stats for business insights',
      ]),
    });
  }

  // 8 — Platforms with visual
  {
    const s = pptx.addSlide();
    addTopBar(s, 'One product, three go-to-market surfaces');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 4.55,
      h: 1.7,
      title: 'Android',
      body: 'Installable APK for cashiers / waiters. Floor billing on the phone they already own.',
    });
    addCard(s, {
      x: 0.7,
      y: 3.15,
      w: 4.55,
      h: 1.7,
      title: 'Web',
      body: 'Browser counter on laptop / tablet. Fast demos and pilots with the same feature set.',
    });
    addCard(s, {
      x: 0.7,
      y: 5.05,
      w: 4.55,
      h: 1.9,
      title: 'Windows desktop',
      body: 'Electron + NSIS installer for fixed shop counters. Keyboard / mouse friendly.',
    });
    addPhoneShot(s, {
      x: 5.8,
      y: 1.25,
      w: 3.2,
      h: 5.7,
      imagePath: ASSETS.billing,
      label: 'Mobile / Web UI',
    });
    addPhoneShot(s, {
      x: 9.3,
      y: 1.25,
      w: 3.2,
      h: 5.7,
      imagePath: ASSETS.history,
      label: 'Owner history view',
    });
  }

  // 9 — What is shipped
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Current build status — not vaporware');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 6.0,
      h: 5.7,
      title: 'Shipped & usable today',
      body: bullets([
        'Full POS flows: inventory → bill → invoice → history',
        'GST billing, WhatsApp PDF, order exports',
        'Bulk menu import + data backup / restore',
        'License login + renewal support flow',
        'Android APK + Windows installer path',
        'Product website + user manual + sales deck',
        'API auth design + Postman collection',
      ]),
    });
    addCard(s, {
      x: 6.95,
      y: 1.25,
      w: 5.7,
      h: 5.7,
      title: 'Natural next engineering bets',
      fill: 'F0F7F4',
      body: bullets([
        'Cloud sync & multi-device shops',
        'Backend for API order/item sync',
        'Payments (UPI / QR) integrations',
        'Kitchen display / table booking bridge',
        'Partner admin portal for licenses',
        'Analytics dashboard for chains',
        'Play Store / wider distribution',
      ]),
    });
  }

  // 10 — Business model
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Business model (high level)');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'License product',
      body: bullets([
        'Per-shop license key',
        'Time-bound validity',
        'Renewal via support code',
        'Low support overhead',
        'Works without SaaS billing stack on day 1',
      ]),
    });
    addCard(s, {
      x: 4.9,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'Value to shops',
      body: bullets([
        'Minutes to go live',
        'No heavy hardware lock-in',
        'WhatsApp invoices customers expect',
        'Owner reports without accountant delay',
        'Phone / web / desktop choice',
      ]),
    });
    addCard(s, {
      x: 9.1,
      y: 1.25,
      w: 3.55,
      h: 5.7,
      title: 'Partner upside',
      body: bullets([
        'White-label / co-brand potential',
        'Reseller / distribution rights',
        'Setup + training packages',
        'Upsell desktop + API later',
        'Recurring renewals',
      ]),
    });
  }

  // 11 — Differentiation
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Why this is partner-ready');
    const rows = [
      ['Dimension', 'NAM bill'],
      ['Time-to-value', 'Login → bill the same day'],
      ['Deployment', 'APK / Web / Windows installer'],
      ['Connectivity', 'Offline-capable core billing'],
      ['Customer share', 'Native WhatsApp PDF invoice path'],
      ['Catalog speed', 'CSV bulk import for full menus'],
      ['Commercial model', 'Simple license keys (partner-friendly)'],
      ['Extensibility', 'API credential model already designed'],
    ];
    rows.forEach((row, i) => {
      const y = 1.2 + i * 0.7;
      const bg = i === 0 ? BRAND.ink : i % 2 === 0 ? 'EEF3F8' : BRAND.card;
      const c1 = i === 0 ? BRAND.white : BRAND.text;
      const c2 = i === 0 ? BRAND.accentHot : BRAND.muted;
      slideRow(s, y, row[0], row[1], bg, c1, c2, i === 0);
    });
  }

  // 12 — Partnership models
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Partnership models we can discuss');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'A · Go-to-market',
      body: bullets([
        'Your startup leads sales & distribution',
        'I lead product & engineering',
        'Shared revenue on licenses',
        'Joint brand or co-sell',
      ]),
    });
    addCard(s, {
      x: 4.9,
      y: 1.25,
      w: 4.0,
      h: 5.7,
      title: 'B · Product partnership',
      fill: 'FFF9E8',
      body: bullets([
        'Embed NAM bill into your offering',
        'White-label / OEM for your clients',
        'API / sync built to your stack',
        'Priority roadmap alignment',
      ]),
    });
    addCard(s, {
      x: 9.1,
      y: 1.25,
      w: 3.55,
      h: 5.7,
      title: 'C · Equity / venture',
      body: bullets([
        'Formalize as a company product',
        'You bring ops, capital, network',
        'I bring working IP + build capacity',
        'Define ownership & roles clearly',
      ]),
    });
  }

  // 13 — What each side brings
  {
    const s = pptx.addSlide();
    addTopBar(s, 'What each side can bring');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 6.0,
      h: 5.7,
      title: 'From my side (product)',
      body: bullets([
        'Working multi-platform POS codebase',
        'Feature set shops already need',
        'License + API foundation',
        'Docs, website, demo materials',
        'Continued product engineering',
        'Domain understanding of counter workflows',
      ]),
    });
    addCard(s, {
      x: 6.95,
      y: 1.25,
      w: 5.7,
      h: 5.7,
      title: 'From your side (startup)',
      fill: 'F0F7F4',
      body: bullets([
        'Customer access & distribution muscle',
        'Sales process, packaging, pricing tests',
        'Ops: onboarding, support, renewals',
        'Brand / trust / market positioning',
        'Capital or resources to scale',
        'Strategic integrations with your stack',
      ]),
    });
  }

  // 14 — Roadmap
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Suggested joint roadmap');
    const phases = [
      [
        'Phase 1 — Pilot',
        '0–60 days',
        bullets([
          'Pick 5–15 pilot shops',
          'Fix onboarding friction',
          'Measure time-to-first-bill',
          'Lock pricing hypothesis',
        ]),
      ],
      [
        'Phase 2 — Package',
        '60–120 days',
        bullets([
          'Partner install playbook',
          'License admin process',
          'Support scripts + training',
          'Case studies from pilots',
        ]),
      ],
      [
        'Phase 3 — Scale',
        '120+ days',
        bullets([
          'Cloud sync / multi-device',
          'Payments & deeper API',
          'Channel / reseller model',
          'Regional language push',
        ]),
      ],
    ];
    phases.forEach((p, i) => {
      addCard(s, {
        x: 0.7 + i * 4.15,
        y: 1.25,
        w: 3.95,
        h: 5.7,
        title: p[0],
        body: `${p[1]}\n\n${p[2]}`,
      });
    });
  }

  // 15 — The ask
  {
    const s = pptx.addSlide();
    addTopBar(s, 'The ask');
    addCard(s, {
      x: 0.7,
      y: 1.25,
      w: 12.0,
      h: 2.2,
      title: 'What I am proposing',
      body: 'Partner with me to commercialize NAM bill — a working POS product for shops and cafés — by combining your startup’s go-to-market strength with a product that is already built and demo-ready.',
    });
    addCard(s, {
      x: 0.7,
      y: 3.7,
      w: 5.9,
      h: 3.25,
      title: 'Discussion outcomes I want',
      body: bullets([
        'Is this a fit for your company thesis?',
        'Which partnership model feels right?',
        'What would a 60-day pilot look like?',
        'What do you need from me before yes?',
      ]),
    });
    addCard(s, {
      x: 6.85,
      y: 3.7,
      w: 5.85,
      h: 3.25,
      title: 'What I can show live',
      fill: 'FFF9E8',
      body: bullets([
        'End-to-end billing demo (phone / web)',
        'WhatsApp invoice flow',
        'Bulk import + reports',
        'License login + settings',
        'Architecture walkthrough',
      ]),
    });
  }

  // 16 — Closing
  {
    const s = pptx.addSlide();
    s.background = { color: BRAND.bg };
    s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: BRAND.accent } });
    s.addImage({
      path: ASSETS.logo,
      x: 0.85,
      y: 1.15,
      w: 1.1,
      h: 1.1,
    });
    s.addText('Let’s build the counter OS together', {
      x: 0.85,
      y: 2.5,
      w: 11.5,
      h: 0.7,
      fontFace: 'Aptos Display',
      fontSize: 32,
      color: BRAND.white,
      bold: true,
    });
    s.addText('NAM bill is ready to demo. Partnership is the missing multiplier.', {
      x: 0.85,
      y: 3.3,
      w: 11.5,
      h: 0.45,
      fontFace: 'Aptos',
      fontSize: 17,
      color: BRAND.accentHot,
    });
    s.addShape('roundRect', {
      x: 0.85,
      y: 4.2,
      w: 11.5,
      h: 2.2,
      fill: { color: BRAND.panel },
      radius: 14,
    });
    s.addText(
      'Next step: 30–45 min live product walkthrough + partnership brainstorm.\n\nContact: [Your name]\nWhatsApp / Phone: [Your number]\nEmail: [Your email]',
      {
        x: 1.2,
        y: 4.5,
        w: 10.8,
        h: 1.7,
        fontFace: 'Aptos',
        fontSize: 16,
        color: 'DDE6EF',
      }
    );
  }

  return pptx;
}

function slideRow(slide, y, left, right, bg, c1, c2, header) {
  slide.addShape('rect', {
    x: 0.7,
    y,
    w: 12.0,
    h: 0.62,
    fill: { color: bg },
  });
  slide.addText(left, {
    x: 0.95,
    y: y + 0.12,
    w: 3.6,
    h: 0.4,
    fontFace: header ? 'Aptos Display' : 'Aptos',
    fontSize: header ? 14 : 13,
    color: c1,
    bold: true,
  });
  slide.addText(right, {
    x: 4.7,
    y: y + 0.12,
    w: 7.7,
    h: 0.4,
    fontFace: 'Aptos',
    fontSize: header ? 14 : 13,
    color: c2,
    bold: !!header,
  });
}

async function main() {
  assertAssets();
  const pptx = buildPartnershipDeck();
  const primary = path.join(ROOT, 'NAM-bill-Partnership-Tech-Brief.pptx');
  const fallback = path.join(ROOT, 'NAM-bill-Partnership-Tech-Brief-with-images.pptx');
  try {
    await pptx.writeFile({ fileName: primary });
    console.log(`Created: ${primary}`);
  } catch (err) {
    if (err && err.code === 'EBUSY') {
      await pptx.writeFile({ fileName: fallback });
      console.log(`Primary file locked — created: ${fallback}`);
      console.log('Close the open PPTX and re-run npm run ppt:partnership to overwrite the main file.');
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BRAND = {
  navy: hexToRgb('#0B132B'),
  navy2: hexToRgb('#111B3F'),
  teal: hexToRgb('#2DD4BF'),
  mint: hexToRgb('#A7F3D0'),
  white: hexToRgb('#F8FAFC'),
};

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function setPixel(png, x, y, r, g, b, a = 255) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fill(png, { r, g, b, a = 255 }) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      setPixel(png, x, y, r, g, b, a);
    }
  }
}

function rect(png, x0, y0, w, h, color) {
  const x1 = Math.min(png.width, x0 + w);
  const y1 = Math.min(png.height, y0 + h);
  for (let y = Math.max(0, y0); y < y1; y += 1) {
    for (let x = Math.max(0, x0); x < x1; x += 1) {
      setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
    }
  }
}

function circle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.max(0, cy - radius); y <= Math.min(png.height - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(png.width - 1, cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
      }
    }
  }
}

function roundedRect(png, x0, y0, w, h, radius, color) {
  const r2 = radius * radius;
  const x1 = x0 + w - 1;
  const y1 = y0 + h - 1;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = x < x0 + radius ? x0 + radius - x : x > x1 - radius ? x - (x1 - radius) : 0;
      const dy = y < y0 + radius ? y0 + radius - y : y > y1 - radius ? y - (y1 - radius) : 0;
      if (dx === 0 || dy === 0 || dx * dx + dy * dy <= r2) {
        if (x >= 0 && y >= 0 && x < png.width && y < png.height) {
          setPixel(png, x, y, color.r, color.g, color.b, color.a ?? 255);
        }
      }
    }
  }
}

const LETTERS = {
  G: [
    '11110',
    '10000',
    '10000',
    '10111',
    '10001',
    '10001',
    '11110',
  ],
  E: [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '11111',
  ],
  T: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
  ],
  A: [
    '01110',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001',
  ],
  P: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10000',
    '10000',
    '10000',
  ],
};

function drawLetter(png, letter, x, y, cell, color) {
  const rows = LETTERS[letter];
  rows.forEach((row, rowIndex) => {
    [...row].forEach((pixel, colIndex) => {
      if (pixel === '1') {
        roundedRect(
          png,
          Math.round(x + colIndex * cell),
          Math.round(y + rowIndex * cell),
          Math.ceil(cell * 0.82),
          Math.ceil(cell * 0.82),
          Math.max(1, Math.round(cell * 0.16)),
          color
        );
      }
    });
  });
}

function drawWord(png, letters, x, y, cell, gap, color) {
  let cursorX = x;
  letters.forEach((letter) => {
    if (letter === ' ') {
      cursorX += gap * 2;
      return;
    }
    drawLetter(png, letter, cursorX, y, cell, color);
    cursorX += 5 * cell + gap;
  });
}

function drawWordmark(png, size, y, scale = 1) {
  const cell = Math.round(size * 0.019 * scale);
  const letterW = 5 * cell;
  const gap = Math.round(size * 0.018 * scale);
  const totalW = letterW * 4 + gap * 3;
  const x = Math.round((size - totalW) / 2);

  drawWord(png, ['G', 'E', 'E', 'T'], x, y, cell, gap, { ...BRAND.white, a: 245 });
}

function drawGemark(png, size, cx, cy, scale = 1) {
  const outer = Math.round(size * 0.235 * scale);
  const inner = Math.round(size * 0.145 * scale);
  const barH = Math.max(6, Math.round(size * 0.07 * scale));
  const barW = Math.round(size * 0.18 * scale);

  // A geometric "G" keeps the mark legible at launcher icon sizes.
  circle(png, cx, cy, outer, { ...BRAND.teal, a: 255 });
  circle(png, cx, cy, inner, { r: 0, g: 0, b: 0, a: 0 });
  rect(png, cx + Math.round(size * 0.08 * scale), cy - Math.round(barH * 1.35), outer, Math.round(barH * 1.25), { r: 0, g: 0, b: 0, a: 0 });
  rect(png, cx + Math.round(size * 0.005 * scale), cy - Math.round(barH / 2), barW, barH, { ...BRAND.teal, a: 255 });
  roundedRect(png, cx + Math.round(size * 0.09 * scale), cy - Math.round(barH / 2), Math.round(size * 0.105 * scale), barH, Math.round(barH / 2), { ...BRAND.teal, a: 255 });

  // Accent node gives the simple monogram a distinct app-icon silhouette.
  circle(
    png,
    cx + Math.round(size * 0.15 * scale),
    cy - Math.round(size * 0.16 * scale),
    Math.round(size * 0.036 * scale),
    { ...BRAND.mint, a: 255 }
  );
}

function drawBackground(png, size) {
  fill(png, BRAND.navy);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const glow = (x - size * 0.75) ** 2 + (y - size * 0.18) ** 2;
      if (glow < (size * 0.42) ** 2) {
        setPixel(png, x, y, BRAND.navy2.r, BRAND.navy2.g, BRAND.navy2.b, 255);
      }
    }
  }
}

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });

  drawBackground(png, size);
  roundedRect(png, Math.round(size * 0.13), Math.round(size * 0.13), Math.round(size * 0.74), Math.round(size * 0.74), Math.round(size * 0.18), { r: 255, g: 255, b: 255, a: 18 });
  drawGemark(png, size, Math.round(size * 0.5), Math.round(size * 0.43), 1);
  drawWordmark(png, size, Math.round(size * 0.68));

  return png;
}

function drawAdaptiveIcon(size) {
  const png = new PNG({ width: size, height: size });

  fill(png, { r: 0, g: 0, b: 0, a: 0 });
  drawGemark(png, size, Math.round(size * 0.5), Math.round(size * 0.43), 0.86);
  drawWordmark(png, size, Math.round(size * 0.64), 0.84);

  return png;
}

function drawSplash(size) {
  const png = new PNG({ width: size, height: size });

  fill(png, { r: 0, g: 0, b: 0, a: 0 });
  drawGemark(png, size, Math.round(size * 0.5), Math.round(size * 0.43), 0.75);
  drawWordmark(png, size, Math.round(size * 0.62), 0.78);
  roundedRect(png, Math.round(size * 0.36), Math.round(size * 0.75), Math.round(size * 0.28), Math.max(3, Math.round(size * 0.012)), Math.round(size * 0.006), { ...BRAND.mint, a: 255 });
  return png;
}

function drawFooterLogo() {
  const png = new PNG({ width: 880, height: 200 });

  fill(png, { r: 0, g: 0, b: 0, a: 0 });
  drawGemark(png, 280, 112, 92, 0.62);
  drawWord(png, ['G', 'E', 'E', 'T', ' ', 'A', 'P', 'P'], 225, 57, 12, 17, { ...BRAND.navy, a: 255 });
  roundedRect(png, 226, 154, 438, 8, 4, { ...BRAND.teal, a: 255 });

  return png;
}

function writePng(png, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(png));
}

function writeDataUriModule(png, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const dataUri = `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
  fs.writeFileSync(
    outPath,
    `// Auto-generated from assets/geet-logo-footer.png\nexport const GEET_LOGO_DATA_URI = '${dataUri}';\n`
  );
}

function main() {
  const root = path.join(__dirname, '..');
  const assets = path.join(root, 'assets');
  const utils = path.join(root, 'utils');
  const footerLogo = drawFooterLogo();

  // Expo recommends 1024x1024 PNG app icons; the smaller favicon is for web.
  writePng(drawIcon(1024), path.join(assets, 'icon.png'));
  writePng(drawAdaptiveIcon(1024), path.join(assets, 'adaptive-icon.png'));
  writePng(drawSplash(1024), path.join(assets, 'splash-icon.png'));
  writePng(drawIcon(48), path.join(assets, 'favicon.png'));
  writePng(footerLogo, path.join(assets, 'geet-logo-footer.png'));
  writeDataUriModule(footerLogo, path.join(utils, 'geetLogo.js'));

  // eslint-disable-next-line no-console
  console.log('Generated GEET app icons into assets/.');
}

main();


export const SHOP_LOGO_STYLES = ['normal', 'outline'];

export function normalizeShopLogoUri(value) {
  const uri = String(value || '').trim();
  if (!uri) return '';
  if (!uri.startsWith('data:image/')) return '';
  return uri;
}

export function normalizeShopLogoStyle(value) {
  return value === 'outline' ? 'outline' : 'normal';
}

export function resolveShopLogo({ shopLogoUri, shopLogoStyle } = {}) {
  const uri = normalizeShopLogoUri(shopLogoUri);
  if (!uri) return null;
  return {
    uri,
    style: normalizeShopLogoStyle(shopLogoStyle),
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getExportLogoCss() {
  return `
    .report-logo-wrap {
      text-align: center;
      margin: 0 0 18px;
    }
    .shop-logo {
      display: inline-block;
      max-height: 72px;
      max-width: 220px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .shop-logo-normal {
      background: transparent;
    }
    .shop-logo-outline {
      padding: 10px 14px;
      border: 2px solid #dee2e6;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }
  `;
}

export function buildExportLogoHtml(logo, altText = 'Shop logo') {
  if (!logo?.uri) return '';
  const className =
    logo.style === 'outline' ? 'shop-logo shop-logo-outline' : 'shop-logo shop-logo-normal';
  return `<div class="report-logo-wrap"><img src="${logo.uri}" alt="${escapeHtml(altText)}" class="${className}" /></div>`;
}

export function getLogoMimeType(uri) {
  const match = String(uri || '').match(/^data:(image\/[a-zA-Z0-9+.-]+);/);
  return match ? match[1] : 'image/png';
}

export function getLogoFormatForPdf(uri) {
  const mime = getLogoMimeType(uri);
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
  if (mime.includes('webp')) return 'WEBP';
  return 'PNG';
}

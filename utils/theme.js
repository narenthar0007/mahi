import { useMemo } from 'react';
import useStore from '../store/store';

export const GST_RATE = 0.05;
export const CGST_RATE = 0.025;
export const SGST_RATE = 0.025;

export const THEME_PRESETS = {
  default: {
    id: 'default',
    label: 'Classic',
    buttonColor: '#e94560',
    textColor: '#1a1a2e',
    tabBarColor: '#16213e',
    filterSortColor: '#e94560',
    headerColor: '#1a1a2e',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    buttonColor: '#0077b6',
    textColor: '#023047',
    tabBarColor: '#03045e',
    filterSortColor: '#0096c7',
    headerColor: '#03045e',
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    buttonColor: '#2d6a4f',
    textColor: '#1b4332',
    tabBarColor: '#081c15',
    filterSortColor: '#40916c',
    headerColor: '#081c15',
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    buttonColor: '#e85d04',
    textColor: '#370617',
    tabBarColor: '#6a040f',
    filterSortColor: '#f48c06',
    headerColor: '#6a040f',
  },
  purple: {
    id: 'purple',
    label: 'Purple',
    buttonColor: '#7b2cbf',
    textColor: '#240046',
    tabBarColor: '#10002b',
    filterSortColor: '#9d4edd',
    headerColor: '#10002b',
  },
};

export const DEFAULT_THEME = { ...THEME_PRESETS.default, presetId: 'default' };

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value) {
  return HEX_COLOR.test(String(value || '').trim());
}

export function normalizeHexColor(value, fallback) {
  const trimmed = String(value || '').trim();
  if (isValidHexColor(trimmed)) return trimmed.toLowerCase();
  if (isValidHexColor(fallback)) return fallback.toLowerCase();
  return DEFAULT_THEME.buttonColor;
}

export function resolveTheme(themeState) {
  const saved = themeState && typeof themeState === 'object' ? themeState : {};
  const presetId = saved.presetId || 'default';

  if (presetId !== 'custom' && THEME_PRESETS[presetId]) {
    return { ...THEME_PRESETS[presetId], presetId };
  }

  return {
    presetId: 'custom',
    label: 'Custom',
    buttonColor: normalizeHexColor(saved.buttonColor, DEFAULT_THEME.buttonColor),
    textColor: normalizeHexColor(saved.textColor, DEFAULT_THEME.textColor),
    tabBarColor: normalizeHexColor(saved.tabBarColor, DEFAULT_THEME.tabBarColor),
    filterSortColor: normalizeHexColor(saved.filterSortColor, DEFAULT_THEME.filterSortColor),
    headerColor: normalizeHexColor(saved.headerColor, DEFAULT_THEME.headerColor),
  };
}

export function useAppTheme() {
  const themeState = useStore((s) => s.theme);
  return useMemo(() => resolveTheme(themeState), [
    themeState?.presetId,
    themeState?.buttonColor,
    themeState?.textColor,
    themeState?.tabBarColor,
    themeState?.filterSortColor,
    themeState?.headerColor,
  ]);
}

export function calculateTaxBreakdown(subtotal, taxEnabled) {
  const base = Number(subtotal) || 0;
  if (!taxEnabled) {
    return {
      subtotal: base,
      cgstAmount: 0,
      sgstAmount: 0,
      gstTotal: 0,
      total: base,
    };
  }
  const cgstAmount = Math.round(base * CGST_RATE * 100) / 100;
  const sgstAmount = Math.round(base * SGST_RATE * 100) / 100;
  const gstTotal = cgstAmount + sgstAmount;
  return {
    subtotal: base,
    cgstAmount,
    sgstAmount,
    gstTotal,
    total: Math.round((base + gstTotal) * 100) / 100,
  };
}

import { useMemo } from 'react';
import useStore from '../store/store';

export const GST_RATE = 0.05;
export const CGST_RATE = 0.025;
export const SGST_RATE = 0.025;

/**
 * Soft-minimal accent presets.
 * - buttonColor / filterSortColor: primary actions & chips
 * - textColor: emphasis text on light chrome
 * - headerColor: soft header tint (nav uses this lightly)
 * - tabBarColor: cart / menu accent chips (not the real tab bar bg)
 */
export const THEME_PRESETS = {
  default: {
    id: 'default',
    label: 'Classic',
    buttonColor: '#0F766E',
    textColor: '#0F172A',
    tabBarColor: '#0F766E',
    filterSortColor: '#0D9488',
    headerColor: '#134E4A',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    buttonColor: '#0369A1',
    textColor: '#0C4A6E',
    tabBarColor: '#0284C7',
    filterSortColor: '#0EA5E9',
    headerColor: '#0C4A6E',
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    buttonColor: '#3F6212',
    textColor: '#1A2E05',
    tabBarColor: '#4D7C0F',
    filterSortColor: '#65A30D',
    headerColor: '#365314',
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    buttonColor: '#C2410C',
    textColor: '#7C2D12',
    tabBarColor: '#EA580C',
    filterSortColor: '#F97316',
    headerColor: '#9A3412',
  },
  purple: {
    id: 'purple',
    label: 'Purple',
    buttonColor: '#6D28D9',
    textColor: '#4C1D95',
    tabBarColor: '#7C3AED',
    filterSortColor: '#8B5CF6',
    headerColor: '#5B21B6',
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

import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import useStore from '../store/store';

/** Soft-minimal shared tokens — radius 10/14/18, spacing 4–24. */
const SHARED = {
  success: '#059669',
  successBg: '#ecfdf5',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  warning: '#d97706',
  warningBg: '#fffbeb',
  info: '#2563eb',
  infoBg: '#eff6ff',
  brandWhatsApp: '#25D366',
  pressed: 'rgba(15, 23, 42, 0.06)',
  focusRing: 'rgba(15, 118, 110, 0.28)',
  radiusSm: 10,
  radiusMd: 14,
  radiusLg: 18,
  radiusXl: 18,
  radiusFull: 999,
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  type: {
    title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
    section: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
    body: { fontSize: 15, fontWeight: '400' },
    caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.1 },
    label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  },
};

export const LIGHT_UI = {
  mode: 'light',
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F4',
  border: '#E8EAF0',
  borderLight: '#EEF0F4',
  divider: '#E8EAF0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textTertiary: '#94A3B8',
  overlay: 'rgba(15, 23, 42, 0.4)',
  menuSheet: '#FFFFFF',
  ...SHARED,
  successBg: '#ecfdf5',
  dangerBg: '#fef2f2',
  warningBg: '#fffbeb',
  infoBg: '#eff6ff',
  pressed: 'rgba(15, 23, 42, 0.05)',
};

export const DARK_UI = {
  mode: 'dark',
  bg: '#0B1220',
  surface: '#151D2E',
  surfaceMuted: '#1C2638',
  border: '#243044',
  borderLight: '#1C2638',
  divider: '#243044',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textTertiary: '#64748B',
  overlay: 'rgba(0, 0, 0, 0.65)',
  menuSheet: '#151D2E',
  ...SHARED,
  successBg: 'rgba(5, 150, 105, 0.18)',
  dangerBg: 'rgba(220, 38, 38, 0.18)',
  warningBg: 'rgba(217, 119, 6, 0.18)',
  infoBg: 'rgba(37, 99, 235, 0.18)',
  info: '#7dd3fc',
  pressed: 'rgba(248, 250, 252, 0.08)',
  focusRing: 'rgba(45, 212, 191, 0.35)',
};

export function normalizeAppearanceMode(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export function getUI(mode = 'light') {
  return normalizeAppearanceMode(mode) === 'dark' ? DARK_UI : LIGHT_UI;
}

/** Live palette from store — use in components instead of static UI colors. */
export function useUI() {
  const appearanceMode = useStore((s) => s.appearanceMode);
  return useMemo(() => getUI(appearanceMode), [appearanceMode]);
}

/** Rebuild StyleSheet when light/dark changes. */
export function useThemedStyles(factory) {
  const ui = useUI();
  const styles = useMemo(() => StyleSheet.create(factory(ui)), [ui, factory]);
  return useMemo(() => ({ ui, styles }), [ui, styles]);
}

/**
 * Backward-compatible UI object.
 * Prefer useUI() / useThemedStyles() for theme-aware screens.
 * Static StyleSheet.create({ color: UI.bg }) will NOT update on toggle.
 */
export const UI = { ...LIGHT_UI };

export function shadow(level = 'sm') {
  if (Platform.OS === 'web') {
    const webShadows = {
      xs: { boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
      sm: { boxShadow: '0 2px 8px rgba(15,23,42,0.06)' },
      md: { boxShadow: '0 4px 14px rgba(15,23,42,0.07)' },
      lg: { boxShadow: '0 8px 24px rgba(15,23,42,0.09)' },
    };
    return webShadows[level] || webShadows.sm;
  }

  const nativeShadows = {
    xs: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.09,
      shadowRadius: 16,
      elevation: 5,
    },
  };
  return nativeShadows[level] || nativeShadows.sm;
}

function resolvePaletteAndExtra(first, second) {
  const looksLikeUi =
    first &&
    typeof first === 'object' &&
    (first.mode === 'light' || first.mode === 'dark') &&
    typeof first.bg === 'string';
  if (looksLikeUi) {
    return { palette: first, extra: second && typeof second === 'object' ? second : {} };
  }
  return {
    palette: LIGHT_UI,
    extra: first && typeof first === 'object' ? first : {},
  };
}

/** Pass either `cardStyle({ marginTop: 8 })` or `cardStyle(ui, { marginTop: 8 })`. */
export function cardStyle(first = {}, second) {
  const { palette, extra } = resolvePaletteAndExtra(first, second);
  return {
    backgroundColor: palette.surface,
    borderRadius: palette.radiusLg,
    borderWidth: 1,
    borderColor: palette.border,
    ...extra,
  };
}

export function floatingBar(first = {}, second) {
  const { palette, extra } = resolvePaletteAndExtra(first, second);
  return {
    backgroundColor: palette.surface,
    borderRadius: palette.radiusLg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow('sm'),
    ...extra,
  };
}

export function inputStyle(first = {}, second) {
  const { palette, extra } = resolvePaletteAndExtra(first, second);
  return {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: palette.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: palette.textPrimary,
    minHeight: 44,
    ...extra,
  };
}

export function primaryButton(color, extra = {}) {
  return {
    backgroundColor: color,
    borderRadius: SHARED.radiusMd,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('xs'),
    ...extra,
  };
}

export function sectionTitle(first = {}, second) {
  const { palette, extra } = resolvePaletteAndExtra(first, second);
  return {
    ...SHARED.type.title,
    color: palette.textPrimary,
    ...extra,
  };
}

export function accentTopBorder(color) {
  return {
    borderTopWidth: 2,
    borderTopColor: color,
  };
}

export function pillButton(color, filled = false, ui = LIGHT_UI) {
  const palette = ui?.mode ? ui : LIGHT_UI;
  return {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: palette.radiusFull,
    borderWidth: 1,
    borderColor: filled ? color : palette.border,
    backgroundColor: filled ? `${color}14` : palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

/** Hex with alpha suffix helper for soft accent fills. */
export function withAlpha(hex, alphaHex = '14') {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  return `#${h}${alphaHex}`;
}

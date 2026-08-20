import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import useStore from '../store/store';

const SHARED = {
  success: '#059669',
  successBg: '#ecfdf5',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#2563eb',
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,
  radiusFull: 999,
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

export const LIGHT_UI = {
  mode: 'light',
  bg: '#f7f8fa',
  surface: '#ffffff',
  surfaceMuted: '#f3f4f6',
  border: '#e5e7eb',
  borderLight: '#f0f1f3',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  overlay: 'rgba(17, 24, 39, 0.45)',
  menuSheet: '#ffffff',
  ...SHARED,
  successBg: '#ecfdf5',
  dangerBg: '#fef2f2',
};

export const DARK_UI = {
  mode: 'dark',
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceMuted: '#334155',
  border: '#334155',
  borderLight: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  overlay: 'rgba(0, 0, 0, 0.65)',
  menuSheet: '#1e293b',
  ...SHARED,
  successBg: 'rgba(5, 150, 105, 0.18)',
  dangerBg: 'rgba(220, 38, 38, 0.18)',
  info: '#7dd3fc',
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
      xs: { boxShadow: '0 1px 2px rgba(17,24,39,0.04)' },
      sm: { boxShadow: '0 2px 8px rgba(17,24,39,0.06)' },
      md: { boxShadow: '0 8px 24px rgba(17,24,39,0.08)' },
      lg: { boxShadow: '0 16px 40px rgba(17,24,39,0.12)' },
    };
    return webShadows[level] || webShadows.sm;
  }

  const nativeShadows = {
    xs: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
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
    borderColor: palette.borderLight,
    ...extra,
  };
}

export function floatingBar(first = {}, second) {
  const { palette, extra } = resolvePaletteAndExtra(first, second);
  return {
    backgroundColor: palette.surface,
    borderRadius: palette.radiusXl,
    borderWidth: 1,
    borderColor: palette.borderLight,
    ...shadow('md'),
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
    fontSize: 15,
    color: palette.textPrimary,
    ...extra,
  };
}

export function primaryButton(color, extra = {}) {
  return {
    backgroundColor: color,
    borderRadius: SHARED.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('sm'),
    ...extra,
  };
}

export function sectionTitle(first = {}, second) {
  const { palette, extra } = resolvePaletteAndExtra(first, second);
  return {
    fontSize: 22,
    fontWeight: '700',
    color: palette.textPrimary,
    letterSpacing: -0.3,
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
    paddingVertical: 6,
    borderRadius: palette.radiusFull,
    borderWidth: 1,
    borderColor: filled ? color : palette.border,
    backgroundColor: filled ? `${color}14` : palette.surface,
  };
}

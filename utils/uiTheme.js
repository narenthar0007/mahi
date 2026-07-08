import { Platform } from 'react-native';

export const UI = {
  bg: '#f7f8fa',
  surface: '#ffffff',
  surfaceMuted: '#f3f4f6',
  border: '#e5e7eb',
  borderLight: '#f0f1f3',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
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

export function cardStyle(extra = {}) {
  return {
    backgroundColor: UI.surface,
    borderRadius: UI.radiusLg,
    borderWidth: 1,
    borderColor: UI.borderLight,
    ...extra,
  };
}

export function floatingBar(extra = {}) {
  return {
    backgroundColor: UI.surface,
    borderRadius: UI.radiusXl,
    borderWidth: 1,
    borderColor: UI.borderLight,
    ...shadow('md'),
    ...extra,
  };
}

export function inputStyle(extra = {}) {
  return {
    backgroundColor: UI.surface,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: UI.radiusMd,
    paddingHorizontal: 14,
    fontSize: 15,
    color: UI.textPrimary,
    ...extra,
  };
}

export function primaryButton(color, extra = {}) {
  return {
    backgroundColor: color,
    borderRadius: UI.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow('sm'),
    ...extra,
  };
}

export function sectionTitle(extra = {}) {
  return {
    fontSize: 22,
    fontWeight: '700',
    color: UI.textPrimary,
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

export function pillButton(color, filled = false) {
  return {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: UI.radiusFull,
    borderWidth: 1,
    borderColor: filled ? color : UI.border,
    backgroundColor: filled ? `${color}14` : UI.surface,
  };
}

export const TABLE_BOOKER_THEMES = {
  light: {
    id: 'light',
    overlay: 'rgba(17, 24, 39, 0.45)',
    sheet: '#f7f8fa',
    surface: '#ffffff',
    surfaceMuted: '#f3f4f6',
    border: '#e5e7eb',
    borderLight: '#f0f1f3',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    accent: '#1a1a2e',
    accentText: '#ffffff',
    link: '#2563eb',
    success: '#059669',
    warn: '#b45309',
    chipActive: '#f97316',
    queueAccent: '#1a1a2e',
    seatBackdrop: 'rgba(17,24,39,0.4)',
  },
  dark: {
    id: 'dark',
    overlay: 'rgba(0, 0, 0, 0.65)',
    sheet: '#0f172a',
    surface: '#1e293b',
    surfaceMuted: '#334155',
    border: '#334155',
    borderLight: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accent: '#38bdf8',
    accentText: '#0f172a',
    link: '#7dd3fc',
    success: '#34d399',
    warn: '#fbbf24',
    chipActive: '#f97316',
    queueAccent: '#38bdf8',
    seatBackdrop: 'rgba(0,0,0,0.55)',
  },
};

export function normalizeTableBookerTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

export function getTableBookerColors(mode) {
  return TABLE_BOOKER_THEMES[normalizeTableBookerTheme(mode)];
}

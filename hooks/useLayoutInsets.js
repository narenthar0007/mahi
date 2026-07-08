import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Fallback when Android reports 0 inset (common with 3-button nav in Expo Go). */
const ANDROID_NAV_BAR_FALLBACK = 48;

/**
 * Safe area insets with a reliable bottom value on Android so content
 * clears the system navigation bar (back / home / recent).
 */
export function useLayoutInsets() {
  const insets = useSafeAreaInsets();

  const bottom =
    Platform.OS === 'android'
      ? insets.bottom > 0
        ? insets.bottom
        : ANDROID_NAV_BAR_FALLBACK
      : insets.bottom;

  return {
    top: insets.top,
    bottom,
    left: insets.left,
    right: insets.right,
  };
}

export const TAB_BAR_CONTENT_HEIGHT = 56;

export function useTabBarHeight() {
  const { bottom } = useLayoutInsets();
  return TAB_BAR_CONTENT_HEIGHT + bottom;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

export const SMALL_SCREEN_WIDTH = 360;
export const LARGE_FONT_SCALE = 1.15;
export const MAX_FONT_SCALE = 1.25;

/**
 * Layout helpers that ignore keyboard-driven dimension jitter.
 * useWindowDimensions() can briefly change on Android when a TextInput
 * focuses, which remounts menu grids and looks like UI flicker.
 */
export function useResponsiveLayout() {
  const [width, setWidth] = useState(() => Dimensions.get('window').width);
  const stickyWidthRef = useRef(width);

  useEffect(() => {
    const onChange = ({ window }) => {
      const next = window?.width;
      if (!Number.isFinite(next)) return;
      // Ignore tiny width noise from keyboard / system UI insets.
      if (Math.abs(next - stickyWidthRef.current) < 8) return;
      stickyWidthRef.current = next;
      setWidth(next);
    };

    const sub = Dimensions.addEventListener('change', onChange);
    return () => {
      if (typeof sub?.remove === 'function') sub.remove();
    };
  }, []);

  const fontScale = PixelRatio.getFontScale();
  const isNarrow = width < SMALL_SCREEN_WIDTH;
  const isLargeFont = fontScale >= LARGE_FONT_SCALE;
  const menuColumns = isNarrow || isLargeFont ? 1 : 2;
  const effectiveScale = Math.min(fontScale, MAX_FONT_SCALE);

  const scaledSize = useCallback((base) => Math.round(base * effectiveScale), [effectiveScale]);

  return useMemo(() => ({
    width,
    fontScale,
    isNarrow,
    isLargeFont,
    menuColumns,
    scaledSize,
    horizontalPad: isNarrow ? 14 : 20,
  }), [width, fontScale, isNarrow, isLargeFont, menuColumns, scaledSize]);
}

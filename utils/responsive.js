import { useWindowDimensions, PixelRatio } from 'react-native';

export const SMALL_SCREEN_WIDTH = 360;
export const LARGE_FONT_SCALE = 1.15;
export const MAX_FONT_SCALE = 1.25;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();
  const isNarrow = width < SMALL_SCREEN_WIDTH;
  const isLargeFont = fontScale >= LARGE_FONT_SCALE;
  const menuColumns = isNarrow || isLargeFont ? 1 : 2;
  const effectiveScale = Math.min(fontScale, MAX_FONT_SCALE);

  const scaledSize = (base) => Math.round(base * effectiveScale);

  return {
    width,
    fontScale,
    isNarrow,
    isLargeFont,
    menuColumns,
    scaledSize,
    horizontalPad: isNarrow ? 14 : 20,
  };
}

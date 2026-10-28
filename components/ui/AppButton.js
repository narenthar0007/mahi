import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useUI, primaryButton } from '../../utils/uiTheme';

/**
 * Soft-minimal button — variants: primary | secondary | ghost | danger
 */
export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  color,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const ui = useUI();
  const accent = color || '#0F766E';

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const bg = isPrimary
    ? accent
    : isDanger
      ? ui.danger
      : isSecondary
        ? ui.surfaceMuted
        : 'transparent';

  const borderColor = isGhost || isSecondary ? ui.border : 'transparent';
  const labelColor =
    isPrimary || isDanger ? '#FFFFFF' : isGhost ? accent : ui.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary || isDanger
          ? primaryButton(bg, { borderWidth: 0 })
          : {
              backgroundColor: bg,
              borderRadius: ui.radiusMd,
              borderWidth: 1,
              borderColor,
              minHeight: 48,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
            },
        pressed && !disabled && { opacity: 0.88 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.label, { color: labelColor }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  disabled: {
    opacity: 0.45,
  },
});

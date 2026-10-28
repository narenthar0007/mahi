import { Pressable, Text, StyleSheet } from 'react-native';
import { pillButton, useUI } from '../../utils/uiTheme';

export default function AppChip({
  label,
  selected = false,
  onPress,
  color,
  style,
  textStyle,
}) {
  const ui = useUI();
  const accent = color || '#0F766E';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        pillButton(accent, selected, ui),
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? accent : ui.textSecondary },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

import { View, Text, StyleSheet } from 'react-native';
import { useUI } from '../../utils/uiTheme';

export default function AppSectionHeader({ title, subtitle, right, style }) {
  const ui = useUI();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: ui.textPrimary }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: ui.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});

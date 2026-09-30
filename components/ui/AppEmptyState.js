import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUI } from '../../utils/uiTheme';
import AppButton from './AppButton';

export default function AppEmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  accentColor,
  style,
}) {
  const ui = useUI();
  const accent = accentColor || '#0F766E';

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
        <Ionicons name={icon} size={28} color={accent} />
      </View>
      {!!title && (
        <Text style={[styles.title, { color: ui.textPrimary }]}>{title}</Text>
      )}
      {!!subtitle && (
        <Text style={[styles.subtitle, { color: ui.textSecondary }]}>{subtitle}</Text>
      )}
      {!!actionLabel && onAction && (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          color={accent}
          style={styles.cta}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  cta: {
    marginTop: 18,
    maxWidth: 220,
  },
});

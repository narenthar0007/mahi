import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTranslation } from '../utils/i18n';
import { useUI } from '../utils/uiTheme';

export default function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { t } = useTranslation();
  const ui = useUI();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: ui.warningBg,
          borderBottomColor: ui.warning,
        },
      ]}
    >
      <Text style={[styles.text, { color: ui.warning }]} numberOfLines={2}>
        {t('offlineBanner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTranslation } from '../utils/i18n';

export default function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { t } = useTranslation();

  if (!isOffline) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.banner}>
        <Text style={styles.text} numberOfLines={2}>
          {t('offlineBanner')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#fef3c7',
  },
  banner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  text: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
  },
});

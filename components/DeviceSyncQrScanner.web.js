import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Web has no QR camera host path — use paste/join instead. */
export default function DeviceSyncQrScanner() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>Camera scan is not available on web. Paste the QR code text instead.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 120,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
  },
});

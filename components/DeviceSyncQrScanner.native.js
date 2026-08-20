import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function DeviceSyncQrScanner({ disabled, onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (active) setReady(Boolean(result?.granted));
      } else if (active) {
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [permission?.granted, requestPermission]);

  if (!ready && !permission?.granted) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.text}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          disabled
            ? undefined
            : ({ data }) => {
                if (data) onScan?.(data);
              }
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  text: {
    color: '#fff',
    padding: 16,
    textAlign: 'center',
  },
});

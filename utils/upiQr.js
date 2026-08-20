import { Platform } from 'react-native';

const MAX_DATA_URI_CHARS = 2_200_000;

export function normalizeUpiQrUri(value) {
  const uri = String(value || '').trim();
  if (!uri) return '';
  if (!uri.startsWith('data:image/')) return '';
  return uri;
}

export function getUpiQrMimeType(uri) {
  const match = String(uri || '').match(/^data:(image\/[a-zA-Z0-9+.-]+);/);
  return match ? match[1] : 'image/jpeg';
}

/**
 * Pick a UPI QR photo from the gallery and return a compressed data URI.
 */
export async function pickUpiQrImage() {
  const ImagePicker = await import('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { success: false, error: 'permission' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.65,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, error: 'cancelled' };
  }

  const asset = result.assets[0];
  let dataUri = '';

  if (asset.base64) {
    const mime = asset.mimeType || 'image/jpeg';
    dataUri = `data:${mime};base64,${asset.base64}`;
  } else if (asset.uri && Platform.OS === 'web') {
    // Web may return blob URLs — convert to data URI for persistence.
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return { success: false, error: 'read_failed' };
    }
  } else if (asset.uri) {
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mime = asset.mimeType || 'image/jpeg';
      dataUri = `data:${mime};base64,${base64}`;
    } catch {
      return { success: false, error: 'read_failed' };
    }
  }

  dataUri = normalizeUpiQrUri(dataUri);
  if (!dataUri) return { success: false, error: 'invalid' };
  if (dataUri.length > MAX_DATA_URI_CHARS) {
    return { success: false, error: 'too_large' };
  }

  return { success: true, uri: dataUri };
}

/** Write a data-URI QR to a cache file for native share / WhatsApp. */
export async function materializeUpiQrFile(dataUri) {
  const uri = normalizeUpiQrUri(dataUri);
  if (!uri) throw new Error('invalid_upi_qr');

  if (Platform.OS === 'web') {
    return { uri, mimeType: getUpiQrMimeType(uri), isDataUri: true };
  }

  const FileSystem = await import('expo-file-system/legacy');
  const match = uri.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) throw new Error('invalid_upi_qr');

  const mimeType = match[1];
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const fileUri = `${FileSystem.cacheDirectory}upi-qr-share.${ext}`;
  const existing = await FileSystem.getInfoAsync(fileUri);
  if (existing.exists) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  }
  await FileSystem.writeAsStringAsync(fileUri, match[2], {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: fileUri, mimeType, isDataUri: false };
}

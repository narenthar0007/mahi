import { Alert, Platform } from 'react-native';

export function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(title, message, onConfirm, confirmLabel = 'OK') {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (window.confirm(text)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

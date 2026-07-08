import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { UI, cardStyle } from '../utils/uiTheme';

export default function OwnerTokenModal({ visible, title, message, onConfirm, onCancel }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [token, setToken] = useState('');

  useEffect(() => {
    if (visible) setToken('');
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(token);
    setToken('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.title, { color: theme.textColor }]}>
              {title || t('ownerTokenRequired')}
            </Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder={t('ownerTokenPlaceholder')}
              placeholderTextColor="#adb5bd"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.buttonColor }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    ...cardStyle({ padding: 24, borderRadius: UI.radiusXl }),
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: UI.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  input: {
    backgroundColor: UI.surfaceMuted,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: UI.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: UI.textPrimary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: UI.radiusSm,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: UI.surfaceMuted,
    borderWidth: 1,
    borderColor: UI.border,
  },
  cancelText: {
    color: UI.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

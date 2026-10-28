import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { cardStyle, useThemedStyles } from '../utils/uiTheme';

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const { ui, styles } = useThemedStyles(createStyles);
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.overlay}
        onPress={onCancel}
      >
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
        >
          <Text
            style={[
              styles.title,
              { color: ui.textPrimary },
            ]}
          >
            {title}
          </Text>

          {message ? (
            <Text style={styles.message}>
              {message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.cancelBtn,
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>
                {cancelLabel || t('cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: theme.buttonColor },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(ui) {
  return {
    overlay: {
      flex: 1,
      backgroundColor: ui.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },

    card: {
      width: '100%',
      maxWidth: 320,
      ...cardStyle(ui, {
        padding: 24,
        borderRadius: ui.radiusLg,
      }),
    },

    title: {
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 8,
      letterSpacing: -0.2,
      color: ui.textPrimary,
    },

    message: {
      fontSize: 15,
      color: ui.textSecondary,
      lineHeight: 22,
      marginBottom: 20,
    },

    actions: {
      flexDirection: 'row',
      gap: 10,
    },

    btn: {
      flex: 1,
      paddingVertical: 14,
      minHeight: 48,
      borderRadius: ui.radiusMd,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelBtn: {
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
    },

    cancelText: {
      color: ui.textSecondary,
      fontWeight: '600',
      fontSize: 15,
    },

    confirmText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 15,
    },
  };
}
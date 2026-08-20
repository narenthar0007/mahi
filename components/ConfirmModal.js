import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
              { color: theme.textColor },
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
  return StyleSheet.create({
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
      ...cardStyle(ui, {
        padding: 24,
        borderRadius: ui.radiusXl,
      }),
    },

    title: {
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 8,
      letterSpacing: -0.2,
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
      paddingVertical: 12,
      borderRadius: ui.radiusSm,
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
      fontWeight: '700',
      fontSize: 15,
    },

    confirmText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
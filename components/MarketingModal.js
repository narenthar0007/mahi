import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { useThemedStyles } from '../utils/uiTheme';
import { MarketingPanel } from '../screens/MarketingScreen';

export default function MarketingModal({ visible, onClose }) {
  const { ui, styles } = useThemedStyles(createStyles);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.textColor }]}>
                {t('marketingTitle')}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {t('marketingSubtitle')}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={[styles.closeText, { color: theme.buttonColor }]}>
                {t('close')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.panelWrap}>
            {visible ? <MarketingPanel embedded bottomPad={16} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(ui) {
  return {
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(11, 18, 32, 0.45)',
    },
    sheet: {
      backgroundColor: ui.bg,
      borderTopLeftRadius: ui.radiusXl,
      borderTopRightRadius: ui.radiusXl,
      maxHeight: '92%',
      overflow: 'hidden',
      flexShrink: 1,
    },
    panelWrap: {
      flexGrow: 1,
      flexShrink: 1,
      minHeight: 240,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: ui.border,
      marginTop: 10,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: ui.borderLight,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 12,
      color: ui.textMuted,
      marginTop: 4,
      lineHeight: 17,
    },
    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    closeText: {
      fontSize: 15,
      fontWeight: '700',
    },
  };
}

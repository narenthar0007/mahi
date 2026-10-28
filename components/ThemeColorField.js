import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { isValidHexColor, normalizeHexColor, useAppTheme } from '../utils/theme';
import { useThemedStyles } from '../utils/uiTheme';

const COLOR_SWATCHES = [
  '#000000', '#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#ffffff',
  '#134E4A', '#0F766E', '#0D9488', '#14B8A6', '#5EEAD4', '#99F6E4', '#CCFBF1', '#F0FDFA',
  '#0C4A6E', '#0369A1', '#0284C7', '#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE',
  '#365314', '#3F6212', '#4D7C0F', '#65A30D', '#84CC16', '#BEF264', '#D9F99D', '#F7FEE7',
  '#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFF7ED',
  '#5B21B6', '#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#F5F3FF',
];

function WebColorInput({ value, onChange, onOpenPicker, accentColor, styles }) {
  if (Platform.OS !== 'web') return null;

  const safeValue = isValidHexColor(value) ? value : '#000000';
  const accent = accentColor || '#0F766E';

  return (
    <View style={styles.webPickerWrap}>
      <input
        type="color"
        value={safeValue}
        onChange={(event) => onChange(normalizeHexColor(event.target.value, safeValue))}
        title="Choose any color"
        style={{
          width: 44,
          height: 36,
          border: '1px solid #E8EAF0',
          borderRadius: 10,
          padding: 2,
          cursor: 'pointer',
          backgroundColor: '#fff',
        }}
      />
      <TouchableOpacity
        style={[styles.pickBtn, { backgroundColor: `${accent}22` }]}
        onPress={onOpenPicker}
      >
        <Text style={[styles.pickBtnText, { color: accent }]}>Swatches</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ThemeColorField({ label, value, onChange }) {
  const theme = useAppTheme();
  const { ui, styles } = useThemedStyles(createStyles);
  const [pickerVisible, setPickerVisible] = useState(false);
  const displayColor = isValidHexColor(value) ? value : ui.border;

  const applyColor = (nextColor) => {
    onChange(normalizeHexColor(nextColor, displayColor));
  };

  return (
    <View style={styles.colorRow}>
      <TouchableOpacity
        style={[styles.colorPreview, { backgroundColor: displayColor }]}
        onPress={() => setPickerVisible(true)}
        accessibilityLabel={`Pick ${label}`}
      />

      <View style={styles.colorField}>
        <Text style={styles.colorLabel}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.colorInput}
            value={value}
            onChangeText={onChange}
            placeholder="#000000"
            placeholderTextColor={ui.textMuted}
            autoCapitalize="none"
            maxLength={7}
          />
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              style={[styles.pickBtn, { backgroundColor: `${theme.filterSortColor}22` }]}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={[styles.pickBtnText, { color: theme.filterSortColor }]}>Pick color</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <WebColorInput
          value={value}
          onChange={applyColor}
          onOpenPicker={() => setPickerVisible(true)}
          accentColor={theme.filterSortColor}
          styles={styles}
        />
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerVisible(false)} />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>{label}</Text>
            <Text style={styles.pickerHint}>Tap a color to apply it</Text>
            <ScrollView
              style={styles.pickerScroll}
              contentContainerStyle={styles.swatchGridWrap}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View style={styles.swatchGrid}>
                {COLOR_SWATCHES.map((swatch) => {
                  const selected =
                    isValidHexColor(value) &&
                    value.toLowerCase() === swatch.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={swatch}
                      style={[
                        styles.swatch,
                        { backgroundColor: swatch },
                        selected && { borderColor: theme.buttonColor, borderWidth: 3 },
                      ]}
                      onPress={() => {
                        applyColor(swatch);
                        setPickerVisible(false);
                      }}
                    />
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.pickerCloseBtn, { backgroundColor: theme.buttonColor }]}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(ui) {
  return {
    colorRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    colorPreview: {
      width: 36,
      height: 36,
      borderRadius: ui.radiusSm,
      borderWidth: 1,
      borderColor: ui.border,
      marginTop: 18,
    },
    colorField: {
      flex: 1,
    },
    colorLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: ui.textMuted,
      marginBottom: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    colorInput: {
      flex: 1,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: ui.radiusSm,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: ui.textPrimary,
      minHeight: 44,
    },
    pickBtn: {
      borderRadius: ui.radiusSm,
      paddingHorizontal: 10,
      paddingVertical: 9,
      minHeight: 44,
      justifyContent: 'center',
    },
    pickBtnText: {
      fontSize: 12,
      fontWeight: '700',
    },
    webPickerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    pickerOverlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    pickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: ui.overlay,
    },
    pickerSheet: {
      backgroundColor: ui.surface,
      borderRadius: ui.radiusLg,
      padding: 16,
      borderWidth: 1,
      borderColor: ui.border,
      maxHeight: '80%',
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: ui.textPrimary,
      marginBottom: 4,
    },
    pickerHint: {
      fontSize: 12,
      color: ui.textMuted,
      marginBottom: 12,
    },
    pickerScroll: {
      maxHeight: 280,
    },
    swatchGridWrap: {
      paddingBottom: 8,
    },
    swatchGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: ui.border,
    },
    pickerCloseBtn: {
      marginTop: 12,
      borderRadius: ui.radiusMd,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 48,
    },
    pickerCloseText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  };
}

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

const COLOR_SWATCHES = [
  '#000000', '#212529', '#495057', '#868e96', '#adb5bd', '#dee2e6', '#f8f9fa', '#ffffff',
  '#6a040f', '#9d0208', '#d00000', '#e94560', '#ff6b6b', '#f8ad9d', '#ffc9c9', '#fff0f3',
  '#370617', '#6a040f', '#e85d04', '#f48c06', '#ffba08', '#ffd60a', '#fff3bf', '#fff9db',
  '#081c15', '#1b4332', '#2d6a4f', '#40916c', '#52b788', '#95d5b2', '#d8f3dc', '#f1faee',
  '#03045e', '#023047', '#0077b6', '#0096c7', '#48cae4', '#90e0ef', '#caf0f8', '#e0fbfc',
  '#10002b', '#240046', '#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff', '#f3d9ff', '#faf5ff',
  '#0b132b', '#1a1a2e', '#16213e', '#0f3460', '#533483', '#2b2d42', '#14213d', '#283618',
];

function WebColorInput({ value, onChange, onOpenPicker, accentColor }) {
  if (Platform.OS !== 'web') return null;

  const safeValue = isValidHexColor(value) ? value : '#000000';
  const accent = accentColor || '#495057';

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
          border: '1px solid #dee2e6',
          borderRadius: 8,
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const displayColor = isValidHexColor(value) ? value : '#dee2e6';

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
            placeholderTextColor="#adb5bd"
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

const styles = StyleSheet.create({
  colorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginTop: 18,
  },
  colorField: {
    flex: 1,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#868e96',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1a1a2e',
  },
  pickBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    height: '80%',
    flexDirection: 'column',
    zIndex: 1,
    elevation: 8,
  },
  pickerScroll: {
    flex: 1,
    minHeight: 0,
  },
  swatchGridWrap: {
    paddingBottom: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  pickerHint: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 12,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pickerCloseBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerCloseText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});

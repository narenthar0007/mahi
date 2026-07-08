import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { calculateItemPrice } from '../store/store';
import { formatCurrency } from '../utils/currency';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { UI, cardStyle } from '../utils/uiTheme';

export default function ItemConfigModal({ visible, item, onClose, onAddToCart }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);

  const hasVariants = item?.variants?.length > 0;
  const hasAddons = item?.addons?.length > 0;

  useEffect(() => {
    if (visible && item) {
      setSelectedVariant(hasVariants ? null : null);
      setSelectedAddons([]);
    }
  }, [visible, item, hasVariants]);

  if (!item) return null;

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.name === addon.name);
      if (exists) {
        return prev.filter((a) => a.name !== addon.name);
      }
      return [...prev, addon];
    });
  };

  const isAddonSelected = (addon) =>
    selectedAddons.some((a) => a.name === addon.name);

  const canAdd = !hasVariants || selectedVariant !== null;
  const previewPrice = calculateItemPrice(item, selectedVariant, selectedAddons);

  const handleAdd = () => {
    if (!canAdd) return;
    onAddToCart(item, selectedVariant, selectedAddons);
    onClose();
  };

  const selectedOptionStyle = {
    borderColor: theme.buttonColor,
    backgroundColor: `${theme.buttonColor}18`,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: theme.textColor }]}>{item.name}</Text>
          <Text style={styles.subtitle}>
            {t('basePriceLabel', { price: formatCurrency(item.basePrice) })}
            {hasVariants ? t('variantReplacesBase') : ''}
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {hasVariants && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                  {t('selectVariant')}
                </Text>
                {item.variants.map((variant) => {
                  const isSelected = selectedVariant?.name === variant.name;
                  return (
                    <TouchableOpacity
                      key={variant.name}
                      style={[styles.optionRow, isSelected && selectedOptionStyle]}
                      onPress={() => setSelectedVariant(variant)}
                    >
                      <View style={[styles.radioOuter, { borderColor: theme.buttonColor }]}>
                        {isSelected ? (
                          <View style={[styles.radioInner, { backgroundColor: theme.buttonColor }]} />
                        ) : null}
                      </View>
                      <Text style={[styles.optionName, { color: theme.textColor }]}>
                        {variant.name}
                      </Text>
                      <Text style={[styles.optionPrice, { color: theme.buttonColor }]}>
                        {formatCurrency(variant.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {hasAddons && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                  {t('addonsOptional')}
                </Text>
                {item.addons.map((addon) => {
                  const selected = isAddonSelected(addon);
                  return (
                    <TouchableOpacity
                      key={addon.name}
                      style={[styles.optionRow, selected && selectedOptionStyle]}
                      onPress={() => toggleAddon(addon)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: theme.buttonColor },
                          selected && { backgroundColor: theme.buttonColor },
                        ]}
                      >
                        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={[styles.optionName, { color: theme.textColor }]}>
                        {addon.name}
                      </Text>
                      <Text style={[styles.optionPrice, { color: theme.buttonColor }]}>
                        +{formatCurrency(addon.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {!hasVariants && !hasAddons && (
              <Text style={styles.noOptions}>{t('noVariantsAddons')}</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.totalLabel}>{t('itemTotal')}</Text>
            <Text style={[styles.totalValue, { color: theme.textColor }]}>
              {formatCurrency(previewPrice)}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: theme.buttonColor },
                !canAdd && styles.addBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={styles.addText}>{t('addToCart')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: UI.surface,
    borderTopLeftRadius: UI.radiusXl,
    borderTopRightRadius: UI.radiusXl,
    maxHeight: '85%',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: UI.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: UI.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 320,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: UI.radiusMd,
    backgroundColor: UI.surfaceMuted,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  optionName: {
    flex: 1,
    fontSize: 16,
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  noOptions: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6c757d',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  addBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.45,
  },
  addText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

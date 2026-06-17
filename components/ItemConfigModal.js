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

export default function ItemConfigModal({ visible, item, onClose, onAddToCart }) {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.subtitle}>
            Base price: {formatCurrency(item.basePrice)}
            {hasVariants ? ' (variant replaces base)' : ''}
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {hasVariants && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select a variant *</Text>
                {item.variants.map((variant) => (
                  <TouchableOpacity
                    key={variant.name}
                    style={[
                      styles.optionRow,
                      selectedVariant?.name === variant.name && styles.optionSelected,
                    ]}
                    onPress={() => setSelectedVariant(variant)}
                  >
                    <View style={styles.radioOuter}>
                      {selectedVariant?.name === variant.name && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.optionName}>{variant.name}</Text>
                    <Text style={styles.optionPrice}>{formatCurrency(variant.price)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {hasAddons && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add-ons (optional)</Text>
                {item.addons.map((addon) => (
                  <TouchableOpacity
                    key={addon.name}
                    style={[
                      styles.optionRow,
                      isAddonSelected(addon) && styles.optionSelected,
                    ]}
                    onPress={() => toggleAddon(addon)}
                  >
                    <View style={[styles.checkbox, isAddonSelected(addon) && styles.checkboxChecked]}>
                      {isAddonSelected(addon) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.optionName}>{addon.name}</Text>
                    <Text style={styles.optionPrice}>+{formatCurrency(addon.price)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!hasVariants && !hasAddons && (
              <Text style={styles.noOptions}>No variants or add-ons. Tap Add to cart.</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.totalLabel}>Item total</Text>
            <Text style={styles.totalValue}>{formatCurrency(previewPrice)}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={styles.addText}>Add to Cart</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
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
    color: '#16213e',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#e94560',
    backgroundColor: '#fff0f3',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e94560',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#e94560',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  optionName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a2e',
  },
  optionPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e94560',
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
    color: '#1a1a2e',
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
    backgroundColor: '#e94560',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#f4a5b4',
  },
  addText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

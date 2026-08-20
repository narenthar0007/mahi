import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import uuid from 'react-native-uuid';
import useStore, { calculateItemPrice } from '../store/store';
import ItemConfigModal from './ItemConfigModal';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { formatCurrency } from '../utils/currency';
import { showAlert } from '../utils/alert';
import { cardStyle, useThemedStyles } from '../utils/uiTheme';
import { useLayoutInsets } from '../hooks/useLayoutInsets';

function lineLabel(line) {
  let name = line.name || '';

  if (line.selectedVariant?.name) {
    name += ` (${line.selectedVariant.name})`;
  }

  if (line.selectedAddons?.length) {
    name += ` + ${line.selectedAddons.map((a) => a.name).join(', ')}`;
  }

  return name;
}

function sameConfig(a, b) {
  const av = a?.selectedVariant?.name || '';
  const bv = b?.selectedVariant?.name || '';

  const aa = (a?.selectedAddons || [])
    .map((x) => x.name)
    .sort()
    .join('|');

  const ba = (b?.selectedAddons || [])
    .map((x) => x.name)
    .sort()
    .join('|');

  return (
    String(a?.itemId) === String(b?.itemId) &&
    av === bv &&
    aa === ba &&
    Number(a?.unitPrice) === Number(b?.unitPrice)
  );
}

export default function EditOrderModal({
  visible,
  order,
  onClose,
  onSave,
}) {
  const { ui, styles } = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const theme = useAppTheme();
  const { bottom: bottomInset } = useLayoutInsets();

  const inventory = useStore((s) => s.inventory);

  const [lines, setLines] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [configItem, setConfigItem] = useState(null);

  // Memoize the dynamic style so a new object is not created
  // on every render.
  const sheetStyle = useMemo(
    () => ({
      paddingBottom: 16 + bottomInset,
    }),
    [bottomInset]
  );

  useEffect(() => {
    if (!visible || !order) return;

    setLines(
      (order.items || []).map((line) => {
        const quantity =
          Number(line.quantity) > 0
            ? Number(line.quantity)
            : 1;

        const unitPrice =
          Number(line.unitPrice) || 0;

        return {
          ...line,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
        };
      })
    );

    setPickerOpen(false);
    setItemSearch('');
    setConfigItem(null);
  }, [visible, order]);

  const previewTotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Number(line.totalPrice || 0),
        0
      ),
    [lines]
  );

  const filteredInventory = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const list = Array.isArray(inventory)
      ? inventory
      : [];

    if (!q) return list;

    return list.filter((item) =>
      String(item.name || '')
        .toLowerCase()
        .includes(q)
    );
  }, [inventory, itemSearch]);

  const updateQty = useCallback((id, delta) => {
    setLines((prev) =>
      prev
        .map((line) => {
          if (line.id !== id) return line;

          const nextQty =
            Number(line.quantity) + delta;

          if (nextQty <= 0) return null;

          return {
            ...line,
            quantity: nextQty,
            totalPrice:
              Number(line.unitPrice) * nextQty,
          };
        })
        .filter(Boolean)
    );
  }, []);

  const removeLine = useCallback((id) => {
    setLines((prev) =>
      prev.filter((line) => line.id !== id)
    );
  }, []);

  const appendConfiguredItem = useCallback(
    (
      item,
      selectedVariant,
      selectedAddons,
      quantity = 1,
      options = {}
    ) => {
      const qty = Number(quantity);

      if (!Number.isFinite(qty) || qty <= 0) {
        return;
      }

      const priceOverride =
        options?.unitPrice !== undefined &&
        options?.unitPrice !== null
          ? options.unitPrice
          : null;

      const unitPrice = calculateItemPrice(
        item,
        selectedVariant,
        selectedAddons,
        priceOverride
      );

      const nextLine = {
        id: String(uuid.v4()),
        itemId: item.id,
        name: item.name,
        selectedVariant:
          selectedVariant || null,
        selectedAddons:
          selectedAddons || [],
        quantity: qty,
        unitPrice,
        totalPrice: unitPrice * qty,
        isWeightBased:
          Boolean(item?.isWeightBased),
        isVariablePrice:
          Boolean(item?.isVariablePrice),
        unit: item?.unit || '',
      };

      setLines((prev) => {
        const existingIndex = prev.findIndex(
          (line) =>
            sameConfig(line, nextLine)
        );

        if (existingIndex === -1) {
          return [...prev, nextLine];
        }

        const existing =
          prev[existingIndex];

        const nextQty =
          Number(existing.quantity) + qty;

        const updated = {
          ...existing,
          quantity: nextQty,
          totalPrice:
            Number(existing.unitPrice) *
            nextQty,
        };

        const copy = prev.slice();
        copy[existingIndex] = updated;

        return copy;
      });

      setConfigItem(null);
      setPickerOpen(false);
      setItemSearch('');
    },
    []
  );

  const handlePickInventoryItem = useCallback(
    (item) => {
      const needsConfig =
        item?.variants?.length > 0 ||
        item?.addons?.length > 0 ||
        item?.isWeightBased ||
        item?.isVariablePrice;

      if (needsConfig) {
        setConfigItem(item);
        return;
      }

      appendConfiguredItem(
        item,
        null,
        [],
        1
      );
    },
    [appendConfiguredItem]
  );

  const handleSave = useCallback(() => {
    if (!lines.length) {
      showAlert(
        t('validation'),
        t('editOrderNeedItem')
      );
      return;
    }

    onSave?.(lines);
  }, [lines, onSave, t]);

  const closeConfigItem = useCallback(() => {
    setConfigItem(null);
  }, []);

  const togglePicker = useCallback(() => {
    setPickerOpen((open) => !open);
  }, []);

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />

        <View style={[styles.sheet, sheetStyle]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text
                style={[
                  styles.title,
                  { color: theme.textColor },
                ]}
              >
                {t('editOrderItems')}
              </Text>

              <Text style={styles.sub}>
                {t('orderIdLabel')}{' '}
                {order.orderId || order.id}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.close}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('cancel')}
            >
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={
              styles.listContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {lines.map((line) => (
              <View
                key={line.id}
                style={styles.row}
              >
                <View style={styles.rowCopy}>
                  <Text
                    style={styles.itemName}
                    numberOfLines={2}
                  >
                    {lineLabel(line)}
                  </Text>

                  <Text style={styles.itemPrice}>
                    {formatCurrency(
                      line.unitPrice
                    )}{' '}
                    × {line.quantity} ={' '}
                    {formatCurrency(
                      line.totalPrice
                    )}
                  </Text>
                </View>

                <View style={styles.qtyBox}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQty(
                        line.id,
                        -1
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        styles.qtyBtnText
                      }
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={styles.qtyValue}
                  >
                    {line.quantity}
                  </Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQty(
                        line.id,
                        1
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={
                        styles.qtyBtnText
                      }
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() =>
                    removeLine(line.id)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={styles.removeText}
                  >
                    {t('remove')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {!lines.length ? (
              <Text
                style={styles.emptyHint}
              >
                {t('editOrderNeedItem')}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.addItemsBtn,
                {
                  borderColor:
                    theme.buttonColor,
                },
              ]}
              onPress={togglePicker}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.addItemsBtnText,
                  {
                    color:
                      theme.buttonColor,
                  },
                ]}
              >
                {pickerOpen
                  ? t('hideInventory')
                  : t('addItemsToOrder')}
              </Text>
            </TouchableOpacity>

            {pickerOpen ? (
              <View
                style={styles.pickerBox}
              >
                <TextInput
                  style={styles.searchInput}
                  value={itemSearch}
                  onChangeText={
                    setItemSearch
                  }
                  placeholder={t(
                    'searchItems'
                  )}
                  placeholderTextColor={
                    ui.textMuted
                  }
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                {filteredInventory.length ===
                0 ? (
                  <Text
                    style={
                      styles.emptyHint
                    }
                  >
                    {t('noItemsFound')}
                  </Text>
                ) : (
                  filteredInventory.map(
                    (item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={
                          styles.inventoryRow
                        }
                        onPress={() =>
                          handlePickInventoryItem(
                            item
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={
                            styles.inventoryName
                          }
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>

                        <Text
                          style={
                            styles.inventoryPrice
                          }
                        >
                          {formatCurrency(
                            item.basePrice
                          )}
                        </Text>
                      </TouchableOpacity>
                    )
                  )
                )}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Text
              style={styles.previewTotal}
            >
              {t('itemsSubtotal')}:{' '}
              {formatCurrency(
                previewTotal
              )}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text
                  style={styles.cancelText}
                >
                  {t('cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      theme.buttonColor,
                  },
                ]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text
                  style={styles.saveText}
                >
                  {t('saveChanges')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ItemConfigModal
        visible={Boolean(configItem)}
        item={configItem}
        onClose={closeConfigItem}
        onAddToCart={
          appendConfiguredItem
        }
      />
    </Modal>
  );
}

function createStyles(ui) {
  return {
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor:
        'rgba(17,24,39,0.45)',
    },

    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },

    sheet: {
      maxHeight: '88%',
      backgroundColor: ui.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
      paddingHorizontal: 16,

      ...Platform.select({
        web: {
          maxWidth: 560,
          alignSelf: 'center',
          width: '100%',
        },
        default: {},
      }),
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },

    headerCopy: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      fontSize: 18,
      fontWeight: '800',
    },

    sub: {
      fontSize: 13,
      color: '#868e96',
      marginTop: 4,
      fontWeight: '600',
    },

    close: {
      fontSize: 20,
      color: '#868e96',
      fontWeight: '700',
    },

    list: {
      flexGrow: 0,
    },

    listContent: {
      paddingBottom: 8,
    },

    row: {
      ...cardStyle(ui, {
        padding: 12,
        borderRadius: 12,
      }),
      marginBottom: 10,
    },

    rowCopy: {
      marginBottom: 10,
    },

    itemName: {
      fontSize: 15,
      fontWeight: '700',
      color: ui.textPrimary,
    },

    itemPrice: {
      fontSize: 13,
      color: '#868e96',
      marginTop: 4,
      fontWeight: '600',
    },

    qtyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },

    qtyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#f1f3f5',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: ui.border,
    },

    qtyBtnText: {
      fontSize: 20,
      fontWeight: '700',
      color: ui.textPrimary,
    },

    qtyValue: {
      minWidth: 28,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '800',
    },

    removeBtn: {
      alignSelf: 'flex-start',
    },

    removeText: {
      color: '#c92a2a',
      fontWeight: '700',
      fontSize: 13,
    },

    emptyHint: {
      textAlign: 'center',
      color: '#868e96',
      paddingVertical: 16,
      fontSize: 14,
    },

    addItemsBtn: {
      borderWidth: 1.5,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 10,
      backgroundColor: ui.surface,
    },

    addItemsBtnText: {
      fontWeight: '800',
      fontSize: 14,
    },

    pickerBox: {
      borderWidth: 1,
      borderColor: ui.borderLight,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      backgroundColor:
        ui.surfaceMuted || '#f8f9fa',
      gap: 8,
    },

    searchInput: {
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: ui.textPrimary,
      backgroundColor: ui.surface,
    },

    inventoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        ui.borderLight,
      gap: 10,
    },

    inventoryName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: ui.textPrimary,
    },

    inventoryPrice: {
      fontSize: 13,
      fontWeight: '700',
      color: ui.textSecondary,
    },

    footer: {
      borderTopWidth: 1,
      borderTopColor: '#f1f3f5',
      paddingTop: 12,
      marginTop: 4,
    },

    previewTotal: {
      fontSize: 15,
      fontWeight: '700',
      color: ui.textPrimary,
      marginBottom: 12,
    },

    actions: {
      flexDirection: 'row',
      gap: 10,
    },

    cancelBtn: {
      flex: 1,
      backgroundColor: '#f1f3f5',
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: ui.border,
    },

    cancelText: {
      fontWeight: '700',
      color: '#495057',
    },

    saveBtn: {
      flex: 1.2,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },

    saveText: {
      fontWeight: '800',
      color: '#fff',
    },
  };
}
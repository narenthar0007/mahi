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
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { calculateItemPrice } from '../store/store';
import {
  formatCurrency,
  sanitizePriceInput,
} from '../utils/currency';
import { showAlert } from '../utils/alert';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { useThemedStyles } from '../utils/uiTheme';

const formatQtyDisplay = (value) => {
  const num = Number(value);

  if (!Number.isFinite(num)) return '1';

  return Number.isInteger(num)
    ? String(num)
    : String(Math.round(num * 100) / 100);
};

export default function ItemConfigModal({
  visible,
  item,
  onClose,
  onAddToCart,
}) {
  const { ui, styles } = useThemedStyles(createStyles);

  const theme = useAppTheme();
  const { t } = useTranslation();

  const [selectedVariant, setSelectedVariant] =
    useState(null);
  const [selectedAddons, setSelectedAddons] =
    useState([]);
  const [quantityText, setQuantityText] =
    useState('1');
  const [sellingPriceText, setSellingPriceText] =
    useState('');

  const hasVariants =
    item?.variants?.length > 0;
  const hasAddons =
    item?.addons?.length > 0;
  const isWeightBased =
    Boolean(item?.isWeightBased);
  const isVariablePrice =
    Boolean(item?.isVariablePrice);

  useEffect(() => {
    if (!visible || !item) return;

    setSelectedVariant(null);
    setSelectedAddons([]);
    setQuantityText('1');

    setSellingPriceText(
      item.basePrice === 0 || item.basePrice
        ? String(item.basePrice ?? '')
        : ''
    );
  }, [visible, item]);

  const toggleAddon = useCallback((addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find(
        (a) => a.name === addon.name
      );

      if (exists) {
        return prev.filter(
          (a) => a.name !== addon.name
        );
      }

      return [...prev, addon];
    });
  }, []);

  const isAddonSelected = useCallback(
    (addon) =>
      selectedAddons.some(
        (a) => a.name === addon.name
      ),
    [selectedAddons]
  );

  const canAdd =
    !hasVariants ||
    selectedVariant !== null;

  const priceOverride = isVariablePrice
    ? sellingPriceText
    : null;

  const unitPrice = useMemo(
    () =>
      calculateItemPrice(
        item,
        selectedVariant,
        selectedAddons,
        priceOverride
      ),
    [
      item,
      selectedVariant,
      selectedAddons,
      priceOverride,
    ]
  );

  const quantity = Number(quantityText);

  const previewTotal =
    Number.isFinite(quantity) &&
    quantity > 0
      ? unitPrice * quantity
      : unitPrice;

  const adjustQuantity = useCallback(
    (delta) => {
      setQuantityText((currentText) => {
        const current = Number(currentText);

        const base =
          Number.isFinite(current) &&
          current > 0
            ? current
            : 0;

        const step = isWeightBased
          ? 0.25
          : 1;

        const next = Math.max(
          step,
          Math.round(
            (base + delta) * 100
          ) / 100
        );

        return formatQtyDisplay(next);
      });
    },
    [isWeightBased]
  );

  const handleAdd = useCallback(() => {
    if (!canAdd) return;

    const qty = Number(quantityText);

    if (
      !Number.isFinite(qty) ||
      qty <= 0
    ) {
      showAlert(
        t('validation'),
        t('quantityRequired')
      );
      return;
    }

    if (
      !isWeightBased &&
      (!Number.isInteger(qty) || qty < 1)
    ) {
      showAlert(
        t('validation'),
        t('quantityWholeRequired')
      );
      return;
    }

    let options = {};

    if (isVariablePrice) {
      const sellingPrice =
        Number(sellingPriceText);

      if (
        sellingPriceText === '' ||
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        showAlert(
          t('validation'),
          t('sellingPriceRequired')
        );
        return;
      }

      options = {
        unitPrice: sellingPrice,
      };
    }

    onAddToCart?.(
      item,
      selectedVariant,
      selectedAddons,
      qty,
      options
    );

    onClose?.();
  }, [
    canAdd,
    quantityText,
    isWeightBased,
    isVariablePrice,
    sellingPriceText,
    onAddToCart,
    onClose,
    item,
    selectedVariant,
    selectedAddons,
    t,
  ]);

  const handleSellingPriceChange =
    useCallback((value) => {
      setSellingPriceText(
        sanitizePriceInput(value)
      );
    }, []);

  const handleQuantityChange =
    useCallback((value) => {
      setQuantityText(value);
    }, []);

  const selectedOptionStyle = useMemo(
    () => ({
      borderColor: theme.buttonColor,
      backgroundColor:
        `${theme.buttonColor}18`,
    }),
    [theme.buttonColor]
  );

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.sheet}
          onPress={(event) =>
            event.stopPropagation()
          }
        >
          <Text
            style={[
              styles.title,
              { color: theme.textColor },
            ]}
          >
            {item.name}
          </Text>

          <Text style={styles.subtitle}>
            {isVariablePrice
              ? t(
                  'referencePriceLabel',
                  {
                    price:
                      formatCurrency(
                        item.basePrice
                      ),
                  }
                )
              : t('basePriceLabel', {
                  price: `${formatCurrency(
                    item.basePrice
                  )}${
                    isWeightBased &&
                    item.unit
                      ? `/${item.unit}`
                      : ''
                  }`,
                })}
            {hasVariants &&
            !isVariablePrice
              ? ` ${t(
                  'variantReplacesBase'
                )}`
              : ''}
          </Text>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
          >
            {isVariablePrice ? (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.textColor,
                    },
                  ]}
                >
                  {t(
                    'enterSellingPrice'
                  )}{' '}
                  *
                </Text>

                <TextInput
                  style={styles.priceInput}
                  value={sellingPriceText}
                  onChangeText={
                    handleSellingPriceChange
                  }
                  placeholder={t(
                    'pricePlaceholder'
                  )}
                  placeholderTextColor="#adb5bd"
                  keyboardType="decimal-pad"
                  maxLength={9}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.textColor,
                  },
                ]}
              >
                {isWeightBased
                  ? t(
                      'enterQuantityWithUnit',
                      {
                        unit:
                          item.unit ||
                          t('unit'),
                      }
                    )
                  : t('quantity')}
                {isWeightBased
                  ? ' *'
                  : ''}
              </Text>

              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    {
                      borderColor:
                        `${theme.buttonColor}40`,
                    },
                  ]}
                  onPress={() =>
                    adjustQuantity(
                      isWeightBased
                        ? -0.25
                        : -1
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.qtyBtnText,
                      {
                        color:
                          theme.buttonColor,
                      },
                    ]}
                  >
                    −
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.qtyInput,
                    {
                      color:
                        theme.textColor,
                    },
                  ]}
                  value={quantityText}
                  onChangeText={
                    handleQuantityChange
                  }
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />

                <TouchableOpacity
                  style={[
                    styles.qtyBtn,
                    {
                      borderColor:
                        `${theme.buttonColor}40`,
                    },
                  ]}
                  onPress={() =>
                    adjustQuantity(
                      isWeightBased
                        ? 0.25
                        : 1
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.qtyBtnText,
                      {
                        color:
                          theme.buttonColor,
                      },
                    ]}
                  >
                    +
                  </Text>
                </TouchableOpacity>
              </View>

              {isWeightBased ? (
                <Text style={styles.hint}>
                  {t(
                    'weightQuantityHint'
                  )}
                </Text>
              ) : null}
            </View>

            {hasVariants && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.textColor,
                    },
                  ]}
                >
                  {t('selectVariant')}
                </Text>

                {item.variants.map(
                  (variant) => {
                    const isSelected =
                      selectedVariant?.name ===
                      variant.name;

                    return (
                      <TouchableOpacity
                        key={variant.name}
                        style={[
                          styles.optionRow,
                          isSelected &&
                            selectedOptionStyle,
                        ]}
                        onPress={() =>
                          setSelectedVariant(
                            variant
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.radioOuter,
                            {
                              borderColor:
                                theme.buttonColor,
                            },
                          ]}
                        >
                          {isSelected ? (
                            <View
                              style={[
                                styles.radioInner,
                                {
                                  backgroundColor:
                                    theme.buttonColor,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.optionName,
                            {
                              color:
                                theme.textColor,
                            },
                          ]}
                        >
                          {variant.name}
                        </Text>

                        <Text
                          style={[
                            styles.optionPrice,
                            {
                              color:
                                theme.buttonColor,
                            },
                          ]}
                        >
                          {formatCurrency(
                            variant.price
                          )}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            )}

            {hasAddons && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.textColor,
                    },
                  ]}
                >
                  {t('addonsOptional')}
                </Text>

                {item.addons.map(
                  (addon) => {
                    const selected =
                      isAddonSelected(
                        addon
                      );

                    return (
                      <TouchableOpacity
                        key={addon.name}
                        style={[
                          styles.optionRow,
                          selected &&
                            selectedOptionStyle,
                        ]}
                        onPress={() =>
                          toggleAddon(
                            addon
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor:
                                theme.buttonColor,
                            },
                            selected && {
                              backgroundColor:
                                theme.buttonColor,
                            },
                          ]}
                        >
                          {selected ? (
                            <Text
                              style={
                                styles.checkmark
                              }
                            >
                              ✓
                            </Text>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.optionName,
                            {
                              color:
                                theme.textColor,
                            },
                          ]}
                        >
                          {addon.name}
                        </Text>

                        <Text
                          style={[
                            styles.optionPrice,
                            {
                              color:
                                theme.buttonColor,
                            },
                          ]}
                        >
                          +
                          {formatCurrency(
                            addon.price
                          )}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            )}

            {!hasVariants &&
            !hasAddons &&
            !isVariablePrice &&
            !isWeightBased ? (
              <Text
                style={styles.noOptions}
              >
                {t(
                  'noVariantsAddons'
                )}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.totalLabel}>
              {t('itemTotal')}
            </Text>

            <Text
              style={[
                styles.totalValue,
                {
                  color:
                    theme.textColor,
                },
              ]}
            >
              {formatCurrency(
                previewTotal
              )}
            </Text>
          </View>

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
                styles.addBtn,
                {
                  backgroundColor:
                    theme.buttonColor,
                },
                !canAdd &&
                  styles.addBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!canAdd}
              activeOpacity={0.8}
            >
              <Text style={styles.addText}>
                {t('addToCart')}
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
      backgroundColor:
        'rgba(17,24,39,0.45)',
      justifyContent: 'flex-end',
    },

    sheet: {
      backgroundColor: ui.surface,
      borderTopLeftRadius:
        ui.radiusXl,
      borderTopRightRadius:
        ui.radiusXl,
      maxHeight: '85%',
      paddingHorizontal: 24,
      paddingBottom: 32,
    },

    handle: {
      width: 32,
      height: 4,
      backgroundColor: ui.border,
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
      color: ui.textMuted,
      marginTop: 4,
      marginBottom: 16,
    },

    scroll: {
      maxHeight: 360,
    },

    section: {
      marginBottom: 20,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 10,
    },

    priceInput: {
      borderWidth: 1,
      borderColor: ui.borderLight,
      borderRadius: ui.radiusMd,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '700',
      color: ui.textPrimary,
      backgroundColor:
        ui.surfaceMuted,
    },

    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    qtyBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ui.surface,
    },

    qtyBtnText: {
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 24,
    },

    qtyInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: ui.borderLight,
      borderRadius: ui.radiusMd,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      backgroundColor:
        ui.surfaceMuted,
    },

    hint: {
      fontSize: 12,
      color: '#868e96',
      marginTop: 8,
    },

    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: ui.radiusMd,
      backgroundColor:
        ui.surfaceMuted,
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
  };
}
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';

import useStore, { ITEM_UNITS } from '../store/store';
import { formatCurrency, sanitizePriceInput } from '../utils/currency';
import { showAlert } from '../utils/alert';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import {
  cardStyle,
  inputStyle,
  sectionTitle,
  useThemedStyles,
} from '../utils/uiTheme';
import { useResponsiveLayout } from '../utils/responsive';

import {
  BULK_IMPORT_ITEM_TYPES,
  BULK_IMPORT_SAMPLE_CSV,
  describeImportItem,
  formatImportErrors,
  parseBulkImportText,
} from '../utils/inventoryBulkImport';

const emptyVariant = () => ({
  name: '',
  price: '',
});

const emptyAddon = () => ({
  name: '',
  price: '',
});

const WEIGHT_ITEM_STYLE = {
  backgroundColor: 'rgba(255, 213, 79, 0.22)',
  borderColor: 'rgba(245, 180, 0, 0.45)',
};

const VARIABLE_ITEM_STYLE = {
  backgroundColor: 'rgba(66, 165, 245, 0.2)',
  borderColor: 'rgba(30, 136, 229, 0.45)',
};

const BOTH_ITEM_STYLE = {
  backgroundColor: 'rgba(255, 213, 79, 0.2)',
  borderColor: 'rgba(30, 136, 229, 0.55)',
};

export default function InventoryScreen() {
  const { ui, styles } = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const theme = useAppTheme();

  const { horizontalPad } = useResponsiveLayout();

  const tabBarHeight = useBottomTabBarHeight();
  const scrollBottomPad = tabBarHeight + 32;

  const inventory = useStore((s) => s.inventory);
  const addInventoryItem = useStore((s) => s.addInventoryItem);
  const bulkAddInventoryItems = useStore(
    (s) => s.bulkAddInventoryItems
  );
  const updateInventoryItem = useStore(
    (s) => s.updateInventoryItem
  );
  const removeInventoryItem = useStore(
    (s) => s.removeInventoryItem
  );
  const toggleInventoryItemEnabled = useStore(
    (s) => s.toggleInventoryItemEnabled
  );

  const enableWeightBasedPricing = useStore(
    (s) => s.enableWeightBasedPricing
  );
  const enableVariablePriceItems = useStore(
    (s) => s.enableVariablePriceItems
  );

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [isWeightBased, setIsWeightBased] = useState(false);
  const [isVariablePrice, setIsVariablePrice] =
    useState(false);
  const [unit, setUnit] = useState('');

  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);

  const [editingItemId, setEditingItemId] =
    useState(null);

  const [showBulkImport, setShowBulkImport] =
    useState(false);

  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] =
    useState(null);

  const scrollRef = useRef(null);

  /*
   * SCROLL
   */

  const scrollToFormTop = () => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });
    }, 50);

    return () => clearTimeout(timer);
  };

  useEffect(() => {
    if (!editingItemId) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [editingItemId]);

  /*
   * RESET FORM
   */

  const resetForm = () => {
    setName('');
    setBasePrice('');
    setIsWeightBased(false);
    setIsVariablePrice(false);
    setUnit('');
    setVariants([]);
    setAddons([]);
    setEditingItemId(null);
  };

  /*
   * EDIT ITEM
   */

  const beginEdit = (item) => {
    if (
      item.isWeightBased &&
      !enableWeightBasedPricing
    ) {
      showAlert(
        t('featureDisabled'),
        t('weightBasedEditDisabled')
      );
      return;
    }

    if (
      item.isVariablePrice &&
      !enableVariablePriceItems
    ) {
      showAlert(
        t('featureDisabled'),
        t('variablePriceEditDisabled')
      );
      return;
    }

    setEditingItemId(item.id);

    setName(item.name || '');

    setBasePrice(
      item.basePrice === 0
        ? '0'
        : String(item.basePrice ?? '')
    );

    setIsWeightBased(Boolean(item.isWeightBased));

    setIsVariablePrice(
      Boolean(item.isVariablePrice)
    );

    setUnit(item.unit || '');

    setVariants(
      (item.variants || []).map((v) => ({
        name: v.name || '',
        price:
          v.price === 0
            ? '0'
            : String(v.price ?? ''),
      }))
    );

    setAddons(
      (item.addons || []).map((a) => ({
        name: a.name || '',
        price:
          a.price === 0
            ? '0'
            : String(a.price ?? ''),
      }))
    );

    setShowBulkImport(false);
  };

  /*
   * VARIANT / ADDON HELPERS
   */

  const updateListItem = (
    setList,
    index,
    field,
    value
  ) => {
    setList((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const removeListItem = (
    setList,
    index
  ) => {
    setList((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  /*
   * SAVE
   */

  const performSave = () => {
    const parsedVariants = variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        price: Number(v.price),
      }));

    const parsedAddons = addons
      .filter((a) => a.name.trim())
      .map((a) => ({
        name: a.name.trim(),
        price: Number(a.price),
      }));

    if (editingItemId) {
      updateInventoryItem(editingItemId, {
        name: name.trim(),
        basePrice,
        variants: parsedVariants,
        addons: parsedAddons,
        isWeightBased,
        isVariablePrice,
        unit: isWeightBased ? unit : '',
      });

      const updatedName = name.trim();

      resetForm();

      showAlert(
        t('updated'),
        t('itemUpdatedMsg', {
          name: updatedName,
        })
      );

      return;
    }

    addInventoryItem({
      name: name.trim(),
      basePrice,
      variants: parsedVariants,
      addons: parsedAddons,
      isWeightBased,
      isVariablePrice,
      unit: isWeightBased ? unit : '',
    });

    const savedName = name.trim();

    resetForm();

    showAlert(
      t('saved'),
      t('itemAddedMsg', {
        name: savedName,
      })
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert(
        t('validation'),
        t('itemNameRequired')
      );
      return;
    }

    if (
      basePrice === '' ||
      isNaN(Number(basePrice)) ||
      Number(basePrice) < 0
    ) {
      showAlert(
        t('validation'),
        t('basePriceRequired')
      );
      return;
    }

    if (
      isWeightBased &&
      !enableWeightBasedPricing
    ) {
      showAlert(
        t('featureDisabled'),
        t('weightBasedCreateDisabled')
      );
      return;
    }

    if (
      isVariablePrice &&
      !enableVariablePriceItems
    ) {
      showAlert(
        t('featureDisabled'),
        t('variablePriceCreateDisabled')
      );
      return;
    }

    if (
      isWeightBased &&
      !unit.trim()
    ) {
      showAlert(
        t('validation'),
        t('unitRequired')
      );
      return;
    }

    const parsedVariants =
      variants.filter((v) => v.name.trim());

    for (const v of parsedVariants) {
      if (
        v.price === '' ||
        isNaN(Number(v.price)) ||
        Number(v.price) < 0
      ) {
        showAlert(
          t('validation'),
          t('invalidVariantPrice', {
            name: v.name,
          })
        );
        return;
      }
    }

    const parsedAddons =
      addons.filter((a) => a.name.trim());

    for (const a of parsedAddons) {
      if (
        a.price === '' ||
        isNaN(Number(a.price)) ||
        Number(a.price) < 0
      ) {
        showAlert(
          t('validation'),
          t('invalidAddonPrice', {
            name: a.name,
          })
        );
        return;
      }
    }

    performSave();
  };

  /*
   * BULK IMPORT
   */

  const handleLoadSample = async () => {
    setBulkText(BULK_IMPORT_SAMPLE_CSV);
    setBulkPreview(null);

    try {
      await Clipboard.setStringAsync(
        BULK_IMPORT_SAMPLE_CSV
      );

      showAlert(
        t('sampleLoaded'),
        t('sampleLoadedClipboard')
      );
    } catch {
      showAlert(
        t('sampleLoaded'),
        t('sampleLoadedBox')
      );
    }
  };

  const handlePreviewBulkImport = () => {
    try {
      const result =
        parseBulkImportText(bulkText);

      setBulkPreview(result);

      if (result.errors.length > 0) {
        showAlert(
          t('previewWithErrors'),
          `${t('previewErrorsMsg', {
            valid: result.items.length,
            errors: result.errors.length,
          })}\n\n${formatImportErrors(
            result.errors
          )}`
        );

        return;
      }

      showAlert(
        t('previewReady'),
        t('previewReadyMsg', {
          count: result.items.length,
        })
      );
    } catch (error) {
      setBulkPreview(null);

      showAlert(
        t('importError'),
        error?.message || String(error)
      );
    }
  };

  const handleBulkImport = () => {
    try {
      const result =
        bulkPreview ||
        parseBulkImportText(bulkText);

      if (result.items.length === 0) {
        showAlert(
          t('nothingToImport'),
          t('nothingToImportMsg')
        );
        return;
      }

      if (result.errors.length > 0) {
        showAlert(
          t('fixErrorsFirst'),
          `${t('fixErrorsFirstMsg', {
            count: result.errors.length,
          })}\n\n${formatImportErrors(
            result.errors
          )}`
        );

        return;
      }

      const { added } =
        bulkAddInventoryItems(result.items);

      setBulkText('');
      setBulkPreview(null);
      setShowBulkImport(false);

      showAlert(
        t('importComplete'),
        t('importCompleteMsg', {
          count: added,
        })
      );
    } catch (error) {
      showAlert(
        t('importError'),
        error?.message || String(error)
      );
    }
  };

  /*
   * RENDER
   */

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPad,
              paddingBottom: scrollBottomPad,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }
          removeClippedSubviews={false}
        >
          <Text
            style={[
              styles.heading,
              sectionTitle(ui),
              {
                color: theme.textColor,
              },
            ]}
          >
            {editingItemId
              ? t('editMenuItem')
              : t('newMenuItem')}
          </Text>

          {/* FORM CARD */}

          <View style={styles.formCard}>
            {/* BULK IMPORT */}

            {!editingItemId ? (
              <View style={styles.bulkSection}>
                <TouchableOpacity
                  style={[
                    styles.bulkToggle,
                    {
                      borderColor:
                        theme.buttonColor,
                    },
                  ]}
                  onPress={() =>
                    setShowBulkImport(
                      (prev) => !prev
                    )
                  }
                >
                  <Text
                    style={[
                      styles.bulkToggleText,
                      {
                        color:
                          theme.buttonColor,
                      },
                    ]}
                  >
                    {showBulkImport
                      ? t('hideBulkImport')
                      : t('bulkImportItems')}
                  </Text>
                </TouchableOpacity>

                {showBulkImport ? (
                  <View
                    style={styles.bulkPanel}
                  >
                    <Text
                      style={[
                        styles.bulkTitle,
                        {
                          color:
                            theme.textColor,
                        },
                      ]}
                    >
                      {t('bulkImportTitle')}
                    </Text>

                    <Text
                      style={styles.bulkHint}
                    >
                      {t('bulkImportHint')}
                    </Text>

                    {BULK_IMPORT_ITEM_TYPES.map(
                      (type) => (
                        <View
                          key={type.id}
                          style={
                            styles.bulkExampleRow
                          }
                        >
                          <Text
                            style={[
                              styles.bulkExampleLabel,
                              {
                                color:
                                  theme.textColor,
                              },
                            ]}
                          >
                            {t(
                              `bulkType_${type.id}`
                            )}
                          </Text>

                          <Text
                            style={
                              styles.bulkExampleText
                            }
                          >
                            {type.example}
                          </Text>
                        </View>
                      )
                    )}

                    <Text
                      style={styles.bulkHint}
                    >
                      {t('bulkCsvHint')}
                    </Text>

                    <View
                      style={
                        styles.bulkActionsRow
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.bulkActionBtn,
                          {
                            backgroundColor:
                              theme.filterSortColor,
                          },
                        ]}
                        onPress={
                          handleLoadSample
                        }
                      >
                        <Text
                          style={
                            styles.bulkActionText
                          }
                        >
                          {t('loadSample')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.bulkActionBtn,
                          styles.bulkActionBtnSecondary,
                        ]}
                        onPress={
                          handlePreviewBulkImport
                        }
                      >
                        <Text
                          style={[
                            styles.bulkActionText,
                            styles.bulkActionTextSecondary,
                          ]}
                        >
                          {t('preview')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.bulkInput}
                      value={bulkText}
                      onChangeText={(value) => {
                        setBulkText(value);
                        setBulkPreview(null);
                      }}
                      placeholder={t(
                        'bulkPastePlaceholder'
                      )}
                      placeholderTextColor="#adb5bd"
                      multiline
                      textAlignVertical="top"
                    />

                    {bulkPreview?.items?.length >
                    0 ? (
                      <View
                        style={
                          styles.previewBox
                        }
                      >
                        <Text
                          style={[
                            styles.previewHeading,
                            {
                              color:
                                theme.textColor,
                            },
                          ]}
                        >
                          {t(
                            'previewHeading',
                            {
                              count:
                                bulkPreview
                                  .items
                                  .length,
                            }
                          )}
                        </Text>

                        {bulkPreview.items.map(
                          (item, index) => (
                            <Text
                              key={`preview-${index}`}
                              style={
                                styles.previewLine
                              }
                            >
                              {item.name} ·{' '}
                              {formatCurrency(
                                item.basePrice
                              )}{' '}
                              ·{' '}
                              {describeImportItem(
                                item
                              )}
                              {item.variants
                                .length > 0
                                ? ` · ${item.variants.length} variant(s)`
                                : ''}
                              {item.addons
                                .length > 0
                                ? ` · ${item.addons.length} add-on(s)`
                                : ''}
                            </Text>
                          )
                        )}
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.bulkImportBtn,
                        {
                          backgroundColor:
                            theme.buttonColor,
                        },
                      ]}
                      onPress={
                        handleBulkImport
                      }
                    >
                      <Text
                        style={
                          styles.bulkImportBtnText
                        }
                      >
                        {t('importItems')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ITEM NAME */}

            <Text style={styles.label}>
              {t('itemName')}
            </Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t(
                'itemNamePlaceholder'
              )}
              placeholderTextColor="#adb5bd"
            />

            {/* BASE PRICE */}

            <Text style={styles.label}>
              {isVariablePrice
                ? t('referencePrice')
                : t('basePrice')}
            </Text>

            <TextInput
              style={styles.input}
              value={basePrice}
              onChangeText={(value) =>
                setBasePrice(
                  sanitizePriceInput(value)
                )
              }
              placeholder={t(
                'pricePlaceholder'
              )}
              keyboardType="decimal-pad"
              placeholderTextColor="#adb5bd"
              maxLength={9}
            />

            {isVariablePrice ? (
              <Text style={styles.hint}>
                {t('variablePriceHint')}
              </Text>
            ) : null}

            {/* WEIGHT BASED */}

            {enableWeightBasedPricing ||
            isWeightBased ? (
              <View
                style={styles.flagRow}
              >
                <View
                  style={styles.flagCopy}
                >
                  <Text
                    style={
                      styles.flagLabel
                    }
                  >
                    {t(
                      'weightBasedPrice'
                    )}
                  </Text>

                  <Text
                    style={styles.hint}
                  >
                    {t(
                      'weightBasedPriceHint'
                    )}
                  </Text>
                </View>

                <Switch
                  value={isWeightBased}
                  onValueChange={(value) => {
                    if (
                      value &&
                      !enableWeightBasedPricing
                    ) {
                      showAlert(
                        t(
                          'featureDisabled'
                        ),
                        t(
                          'weightBasedCreateDisabled'
                        )
                      );
                      return;
                    }

                    setIsWeightBased(
                      value
                    );

                    if (!value) {
                      setUnit('');
                    }
                  }}
                  disabled={
                    !enableWeightBasedPricing &&
                    !isWeightBased
                  }
                  trackColor={{
                    false: '#dee2e6',
                    true:
                      'rgba(245, 180, 0, 0.55)',
                  }}
                  thumbColor={
                    isWeightBased
                      ? '#f5b400'
                      : '#f8f9fa'
                  }
                />
              </View>
            ) : null}

            {/* UNIT */}

            {isWeightBased ? (
              <>
                <Text
                  style={styles.label}
                >
                  {t('unit')} *
                </Text>

                <View
                  style={styles.unitRow}
                >
                  {ITEM_UNITS.map(
                    (unitOption) => (
                      <TouchableOpacity
                        key={unitOption}
                        style={[
                          styles.unitChip,
                          unit ===
                            unitOption && {
                              borderColor:
                                theme.buttonColor,
                              backgroundColor:
                                `${theme.buttonColor}18`,
                            },
                        ]}
                        onPress={() =>
                          setUnit(
                            unitOption
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.unitChipText,
                            unit ===
                              unitOption && {
                                color:
                                  theme.buttonColor,
                              },
                          ]}
                        >
                          {unitOption}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </>
            ) : null}

            {/* VARIABLE PRICE */}

            {enableVariablePriceItems ||
            isVariablePrice ? (
              <View
                style={styles.flagRow}
              >
                <View
                  style={styles.flagCopy}
                >
                  <Text
                    style={
                      styles.flagLabel
                    }
                  >
                    {t('variablePrice')}
                  </Text>

                  <Text
                    style={styles.hint}
                  >
                    {t(
                      'variablePriceFlagHint'
                    )}
                  </Text>
                </View>

                <Switch
                  value={isVariablePrice}
                  onValueChange={(value) => {
                    if (
                      value &&
                      !enableVariablePriceItems
                    ) {
                      showAlert(
                        t(
                          'featureDisabled'
                        ),
                        t(
                          'variablePriceCreateDisabled'
                        )
                      );
                      return;
                    }

                    setIsVariablePrice(
                      value
                    );
                  }}
                  disabled={
                    !enableVariablePriceItems &&
                    !isVariablePrice
                  }
                  trackColor={{
                    false: '#dee2e6',
                    true:
                      'rgba(30, 136, 229, 0.45)',
                  }}
                  thumbColor={
                    isVariablePrice
                      ? '#1e88e5'
                      : '#f8f9fa'
                  }
                />
              </View>
            ) : null}

            {/* VARIANTS */}

            <View
              style={styles.sectionHeader}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.textColor,
                  },
                ]}
              >
                {t('variantsTitle')}
              </Text>

              <TouchableOpacity
                style={[
                  styles.addChip,
                  {
                    backgroundColor:
                      theme.filterSortColor,
                  },
                ]}
                onPress={() =>
                  setVariants((prev) => [
                    ...prev,
                    emptyVariant(),
                  ])
                }
              >
                <Text
                  style={
                    styles.addChipText
                  }
                >
                  {t('addVariant')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              {t('variantHint')}
            </Text>

            {variants.map(
              (variant, index) => (
                <View
                  key={`variant-${index}`}
                  style={
                    styles.dynamicRow
                  }
                >
                  <TextInput
                    style={[
                      styles.input,
                      styles.flexInput,
                    ]}
                    value={
                      variant.name
                    }
                    onChangeText={(v) =>
                      updateListItem(
                        setVariants,
                        index,
                        'name',
                        v
                      )
                    }
                    placeholder={t(
                      'sizeNamePlaceholder'
                    )}
                    placeholderTextColor="#adb5bd"
                  />

                  <TextInput
                    style={[
                      styles.input,
                      styles.priceInput,
                    ]}
                    value={
                      variant.price
                    }
                    onChangeText={(v) =>
                      updateListItem(
                        setVariants,
                        index,
                        'price',
                        sanitizePriceInput(
                          v
                        )
                      )
                    }
                    placeholder={t(
                      'priceFieldPlaceholder'
                    )}
                    keyboardType="decimal-pad"
                    maxLength={9}
                    placeholderTextColor="#adb5bd"
                  />

                  <TouchableOpacity
                    style={
                      styles.removeBtn
                    }
                    onPress={() =>
                      removeListItem(
                        setVariants,
                        index
                      )
                    }
                  >
                    <Text
                      style={
                        styles.removeText
                      }
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            )}

            {/* ADDONS */}

            <View
              style={styles.sectionHeader}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.textColor,
                  },
                ]}
              >
                {t('addonsTitle')}
              </Text>

              <TouchableOpacity
                style={[
                  styles.addChip,
                  {
                    backgroundColor:
                      theme.filterSortColor,
                  },
                ]}
                onPress={() =>
                  setAddons((prev) => [
                    ...prev,
                    emptyAddon(),
                  ])
                }
              >
                <Text
                  style={
                    styles.addChipText
                  }
                >
                  {t('addAddon')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              {t('addonHint')}
            </Text>

            {addons.map(
              (addon, index) => (
                <View
                  key={`addon-${index}`}
                  style={
                    styles.dynamicRow
                  }
                >
                  <TextInput
                    style={[
                      styles.input,
                      styles.flexInput,
                    ]}
                    value={addon.name}
                    onChangeText={(v) =>
                      updateListItem(
                        setAddons,
                        index,
                        'name',
                        v
                      )
                    }
                    placeholder={t(
                      'addonNamePlaceholder'
                    )}
                    placeholderTextColor="#adb5bd"
                  />

                  <TextInput
                    style={[
                      styles.input,
                      styles.priceInput,
                    ]}
                    value={addon.price}
                    onChangeText={(v) =>
                      updateListItem(
                        setAddons,
                        index,
                        'price',
                        sanitizePriceInput(
                          v
                        )
                      )
                    }
                    placeholder="+Price"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#adb5bd"
                    maxLength={9}
                  />

                  <TouchableOpacity
                    style={
                      styles.removeBtn
                    }
                    onPress={() =>
                      removeListItem(
                        setAddons,
                        index
                      )
                    }
                  >
                    <Text
                      style={
                        styles.removeText
                      }
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            )}

            {/* SAVE */}

            <View
              style={styles.saveRow}
            >
              {editingItemId ? (
                <TouchableOpacity
                  style={
                    styles.cancelEditBtn
                  }
                  onPress={resetForm}
                >
                  <Text
                    style={
                      styles.cancelEditText
                    }
                  >
                    {t('cancelEdit')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      theme.buttonColor,
                  },
                ]}
                onPress={handleSave}
              >
                <Text
                  style={
                    styles.saveBtnText
                  }
                >
                  {editingItemId
                    ? t('updateItem')
                    : t('saveItem')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SAVED ITEMS */}

          {inventory.length > 0 ? (
            <View
              style={styles.listSection}
            >
              <Text
                style={[
                  styles.listHeading,
                  {
                    color:
                      theme.textColor,
                  },
                ]}
              >
                {t('savedItems', {
                  count:
                    inventory.length,
                })}
              </Text>

              {inventory.filter(Boolean).map((item) => {
                const isEnabled =
                  item.enabled !== false;

                const typeStyle =
                  item.isWeightBased &&
                  item.isVariablePrice
                    ? BOTH_ITEM_STYLE
                    : item.isWeightBased
                    ? WEIGHT_ITEM_STYLE
                    : item.isVariablePrice
                    ? VARIABLE_ITEM_STYLE
                    : null;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.savedCard,
                      typeStyle,
                      !isEnabled &&
                        styles.savedCardDisabled,
                    ]}
                  >
                    <View
                      style={
                        styles.savedInfo
                      }
                    >
                      <Text
                        style={[
                          styles.savedId,
                          !isEnabled &&
                            styles.savedTextMuted,
                        ]}
                      >
                        {t('menuId')}{' '}
                        {item.itemNumber}
                      </Text>

                      <Text
                        style={[
                          styles.savedName,
                          {
                            color:
                              theme.textColor,
                          },
                          !isEnabled &&
                            styles.savedTextMuted,
                        ]}
                      >
                        {item.name}
                      </Text>

                      {item.isWeightBased ||
                      item.isVariablePrice ? (
                        <Text
                          style={
                            styles.typeBadges
                          }
                        >
                          {item.isWeightBased
                            ? t(
                                'weightBasedBadge'
                              )
                            : ''}

                          {item.isWeightBased &&
                          item.isVariablePrice
                            ? ' · '
                            : ''}

                          {item.isVariablePrice
                            ? t(
                                'variablePriceBadge'
                              )
                            : ''}

                          {item.isWeightBased &&
                          item.unit
                            ? ` · ${item.unit}`
                            : ''}
                        </Text>
                      ) : null}

                      {!isEnabled ? (
                        <Text
                          style={
                            styles.savedOffHint
                          }
                        >
                          {t(
                            'itemOffHint'
                          )}
                        </Text>
                      ) : null}

                      {item.category ? (
                        <Text
                          style={[
                            styles.savedCategory,
                            {
                              color:
                                theme.buttonColor,
                            },
                            !isEnabled &&
                              styles.savedTextMuted,
                          ]}
                        >
                          {item.category}
                        </Text>
                      ) : null}

                      <Text
                        style={[
                          styles.savedMeta,
                          !isEnabled &&
                            styles.savedTextMuted,
                        ]}
                      >
                        {formatCurrency(
                          item.basePrice
                        )}

                        {item.isWeightBased &&
                        item.unit
                          ? `/${item.unit}`
                          : ''}

                        {' · '}

                        {t(
                          'variantsBadge',
                          {
                            count:
                              item.variants
                                ?.length || 0,
                          }
                        )}

                        {' · '}

                        {t(
                          'addonsBadge',
                          {
                            count:
                              item.addons
                                ?.length || 0,
                          }
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.cardActions
                      }
                    >
                      <View
                        style={
                          styles.itemToggleRow
                        }
                      >
                        <Text
                          style={[
                            styles.itemToggleLabel,
                            !isEnabled &&
                              styles.savedTextMuted,
                          ]}
                        >
                          {isEnabled
                            ? t(
                                'itemEnabled'
                              )
                            : t(
                                'itemDisabled'
                              )}
                        </Text>

                        <Switch
                          value={isEnabled}
                          onValueChange={() =>
                            toggleInventoryItemEnabled(
                              item.id
                            )
                          }
                          trackColor={{
                            false:
                              '#dee2e6',
                            true: `${theme.buttonColor}88`,
                          }}
                          thumbColor={
                            isEnabled
                              ? theme.buttonColor
                              : '#f8f9fa'
                          }
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          beginEdit(item)
                        }
                      >
                        <Text
                          style={[
                            styles.editLink,
                            {
                              color:
                                theme.buttonColor,
                            },
                            !isEnabled &&
                              styles.savedTextMuted,
                          ]}
                        >
                          {t('edit')}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          removeInventoryItem(
                            item.id
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.deleteLink,
                            !isEnabled &&
                              styles.savedTextMuted,
                          ]}
                        >
                          {t('delete')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
 * STYLES
 */

function createStyles(ui) {
  return {
    safe: {
      flex: 1,
      backgroundColor: ui.bg,
    },

    flex: {
      flex: 1,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingVertical: 20,
    },

    heading: {
      marginBottom: 20,
    },

    formCard: {
      ...cardStyle(ui),
      padding: 20,
      marginBottom: 8,
    },

    label: {
      fontSize: 13,
      fontWeight: '600',
      color: ui.textSecondary,
      marginBottom: 6,
      marginTop: 14,
    },

    input: {
      ...inputStyle(ui, {
        paddingVertical: 12,
      }),
    },

    flagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 18,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: ui.radiusMd,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.borderLight,
    },

    flagCopy: {
      flex: 1,
    },

    flagLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: ui.textPrimary,
      marginBottom: 2,
    },

    unitRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },

    unitChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: ui.border,
      backgroundColor: ui.surfaceMuted,
    },

    unitChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#495057',
    },

    typeBadges: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6c757d',
      marginTop: 2,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 4,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
    },

    addChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },

    addChipText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },

    hint: {
      fontSize: 12,
      color: '#868e96',
      marginBottom: 10,
    },

    dynamicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },

    flexInput: {
      flex: 1,
    },

    priceInput: {
      width: 90,
    },

    removeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#ffe3e3',
      alignItems: 'center',
      justifyContent: 'center',
    },

    removeText: {
      color: '#e03131',
      fontSize: 16,
      fontWeight: '700',
    },

    saveBtn: {
      paddingVertical: 14,
      borderRadius: ui.radiusMd,
      alignItems: 'center',
      flex: 1,
    },

    saveBtnText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },

    saveRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 28,
    },

    cancelEditBtn: {
      flex: 1,
      backgroundColor: '#f1f3f5',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: ui.border,
    },

    cancelEditText: {
      color: '#495057',
      fontSize: 17,
      fontWeight: '700',
    },

    listSection: {
      marginTop: 32,
    },

    listHeading: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 12,
    },

    savedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ui.surface,
      padding: 16,
      borderRadius: ui.radiusLg,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: ui.borderLight,
    },

    savedCardDisabled: {
      backgroundColor: '#f1f3f5',
      borderColor: ui.borderLight,
      opacity: 0.82,
    },

    savedTextMuted: {
      color: '#adb5bd',
    },

    savedOffHint: {
      fontSize: 11,
      fontWeight: '600',
      color: '#868e96',
      marginTop: 2,
    },

    savedInfo: {
      flex: 1,
    },

    savedId: {
      fontSize: 11,
      fontWeight: '700',
      color: '#868e96',
      marginBottom: 2,
    },

    savedName: {
      fontSize: 16,
      fontWeight: '600',
    },

    savedCategory: {
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },

    savedMeta: {
      fontSize: 13,
      color: '#868e96',
      marginTop: 2,
    },

    cardActions: {
      alignItems: 'flex-end',
      gap: 10,
      marginLeft: 10,
    },

    itemToggleRow: {
      alignItems: 'flex-end',
      gap: 4,
      marginBottom: 4,
    },

    itemToggleLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: '#868e96',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    editLink: {
      fontSize: 14,
      fontWeight: '600',
    },

    deleteLink: {
      color: '#e03131',
      fontSize: 14,
      fontWeight: '600',
    },

    /* BULK IMPORT */

    bulkSection: {
      marginBottom: 20,
    },

    bulkToggle: {
      borderWidth: 1,
      borderRadius: ui.radiusMd,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: ui.surfaceMuted,
      marginBottom: 4,
    },

    bulkToggleText: {
      fontSize: 15,
      fontWeight: '700',
    },

    bulkPanel: {
      marginTop: 12,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.borderLight,
      borderRadius: ui.radiusMd,
      padding: 14,
    },

    bulkTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },

    bulkHint: {
      fontSize: 12,
      color: '#868e96',
      marginBottom: 10,
      lineHeight: 18,
    },

    bulkExampleRow: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 8,
      backgroundColor: ui.surfaceMuted,
    },

    bulkExampleLabel: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
    },

    bulkExampleText: {
      fontSize: 12,
      color: '#495057',
      fontFamily:
        Platform.OS === 'ios'
          ? 'Menlo'
          : 'monospace',
    },

    bulkActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },

    bulkActionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },

    bulkActionBtnSecondary: {
      backgroundColor: '#f1f3f5',
      borderWidth: 1,
      borderColor: ui.border,
    },

    bulkActionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },

    bulkActionTextSecondary: {
      color: '#495057',
    },

    bulkInput: {
      minHeight: 140,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: ui.textPrimary,
      fontFamily:
        Platform.OS === 'ios'
          ? 'Menlo'
          : 'monospace',
    },

    previewBox: {
      marginTop: 12,
      padding: 10,
      borderRadius: 8,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.borderLight,
    },

    previewHeading: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 6,
    },

    previewLine: {
      fontSize: 12,
      color: '#495057',
      marginBottom: 4,
    },

    bulkImportBtn: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },

    bulkImportBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  };
}
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import useStore from '../store/store';
import { formatCurrency } from '../utils/currency';
import { showAlert } from '../utils/alert';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import { UI, cardStyle, inputStyle, sectionTitle } from '../utils/uiTheme';
import { useResponsiveLayout } from '../utils/responsive';
import {
  BULK_IMPORT_ITEM_TYPES,
  BULK_IMPORT_SAMPLE_CSV,
  describeImportItem,
  formatImportErrors,
  parseBulkImportText,
} from '../utils/inventoryBulkImport';
import OwnerTokenModal from '../components/OwnerTokenModal';
import { isOwnerTokenConfigured, matchesOwnerToken } from '../utils/ownerToken';

const emptyVariant = () => ({ name: '', price: '' });
const emptyAddon = () => ({ name: '', price: '' });

export default function InventoryScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { horizontalPad, scaledSize } = useResponsiveLayout();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollBottomPad = tabBarHeight + 32;
  const inventory = useStore((s) => s.inventory);
  const addInventoryItem = useStore((s) => s.addInventoryItem);
  const bulkAddInventoryItems = useStore((s) => s.bulkAddInventoryItems);
  const updateInventoryItem = useStore((s) => s.updateInventoryItem);
  const removeInventoryItem = useStore((s) => s.removeInventoryItem);
  const toggleInventoryItemEnabled = useStore((s) => s.toggleInventoryItemEnabled);
  const ownerToken = useStore((s) => s.ownerToken);

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState(null);
  const scrollRef = useRef(null);
  const [ownerTokenVisible, setOwnerTokenVisible] = useState(false);
  const [ownerVerified, setOwnerVerified] = useState(false);
  const pendingOwnerActionRef = useRef(null);

  const requireOwnerAccess = (action) => {
    if (!isOwnerTokenConfigured(ownerToken)) {
      showAlert(t('validation'), t('ownerTokenNotSet'));
      return;
    }
    if (ownerVerified) {
      action();
      return;
    }
    pendingOwnerActionRef.current = action;
    setOwnerTokenVisible(true);
  };

  const handleOwnerTokenConfirm = (input) => {
    if (!matchesOwnerToken(ownerToken, input)) {
      showAlert(t('validation'), t('ownerTokenInvalid'));
      return;
    }
    setOwnerVerified(true);
    setOwnerTokenVisible(false);
    pendingOwnerActionRef.current?.();
    pendingOwnerActionRef.current = null;
  };

  const handleOwnerTokenCancel = () => {
    setOwnerTokenVisible(false);
    pendingOwnerActionRef.current = null;
  };

  const scrollToFormTop = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  useEffect(() => {
    if (editingItemId) {
      scrollToFormTop();
    }
  }, [editingItemId]);

  const resetForm = () => {
    setName('');
    setBasePrice('');
    setVariants([]);
    setAddons([]);
    setEditingItemId(null);
  };

  const beginEdit = (item) => {
    setEditingItemId(item.id);
    setName(item.name || '');
    setBasePrice(item.basePrice === 0 ? '0' : String(item.basePrice ?? ''));
    setVariants(
      (item.variants || []).map((v) => ({
        name: v.name || '',
        price: v.price === 0 ? '0' : String(v.price ?? ''),
      }))
    );
    setAddons(
      (item.addons || []).map((a) => ({
        name: a.name || '',
        price: a.price === 0 ? '0' : String(a.price ?? ''),
      }))
    );
    setShowBulkImport(false);
  };

  const updateListItem = (list, setList, index, field, value) => {
    setList(list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeListItem = (list, setList, index) => {
    setList(list.filter((_, i) => i !== index));
  };

  const performSave = () => {
    const parsedVariants = variants.filter((v) => v.name.trim()).map((v) => ({
      name: v.name.trim(),
      price: Number(v.price),
    }));
    const parsedAddons = addons.filter((a) => a.name.trim()).map((a) => ({
      name: a.name.trim(),
      price: Number(a.price),
    }));

    if (editingItemId) {
      updateInventoryItem(editingItemId, {
        name,
        basePrice,
        variants: parsedVariants,
        addons: parsedAddons,
      });
      const updatedName = name.trim();
      resetForm();
      showAlert(t('updated'), t('itemUpdatedMsg', { name: updatedName }));
      return;
    }

    addInventoryItem({
      name,
      basePrice,
      variants: parsedVariants,
      addons: parsedAddons,
    });
    const savedName = name.trim();
    resetForm();
    showAlert(t('saved'), t('itemAddedMsg', { name: savedName }));
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert(t('validation'), t('itemNameRequired'));
      return;
    }
    if (basePrice === '' || isNaN(Number(basePrice)) || Number(basePrice) < 0) {
      showAlert(t('validation'), t('basePriceRequired'));
      return;
    }

    const parsedVariants = variants.filter((v) => v.name.trim());
    for (const v of parsedVariants) {
      if (v.price === '' || isNaN(Number(v.price)) || Number(v.price) < 0) {
        showAlert(t('validation'), t('invalidVariantPrice', { name: v.name }));
        return;
      }
    }

    const parsedAddons = addons.filter((a) => a.name.trim());
    for (const a of parsedAddons) {
      if (a.price === '' || isNaN(Number(a.price)) || Number(a.price) < 0) {
        showAlert(t('validation'), t('invalidAddonPrice', { name: a.name }));
        return;
      }
    }

    requireOwnerAccess(performSave);
  };

  const handleLoadSample = async () => {
    setBulkText(BULK_IMPORT_SAMPLE_CSV);
    setBulkPreview(null);
    try {
      await Clipboard.setStringAsync(BULK_IMPORT_SAMPLE_CSV);
      showAlert(t('sampleLoaded'), t('sampleLoadedClipboard'));
    } catch {
      showAlert(t('sampleLoaded'), t('sampleLoadedBox'));
    }
  };

  const handlePreviewBulkImport = () => {
    try {
      const result = parseBulkImportText(bulkText);
      setBulkPreview(result);

      if (result.errors.length > 0) {
        showAlert(
          t('previewWithErrors'),
          `${t('previewErrorsMsg', {
            valid: result.items.length,
            errors: result.errors.length,
          })}\n\n${formatImportErrors(result.errors)}`
        );
        return;
      }

      showAlert(t('previewReady'), t('previewReadyMsg', { count: result.items.length }));
    } catch (error) {
      setBulkPreview(null);
      showAlert(t('importError'), error.message);
    }
  };

  const handleBulkImport = () => {
    try {
      const result = bulkPreview || parseBulkImportText(bulkText);

      if (result.items.length === 0) {
        showAlert(t('nothingToImport'), t('nothingToImportMsg'));
        return;
      }

      if (result.errors.length > 0) {
        showAlert(
          t('fixErrorsFirst'),
          `${t('fixErrorsFirstMsg', { count: result.errors.length })}\n\n${formatImportErrors(result.errors)}`
        );
        return;
      }

      const { added } = bulkAddInventoryItems(result.items);
      setBulkText('');
      setBulkPreview(null);
      setShowBulkImport(false);
      showAlert(t('importComplete'), t('importCompleteMsg', { count: added }));
    } catch (error) {
      showAlert(t('importError'), error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: horizontalPad, paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.heading, sectionTitle(), { color: theme.textColor }]}>
            {editingItemId ? t('editMenuItem') : t('newMenuItem')}
          </Text>

          <View style={styles.formCard}>
          {!editingItemId ? (
            <View style={styles.bulkSection}>
              <TouchableOpacity
                style={[styles.bulkToggle, { borderColor: theme.buttonColor }]}
                onPress={() => setShowBulkImport((prev) => !prev)}
              >
                <Text style={[styles.bulkToggleText, { color: theme.buttonColor }]}>
                  {showBulkImport ? t('hideBulkImport') : t('bulkImportItems')}
                </Text>
              </TouchableOpacity>

              {showBulkImport ? (
                <View style={styles.bulkPanel}>
                  <Text style={[styles.bulkTitle, { color: theme.textColor }]}>
                    {t('bulkImportTitle')}
                  </Text>
                  <Text style={styles.bulkHint}>{t('bulkImportHint')}</Text>

                  {BULK_IMPORT_ITEM_TYPES.map((type) => (
                    <View key={type.id} style={styles.bulkExampleRow}>
                      <Text style={[styles.bulkExampleLabel, { color: theme.textColor }]}>
                        {t(`bulkType_${type.id}`)}
                      </Text>
                      <Text style={styles.bulkExampleText}>{type.example}</Text>
                    </View>
                  ))}

                  <Text style={styles.bulkHint}>{t('bulkCsvHint')}</Text>

                  <View style={styles.bulkActionsRow}>
                    <TouchableOpacity
                      style={[styles.bulkActionBtn, { backgroundColor: theme.filterSortColor }]}
                      onPress={handleLoadSample}
                    >
                      <Text style={styles.bulkActionText}>{t('loadSample')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bulkActionBtn, styles.bulkActionBtnSecondary]}
                      onPress={handlePreviewBulkImport}
                    >
                      <Text style={[styles.bulkActionText, styles.bulkActionTextSecondary]}>
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
                    placeholder={t('bulkPastePlaceholder')}
                    placeholderTextColor="#adb5bd"
                    multiline
                    textAlignVertical="top"
                  />

                  {bulkPreview?.items?.length > 0 ? (
                    <View style={styles.previewBox}>
                      <Text style={[styles.previewHeading, { color: theme.textColor }]}>
                        {t('previewHeading', { count: bulkPreview.items.length })}
                      </Text>
                      {bulkPreview.items.map((item, index) => (
                        <Text key={`preview-${index}`} style={styles.previewLine}>
                          {item.name} · {formatCurrency(item.basePrice)} · {describeImportItem(item)}
                          {item.variants.length > 0
                            ? ` · ${item.variants.length} variant(s)`
                            : ''}
                          {item.addons.length > 0 ? ` · ${item.addons.length} add-on(s)` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.bulkImportBtn, { backgroundColor: theme.buttonColor }]}
                    onPress={handleBulkImport}
                  >
                    <Text style={styles.bulkImportBtnText}>{t('importItems')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>{t('itemName')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('itemNamePlaceholder')}
            placeholderTextColor="#adb5bd"
          />

          <Text style={styles.label}>{t('basePrice')}</Text>
          <TextInput
            style={styles.input}
            value={basePrice}
            onChangeText={setBasePrice}
            placeholder={t('pricePlaceholder')}
            keyboardType="decimal-pad"
            placeholderTextColor="#adb5bd"
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{t('variantsTitle')}</Text>
            <TouchableOpacity
              style={[styles.addChip, { backgroundColor: theme.filterSortColor }]}
              onPress={() => setVariants([...variants, emptyVariant()])}
            >
              <Text style={styles.addChipText}>{t('addVariant')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{t('variantHint')}</Text>

          {variants.map((variant, index) => (
            <View key={`variant-${index}`} style={styles.dynamicRow}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={variant.name}
                onChangeText={(v) => updateListItem(variants, setVariants, index, 'name', v)}
                placeholder={t('sizeNamePlaceholder')}
                placeholderTextColor="#adb5bd"
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={variant.price}
                onChangeText={(v) => updateListItem(variants, setVariants, index, 'price', v)}
                placeholder={t('priceFieldPlaceholder')}
                keyboardType="decimal-pad"
                placeholderTextColor="#adb5bd"
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeListItem(variants, setVariants, index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{t('addonsTitle')}</Text>
            <TouchableOpacity
              style={[styles.addChip, { backgroundColor: theme.filterSortColor }]}
              onPress={() => setAddons([...addons, emptyAddon()])}
            >
              <Text style={styles.addChipText}>{t('addAddon')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{t('addonHint')}</Text>

          {addons.map((addon, index) => (
            <View key={`addon-${index}`} style={styles.dynamicRow}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={addon.name}
                onChangeText={(v) => updateListItem(addons, setAddons, index, 'name', v)}
                placeholder={t('addonNamePlaceholder')}
                placeholderTextColor="#adb5bd"
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={addon.price}
                onChangeText={(v) => updateListItem(addons, setAddons, index, 'price', v)}
                placeholder="+Price"
                keyboardType="decimal-pad"
                placeholderTextColor="#adb5bd"
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeListItem(addons, setAddons, index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.saveRow}>
            {editingItemId ? (
              <TouchableOpacity style={styles.cancelEditBtn} onPress={resetForm}>
                <Text style={styles.cancelEditText}>{t('cancelEdit')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.buttonColor }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{editingItemId ? t('updateItem') : t('saveItem')}</Text>
            </TouchableOpacity>
          </View>
          </View>

          {inventory.length > 0 && (
            <View style={styles.listSection}>
              <Text style={[styles.listHeading, { color: theme.textColor }]}>
                {t('savedItems', { count: inventory.length })}
              </Text>
              {inventory.map((item) => {
                const isEnabled = item.enabled !== false;
                return (
                <View
                  key={item.id}
                  style={[styles.savedCard, !isEnabled && styles.savedCardDisabled]}
                >
                  <View style={styles.savedInfo}>
                    <Text style={[styles.savedId, !isEnabled && styles.savedTextMuted]}>
                      {t('menuId')} {item.itemNumber}
                    </Text>
                    <Text
                      style={[
                        styles.savedName,
                        { color: theme.textColor },
                        !isEnabled && styles.savedTextMuted,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {!isEnabled ? (
                      <Text style={styles.savedOffHint}>{t('itemOffHint')}</Text>
                    ) : null}
                    {item.category ? (
                      <Text style={[styles.savedCategory, { color: theme.buttonColor }, !isEnabled && styles.savedTextMuted]}>
                        {item.category}
                      </Text>
                    ) : null}
                    <Text style={[styles.savedMeta, !isEnabled && styles.savedTextMuted]}>
                      {formatCurrency(item.basePrice)} · {t('variantsBadge', { count: item.variants.length })} ·{' '}
                      {t('addonsBadge', { count: item.addons.length })}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <View style={styles.itemToggleRow}>
                      <Text style={[styles.itemToggleLabel, !isEnabled && styles.savedTextMuted]}>
                        {isEnabled ? t('itemEnabled') : t('itemDisabled')}
                      </Text>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleInventoryItemEnabled(item.id)}
                        trackColor={{ false: '#dee2e6', true: `${theme.buttonColor}88` }}
                        thumbColor={isEnabled ? theme.buttonColor : '#f8f9fa'}
                      />
                    </View>
                    <TouchableOpacity onPress={() => requireOwnerAccess(() => beginEdit(item))}>
                      <Text style={[styles.editLink, { color: theme.buttonColor }, !isEnabled && styles.savedTextMuted]}>
                        {t('edit')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeInventoryItem(item.id)}>
                      <Text style={[styles.deleteLink, !isEnabled && styles.savedTextMuted]}>{t('delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <OwnerTokenModal
        visible={ownerTokenVisible}
        title={t('ownerTokenRequired')}
        message={t('ownerTokenRequiredMsg')}
        onConfirm={handleOwnerTokenConfirm}
        onCancel={handleOwnerTokenCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 20 },
  heading: {
    marginBottom: 20,
  },
  formCard: {
    ...cardStyle(),
    padding: 20,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: UI.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    ...inputStyle({ paddingVertical: 12 }),
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
  flexInput: { flex: 1 },
  priceInput: { width: 90 },
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
    borderRadius: UI.radiusMd,
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
    borderColor: '#dee2e6',
  },
  cancelEditText: {
    color: '#495057',
    fontSize: 17,
    fontWeight: '700',
  },
  listSection: { marginTop: 32 },
  listHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.surface,
    padding: 16,
    borderRadius: UI.radiusLg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: UI.borderLight,
  },
  savedCardDisabled: {
    backgroundColor: '#f1f3f5',
    borderColor: '#e9ecef',
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
  savedInfo: { flex: 1 },
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
  bulkSection: {
    marginBottom: 20,
  },
  bulkToggle: {
    borderWidth: 1,
    borderRadius: UI.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: UI.surfaceMuted,
    marginBottom: 4,
  },
  bulkToggleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bulkPanel: {
    marginTop: 12,
    backgroundColor: UI.surfaceMuted,
    borderWidth: 1,
    borderColor: UI.borderLight,
    borderRadius: UI.radiusMd,
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
    backgroundColor: '#f8f9fa',
  },
  bulkExampleLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulkExampleText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    borderColor: '#dee2e6',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
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
});

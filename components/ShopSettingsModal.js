import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import useStore from '../store/store';
import { showAlert, confirmAction } from '../utils/alert';
import {
  buildBackupPayload,
  normalizeImportedBackup,
  parseBackupText,
  readBackupFromClipboard,
  shareBackupFile,
} from '../utils/dataBackup';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  isValidHexColor,
  resolveTheme,
  useAppTheme,
} from '../utils/theme';
import { LANGUAGES, useTranslation } from '../utils/i18n';
import { useLayoutInsets } from '../hooks/useLayoutInsets';
import ThemeColorField from './ThemeColorField';
import { UI } from '../utils/uiTheme';
import { normalizeShopOffer, offersAreEqual } from '../utils/offers';
import { isOwnerTokenConfigured, matchesOwnerToken, normalizeOwnerToken } from '../utils/ownerToken';

const COLOR_FIELD_KEYS = [
  { key: 'headerColor', labelKey: 'topBarColor' },
  { key: 'tabBarColor', labelKey: 'menuBarColor' },
  { key: 'buttonColor', labelKey: 'buttonColor' },
  { key: 'textColor', labelKey: 'textColor' },
  { key: 'filterSortColor', labelKey: 'filterSortColor' },
];

export default function ShopSettingsModal({ visible, onClose }) {
  const { t } = useTranslation();
  const { bottom: bottomInset } = useLayoutInsets();
  const theme = useAppTheme();
  const shopName = useStore((s) => s.shopName);
  const fssaiNumber = useStore((s) => s.fssaiNumber);
  const gstinNumber = useStore((s) => s.gstinNumber);
  const storedLanguage = useStore((s) => s.language);
  const storedShowWhatsApp = useStore((s) => s.showWhatsAppInvoiceButtons);
  const storedShopOffer = useStore((s) => s.shopOffer);
  const storedOwnerToken = useStore((s) => s.ownerToken);
  const updateShopSettings = useStore((s) => s.updateShopSettings);
  const importBackupData = useStore((s) => s.importBackupData);

  const [backupText, setBackupText] = useState('');
  const [showBackupImport, setShowBackupImport] = useState(false);

  const [name, setName] = useState(shopName);
  const [fssai, setFssai] = useState(fssaiNumber);
  const [gstin, setGstin] = useState(gstinNumber);
  const [language, setLanguage] = useState(storedLanguage || 'en');
  const [showWhatsAppInvoiceButtons, setShowWhatsAppInvoiceButtons] = useState(
    storedShowWhatsApp !== false
  );
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerName, setOfferName] = useState('');
  const [offerType, setOfferType] = useState('percent');
  const [offerValue, setOfferValue] = useState('');
  const [ownerToken, setOwnerToken] = useState('');
  const [ownerTokenConfirm, setOwnerTokenConfirm] = useState('');
  const [offerOwnerToken, setOfferOwnerToken] = useState('');
  const [presetId, setPresetId] = useState(theme.presetId);
  const [customColors, setCustomColors] = useState({
    buttonColor: theme.buttonColor,
    textColor: theme.textColor,
    tabBarColor: theme.tabBarColor,
    filterSortColor: theme.filterSortColor,
    headerColor: theme.headerColor,
  });

  useEffect(() => {
    if (!visible) {
      setBackupText('');
      setShowBackupImport(false);
      setOwnerToken('');
      setOwnerTokenConfirm('');
      setOfferOwnerToken('');
      return;
    }
    setName(shopName);
    setFssai(fssaiNumber);
    setGstin(gstinNumber);
    setLanguage(storedLanguage || 'en');
    setShowWhatsAppInvoiceButtons(storedShowWhatsApp !== false);
    const normalizedOffer = normalizeShopOffer(storedShopOffer);
    setOfferEnabled(normalizedOffer.enabled);
    setOfferName(normalizedOffer.name);
    setOfferType(normalizedOffer.type);
    setOfferValue(normalizedOffer.value > 0 ? String(normalizedOffer.value) : '');
    setOwnerToken('');
    setOwnerTokenConfirm('');
    setOfferOwnerToken('');
    const resolved = resolveTheme(useStore.getState().theme);
    setPresetId(resolved.presetId);
    setCustomColors({
      buttonColor: resolved.buttonColor,
      textColor: resolved.textColor,
      tabBarColor: resolved.tabBarColor,
      filterSortColor: resolved.filterSortColor,
      headerColor: resolved.headerColor,
    });
  }, [visible, shopName, fssaiNumber, gstinNumber, storedLanguage, storedShowWhatsApp, storedShopOffer, storedOwnerToken]);

  const handlePresetSelect = (id) => {
    setPresetId(id);
    if (id !== 'custom' && THEME_PRESETS[id]) {
      const preset = THEME_PRESETS[id];
      setCustomColors({
        buttonColor: preset.buttonColor,
        textColor: preset.textColor,
        tabBarColor: preset.tabBarColor,
        filterSortColor: preset.filterSortColor,
        headerColor: preset.headerColor,
      });
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert(t('validation'), t('shopNameRequired'));
      return;
    }

    if (presetId === 'custom') {
      for (const field of COLOR_FIELD_KEYS) {
        if (!isValidHexColor(customColors[field.key])) {
          showAlert(
            t('validation'),
            t('invalidHexColor', { label: t(field.labelKey) })
          );
          return;
        }
      }
    }

    const parsedOfferValue = Number(offerValue);
    const nextOffer = normalizeShopOffer({
      enabled: offerEnabled,
      name: offerName.trim(),
      type: offerType,
      value: parsedOfferValue,
    });
    const offerChanged = !offersAreEqual(storedShopOffer, nextOffer);
    const nextOwnerToken = normalizeOwnerToken(ownerToken) || normalizeOwnerToken(storedOwnerToken);

    if (ownerToken.trim() || ownerTokenConfirm.trim()) {
      if (normalizeOwnerToken(ownerToken) !== normalizeOwnerToken(ownerTokenConfirm)) {
        showAlert(t('validation'), t('ownerTokenMismatch'));
        return;
      }
    }

    if (offerChanged) {
      if (!nextOwnerToken) {
        showAlert(t('validation'), t('ownerTokenNotSet'));
        return;
      }
      if (!matchesOwnerToken(nextOwnerToken, offerOwnerToken)) {
        showAlert(t('validation'), t('ownerTokenInvalid'));
        return;
      }
    }

    if (offerEnabled) {
      if (!offerName.trim()) {
        showAlert(t('validation'), t('offerNameRequired'));
        return;
      }
      if (!Number.isFinite(parsedOfferValue) || parsedOfferValue <= 0) {
        showAlert(t('validation'), t('offerValueRequired'));
        return;
      }
      if (offerType === 'percent' && parsedOfferValue > 100) {
        showAlert(t('validation'), t('offerValueRequired'));
        return;
      }
    }

    updateShopSettings({
      shopName: name.trim(),
      fssaiNumber: fssai.trim(),
      gstinNumber: gstin.trim(),
      language,
      showWhatsAppInvoiceButtons,
      ownerToken: nextOwnerToken,
      shopOffer: nextOffer,
      theme:
        presetId === 'custom'
          ? { presetId: 'custom', ...customColors }
          : { presetId },
    });
    showAlert(t('saved'), t('shopSettingsSaved'));
    onClose();
  };

  const handleExportBackup = async () => {
    try {
      const payload = buildBackupPayload(useStore.getState());
      await shareBackupFile(payload);
      showAlert(t('backupExported'), t('backupExportedMsg'));
    } catch (error) {
      showAlert(t('backupExportFailed'), error.message || t('backupExportFailedMsg'));
    }
  };

  const handleLoadBackupClipboard = async () => {
    try {
      const parsed = await readBackupFromClipboard();
      setBackupText(JSON.stringify(parsed, null, 2));
      setShowBackupImport(true);
    } catch (error) {
      showAlert(t('backupImportFailed'), error.message);
    }
  };

  const handleImportBackup = () => {
    let parsed;
    try {
      parsed = normalizeImportedBackup(parseBackupText(backupText));
    } catch (error) {
      showAlert(t('backupImportFailed'), error.message);
      return;
    }

    confirmAction(
      t('confirmImportBackup'),
      t('confirmImportBackupMsg', {
        items: parsed.inventory.length,
        orders: parsed.history.length,
      }),
      () => {
        importBackupData(parsed);
        const state = useStore.getState();
        setName(state.shopName);
        setFssai(state.fssaiNumber);
        setGstin(state.gstinNumber);
        setLanguage(state.language || 'en');
        setShowWhatsAppInvoiceButtons(state.showWhatsAppInvoiceButtons !== false);
        const restoredOffer = normalizeShopOffer(state.shopOffer);
        setOfferEnabled(restoredOffer.enabled);
        setOfferName(restoredOffer.name);
        setOfferType(restoredOffer.type);
        setOfferValue(restoredOffer.value > 0 ? String(restoredOffer.value) : '');
        const resolved = resolveTheme(state.theme);
        setPresetId(resolved.presetId);
        setCustomColors({
          buttonColor: resolved.buttonColor,
          textColor: resolved.textColor,
          tabBarColor: resolved.tabBarColor,
          filterSortColor: resolved.filterSortColor,
          headerColor: resolved.headerColor,
        });
        setBackupText('');
        setShowBackupImport(false);
        showAlert(t('backupImported'), t('backupImportedMsg'));
      },
      t('importBackup')
    );
  };

  const previewTheme =
    presetId === 'custom'
      ? { ...customColors, presetId: 'custom' }
      : THEME_PRESETS[presetId] || DEFAULT_THEME;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
          <View style={[styles.sheet, { paddingBottom: 20 + bottomInset }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.title, { color: previewTheme.textColor }]}>{t('shopSettings')}</Text>
            </View>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
            <Text style={styles.label}>{t('shopName')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('shopNamePlaceholder')}
              placeholderTextColor="#adb5bd"
            />

            <Text style={styles.label}>{t('fssaiNumber')}</Text>
            <TextInput
              style={styles.input}
              value={fssai}
              onChangeText={setFssai}
              placeholder={t('fssaiPlaceholder')}
              placeholderTextColor="#adb5bd"
              autoCapitalize="characters"
            />
            <Text style={styles.hint}>{t('fssaiHint')}</Text>

            <Text style={styles.label}>{t('gstinNumber')}</Text>
            <TextInput
              style={styles.input}
              value={gstin}
              onChangeText={setGstin}
              placeholder={t('gstinPlaceholder')}
              placeholderTextColor="#adb5bd"
              autoCapitalize="characters"
            />
            <Text style={styles.hint}>{t('gstinHint')}</Text>

            <Text style={styles.sectionTitle}>{t('language')}</Text>
            <Text style={styles.hint}>{t('languageHint')}</Text>
            <View style={styles.presetRow}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.presetChip,
                    language === lang.id && {
                      borderColor: previewTheme.buttonColor,
                      backgroundColor: `${previewTheme.buttonColor}18`,
                    },
                  ]}
                  onPress={() => setLanguage(lang.id)}
                >
                  <Text style={styles.presetLabel}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('showWhatsAppInvoice')}</Text>
                <Text style={styles.hint}>{t('showWhatsAppInvoiceHint')}</Text>
              </View>
              <Switch
                value={showWhatsAppInvoiceButtons}
                onValueChange={setShowWhatsAppInvoiceButtons}
                trackColor={{ false: '#dee2e6', true: `${previewTheme.buttonColor}88` }}
                thumbColor={showWhatsAppInvoiceButtons ? previewTheme.buttonColor : '#f8f9fa'}
              />
            </View>

            <Text style={styles.sectionTitle}>{t('ownerTokenSection')}</Text>
            <Text style={styles.hint}>{t('ownerTokenHint')}</Text>
            <Text style={styles.label}>{t('ownerToken')}</Text>
            <TextInput
              style={styles.input}
              value={ownerToken}
              onChangeText={setOwnerToken}
              placeholder={storedOwnerToken ? t('ownerTokenPlaceholder') : t('ownerTokenPlaceholder')}
              placeholderTextColor="#adb5bd"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>{t('ownerTokenConfirm')}</Text>
            <TextInput
              style={styles.input}
              value={ownerTokenConfirm}
              onChangeText={setOwnerTokenConfirm}
              placeholder={t('ownerTokenConfirm')}
              placeholderTextColor="#adb5bd"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.sectionTitle}>{t('offersSection')}</Text>
            <Text style={styles.hint}>{t('offersHint')}</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('offerEnabled')}</Text>
              </View>
              <Switch
                value={offerEnabled}
                onValueChange={setOfferEnabled}
                trackColor={{ false: '#dee2e6', true: `${previewTheme.buttonColor}88` }}
                thumbColor={offerEnabled ? previewTheme.buttonColor : '#f8f9fa'}
              />
            </View>
            {offerEnabled ? (
              <View style={styles.offerBlock}>
                <Text style={styles.label}>{t('offerName')}</Text>
                <TextInput
                  style={styles.input}
                  value={offerName}
                  onChangeText={setOfferName}
                  placeholder={t('offerNamePlaceholder')}
                  placeholderTextColor="#adb5bd"
                />
                <Text style={styles.label}>{t('offerType')}</Text>
                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={[
                      styles.presetChip,
                      offerType === 'percent' && {
                        borderColor: previewTheme.buttonColor,
                        backgroundColor: `${previewTheme.buttonColor}18`,
                      },
                    ]}
                    onPress={() => setOfferType('percent')}
                  >
                    <Text style={styles.presetLabel}>{t('offerTypePercent')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.presetChip,
                      offerType === 'flat' && {
                        borderColor: previewTheme.buttonColor,
                        backgroundColor: `${previewTheme.buttonColor}18`,
                      },
                    ]}
                    onPress={() => setOfferType('flat')}
                  >
                    <Text style={styles.presetLabel}>{t('offerTypeFlat')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.label}>{t('offerValue')}</Text>
                <TextInput
                  style={styles.input}
                  value={offerValue}
                  onChangeText={setOfferValue}
                  placeholder={t('offerValuePlaceholder')}
                  placeholderTextColor="#adb5bd"
                  keyboardType="decimal-pad"
                />
              </View>
            ) : null}

            {offerEnabled || offerName.trim() || offerValue.trim() ? (
              <>
                <Text style={styles.label}>{t('ownerTokenToSaveOffer')}</Text>
                <Text style={styles.hint}>{t('ownerTokenToSaveOfferHint')}</Text>
                <TextInput
                  style={styles.input}
                  value={offerOwnerToken}
                  onChangeText={setOfferOwnerToken}
                  placeholder={t('ownerTokenPlaceholder')}
                  placeholderTextColor="#adb5bd"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>{t('themeColors')}</Text>
            <View style={styles.presetRow}>
              {Object.values(THEME_PRESETS).map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetChip,
                    presetId === preset.id && {
                      borderColor: preset.buttonColor,
                      backgroundColor: `${preset.buttonColor}18`,
                    },
                  ]}
                  onPress={() => handlePresetSelect(preset.id)}
                >
                  <View style={[styles.presetDot, { backgroundColor: preset.buttonColor }]} />
                  <Text style={styles.presetLabel}>{t(`theme_${preset.id}`)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.presetChip,
                  presetId === 'custom' && {
                    borderColor: customColors.buttonColor,
                    backgroundColor: `${customColors.buttonColor}18`,
                  },
                ]}
                onPress={() => handlePresetSelect('custom')}
              >
                <View style={[styles.presetDot, { backgroundColor: customColors.buttonColor }]} />
                <Text style={styles.presetLabel}>{t('custom')}</Text>
              </TouchableOpacity>
            </View>

            {presetId === 'custom' ? (
              <View style={styles.customBlock}>
                {COLOR_FIELD_KEYS.map((field) => (
                  <ThemeColorField
                    key={field.key}
                    label={t(field.labelKey)}
                    value={customColors[field.key]}
                    onChange={(value) =>
                      setCustomColors((prev) => ({ ...prev, [field.key]: value }))
                    }
                  />
                ))}
              </View>
            ) : null}

            <View style={[styles.previewCard, { borderColor: previewTheme.filterSortColor }]}>
              <View style={[styles.previewHeader, { backgroundColor: previewTheme.headerColor }]}>
                <Text style={styles.previewHeaderText}>{t('previewHeader')}</Text>
              </View>
              <View style={[styles.previewTabBar, { backgroundColor: previewTheme.tabBarColor }]}>
                <Text style={styles.previewTabText}>{t('tabBar')}</Text>
              </View>
              <Text style={[styles.previewBodyText, { color: previewTheme.textColor }]}>
                {t('sampleText')}
              </Text>
              <View style={styles.previewChipRow}>
                <View
                  style={[styles.previewChip, { backgroundColor: previewTheme.filterSortColor }]}
                >
                  <Text style={styles.previewChipText}>{t('sort')}</Text>
                </View>
                <View style={[styles.previewBtn, { backgroundColor: previewTheme.buttonColor }]}>
                  <Text style={styles.previewBtnText}>{t('button')}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('backupSection')}</Text>
            <Text style={styles.hint}>{t('backupHint')}</Text>
            <TouchableOpacity
              style={[styles.backupBtn, { backgroundColor: previewTheme.headerColor }]}
              onPress={handleExportBackup}
            >
              <Text style={styles.backupBtnText}>{t('exportBackup')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backupBtnSecondary}
              onPress={() => setShowBackupImport((prev) => !prev)}
            >
              <Text style={styles.backupBtnSecondaryText}>{t('importBackup')}</Text>
            </TouchableOpacity>

            {showBackupImport ? (
              <View style={styles.backupImportBox}>
                <TouchableOpacity style={styles.clipboardBtn} onPress={handleLoadBackupClipboard}>
                  <Text style={[styles.clipboardBtnText, { color: previewTheme.buttonColor }]}>
                    {t('importFromClipboard')}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.backupInput}
                  value={backupText}
                  onChangeText={setBackupText}
                  placeholder={t('importBackupPlaceholder')}
                  placeholderTextColor="#adb5bd"
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.backupBtn, { backgroundColor: previewTheme.buttonColor }]}
                  onPress={handleImportBackup}
                >
                  <Text style={styles.backupBtnText}>{t('restoreBackup')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: previewTheme.buttonColor }]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: UI.surface,
    borderTopLeftRadius: UI.radiusXl,
    borderTopRightRadius: UI.radiusXl,
    height: '92%',
    maxHeight: '92%',
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 1,
    elevation: 8,
  },
  sheetHeader: {
    flexShrink: 0,
  },
  scrollBody: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a2e',
  },
  hint: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    marginTop: 16,
    marginBottom: 10,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  presetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  offerBlock: {
    marginTop: 8,
    gap: 4,
  },
  customBlock: {
    marginTop: 12,
    gap: 14,
  },
  previewCard: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewHeader: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  previewHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  previewTabBar: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  previewTabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  previewBodyText: {
    paddingHorizontal: 12,
    paddingTop: 10,
    fontWeight: '700',
  },
  previewChipRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  previewChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  previewChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  previewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  previewBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexShrink: 0,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: {
    color: '#495057',
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1,
    borderRadius: UI.radiusMd,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '800',
  },
  backupBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: UI.radiusMd,
    alignItems: 'center',
  },
  backupBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  backupBtnSecondary: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: UI.radiusMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.surfaceMuted,
  },
  backupBtnSecondaryText: {
    color: UI.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  backupImportBox: {
    marginTop: 12,
    gap: 8,
  },
  clipboardBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  clipboardBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  backupInput: {
    minHeight: 120,
    backgroundColor: UI.surfaceMuted,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: UI.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: UI.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

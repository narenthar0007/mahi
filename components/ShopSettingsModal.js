import React, { useEffect, useMemo, useState } from 'react';
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
  Dimensions,
  Image,
  ActivityIndicator,
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
import { useThemedStyles } from '../utils/uiTheme';
import { pickUpiQrImage } from '../utils/upiQr';
import { sanitizePriceInput } from '../utils/currency';
import { normalizeShopOffer } from '../utils/offers';
import * as Clipboard from 'expo-clipboard';
import {
  APP_UNIQUE_KEY_LENGTH,
  APP_KEY_LENGTH,
  SECRET_TOKEN_LENGTH,
  CLIENT_TOKEN_LENGTH,
  generateAppUniqueKey,
  normalizeAppUniqueKey,
  normalizeAppKey,
  normalizeSecretToken,
  normalizeClientToken,
  validateApiCredentials,
} from '../utils/apiKeys';

const COLOR_FIELD_KEYS = [
  { key: 'headerColor', labelKey: 'topBarColor' },
  { key: 'tabBarColor', labelKey: 'menuBarColor' },
  { key: 'buttonColor', labelKey: 'buttonColor' },
  { key: 'textColor', labelKey: 'textColor' },
  { key: 'filterSortColor', labelKey: 'filterSortColor' },
];

export default function ShopSettingsModal({
 visible, onClose }) {
  const { ui, styles } = useThemedStyles(createStyles);

  const { t } = useTranslation();
  const { bottom: bottomInset } = useLayoutInsets();
  const theme = useAppTheme();
  const shopName = useStore((s) => s.shopName);
  const fssaiNumber = useStore((s) => s.fssaiNumber);
  const gstinNumber = useStore((s) => s.gstinNumber);
  const storedLanguage = useStore((s) => s.language);
  const storedShowWhatsApp = useStore((s) => s.showWhatsAppInvoiceButtons);
  const storedEnableTables = useStore((s) => s.enableTables);
  const storedEnableWeightBasedPricing = useStore((s) => s.enableWeightBasedPricing);
  const storedEnableVariablePriceItems = useStore((s) => s.enableVariablePriceItems);
  const storedEnableDueOrders = useStore((s) => s.enableDueOrders);
  const storedShopOffer = useStore((s) => s.shopOffer);
  const storedShopWebsite = useStore((s) => s.shopWebsite);
  const storedMenuWebsite = useStore((s) => s.menuWebsite);
  const storedIncludeWebsitesInWhatsApp = useStore((s) => s.includeWebsitesInWhatsApp);
  const storedApiUniqueKey = useStore((s) => s.apiUniqueKey);
  const storedApiAppKey = useStore((s) => s.apiAppKey);
  const storedApiSecretToken = useStore((s) => s.apiSecretToken);
  const storedApiClientToken = useStore((s) => s.apiClientToken);
  const storedUpiQrUri = useStore((s) => s.upiQrUri);
  const updateShopSettings = useStore((s) => s.updateShopSettings);
  const importBackupData = useStore((s) => s.importBackupData);
  const appearanceMode = useStore((s) => s.appearanceMode);
  const setAppearanceMode = useStore((s) => s.setAppearanceMode);
  const isDark = appearanceMode === 'dark';

  const [backupText, setBackupText] = useState('');
  const [showBackupImport, setShowBackupImport] = useState(false);
  const [upiQrUri, setUpiQrUri] = useState('');
  const [pickingUpiQr, setPickingUpiQr] = useState(false);

  const [name, setName] = useState(shopName);
  const [fssai, setFssai] = useState(fssaiNumber);
  const [gstin, setGstin] = useState(gstinNumber);
  const [language, setLanguage] = useState(storedLanguage || 'en');
  const [showWhatsAppInvoiceButtons, setShowWhatsAppInvoiceButtons] = useState(
    storedShowWhatsApp !== false
  );
  const [enableTables, setEnableTables] = useState(storedEnableTables !== false);
  const [enableWeightBasedPricing, setEnableWeightBasedPricing] = useState(
    Boolean(storedEnableWeightBasedPricing)
  );
  const [enableVariablePriceItems, setEnableVariablePriceItems] = useState(
    Boolean(storedEnableVariablePriceItems)
  );
  const [enableDueOrders, setEnableDueOrders] = useState(Boolean(storedEnableDueOrders));
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerName, setOfferName] = useState('');
  const [offerType, setOfferType] = useState('percent');
  const [offerValue, setOfferValue] = useState('');
  const [shopWebsite, setShopWebsite] = useState('');
  const [menuWebsite, setMenuWebsite] = useState('');
  const [includeWebsitesInWhatsApp, setIncludeWebsitesInWhatsApp] = useState(false);
  const [apiUniqueKey, setApiUniqueKey] = useState('');
  const [apiAppKey, setApiAppKey] = useState('');
  const [apiSecretToken, setApiSecretToken] = useState('');
  const [apiClientToken, setApiClientToken] = useState('');
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
      return;
    }
    setName(shopName);
    setFssai(fssaiNumber);
    setGstin(gstinNumber);
    setLanguage(storedLanguage || 'en');
    setShowWhatsAppInvoiceButtons(storedShowWhatsApp !== false);
    setEnableTables(storedEnableTables !== false);
    setEnableWeightBasedPricing(Boolean(storedEnableWeightBasedPricing));
    setEnableVariablePriceItems(Boolean(storedEnableVariablePriceItems));
    setEnableDueOrders(Boolean(storedEnableDueOrders));
    const normalizedOffer = normalizeShopOffer(storedShopOffer);
    setOfferEnabled(normalizedOffer.enabled);
    setOfferName(normalizedOffer.name);
    setOfferType(normalizedOffer.type);
    setOfferValue(normalizedOffer.value > 0 ? String(normalizedOffer.value) : '');
    setShopWebsite(storedShopWebsite || '');
    setMenuWebsite(storedMenuWebsite || '');
    setIncludeWebsitesInWhatsApp(Boolean(storedIncludeWebsitesInWhatsApp));
    setUpiQrUri(storedUpiQrUri || '');
    setApiUniqueKey(storedApiUniqueKey || '');
    setApiAppKey(storedApiAppKey || '');
    setApiSecretToken(storedApiSecretToken || '');
    setApiClientToken(storedApiClientToken || '');
    const resolved = resolveTheme(useStore.getState().theme);
    setPresetId(resolved.presetId);
    setCustomColors({
      buttonColor: resolved.buttonColor,
      textColor: resolved.textColor,
      tabBarColor: resolved.tabBarColor,
      filterSortColor: resolved.filterSortColor,
      headerColor: resolved.headerColor,
    });
  }, [
    visible,
    shopName,
    fssaiNumber,
    gstinNumber,
    storedLanguage,
    storedShowWhatsApp,
    storedEnableTables,
    storedEnableWeightBasedPricing,
    storedEnableVariablePriceItems,
    storedShopOffer,
    storedShopWebsite,
    storedMenuWebsite,
    storedIncludeWebsitesInWhatsApp,
    storedUpiQrUri,
    storedApiUniqueKey,
    storedApiAppKey,
    storedApiSecretToken,
    storedApiClientToken,
  ]);

  const handlePickUpiQr = async () => {
    setPickingUpiQr(true);
    try {
      const result = await pickUpiQrImage();
      if (!result?.success) {
        if (result?.error === 'cancelled') return;
        if (result?.error === 'permission') {
          showAlert(t('validation'), t('upiQrPermission'));
          return;
        }
        if (result?.error === 'too_large') {
          showAlert(t('validation'), t('upiQrTooLarge'));
          return;
        }
        showAlert(t('validation'), t('upiQrPickFailed'));
        return;
      }
      setUpiQrUri(result.uri);
    } catch (error) {
      console.error('UPI QR pick failed:', error);
      showAlert(t('validation'), t('upiQrPickFailed'));
    } finally {
      setPickingUpiQr(false);
    }
  };

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

    const nextApiUnique = normalizeAppUniqueKey(apiUniqueKey);
    const nextApiAppKey = normalizeAppKey(apiAppKey);
    const nextApiSecret = normalizeSecretToken(apiSecretToken);
    const nextApiClient = normalizeClientToken(apiClientToken);
    const anyToken = nextApiAppKey || nextApiSecret || nextApiClient;

    // Unique key alone can be saved while waiting for support tokens.
    // Once any token is entered, all three must match the unique key.
    if (anyToken) {
      const apiCheck = validateApiCredentials({
        appUniqueKey: nextApiUnique,
        appKey: nextApiAppKey,
        secretToken: nextApiSecret,
        clientToken: nextApiClient,
      });
      if (!apiCheck.valid) {
        showAlert(t('validation'), t('apiKeysInvalid'));
        return;
      }
    } else if (nextApiUnique && nextApiUnique.length !== APP_UNIQUE_KEY_LENGTH) {
      showAlert(t('validation'), t('apiUniqueKeyMissing'));
      return;
    }

    const settingsPayload = {
      shopName: name.trim(),
      fssaiNumber: fssai.trim(),
      gstinNumber: gstin.trim(),
      language,
      showWhatsAppInvoiceButtons,
      enableTables,
      enableWeightBasedPricing,
      enableVariablePriceItems,
      enableDueOrders,
      shopWebsite: shopWebsite.trim(),
      menuWebsite: menuWebsite.trim(),
      includeWebsitesInWhatsApp,
      upiQrUri,
      apiUniqueKey: nextApiUnique,
      apiAppKey: nextApiAppKey,
      apiSecretToken: nextApiSecret,
      apiClientToken: nextApiClient,
      shopOffer: nextOffer,
      theme:
        presetId === 'custom'
          ? { presetId: 'custom', ...customColors }
          : { presetId },
    };
    updateShopSettings(settingsPayload);
    showAlert(t('saved'), t('shopSettingsSaved'));
    onClose();
  };

  const handleGenerateAppUniqueKey = () => {
    const createKey = () => {
      const unique = generateAppUniqueKey();
      setApiUniqueKey(unique);
      // Tokens come from support key-generator after customer sends this unique key.
      setApiAppKey('');
      setApiSecretToken('');
      setApiClientToken('');
      showAlert(t('apiUniqueKeyGenerated'), t('apiUniqueKeyGeneratedMsg'));
    };

    if (apiUniqueKey || storedApiAppKey) {
      confirmAction(t('apiUniqueKeyRegenerate'), t('apiUniqueKeyRegenerateMsg'), createKey);
      return;
    }
    createKey();
  };

  const handleCopyAppUniqueKey = async () => {
    const key = normalizeAppUniqueKey(apiUniqueKey);
    if (!key) {
      showAlert(t('validation'), t('apiUniqueKeyMissing'));
      return;
    }
    try {
      await Clipboard.setStringAsync(key);
      showAlert(t('copied'), t('apiUniqueKeyCopied'));
    } catch {
      showAlert(t('validation'), key);
    }
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
        setEnableTables(state.enableTables !== false);
        setEnableWeightBasedPricing(Boolean(state.enableWeightBasedPricing));
        setEnableVariablePriceItems(Boolean(state.enableVariablePriceItems));
        setEnableDueOrders(Boolean(state.enableDueOrders));
        setShopWebsite(state.shopWebsite || '');
        setMenuWebsite(state.menuWebsite || '');
        setIncludeWebsitesInWhatsApp(Boolean(state.includeWebsitesInWhatsApp));
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

  // Snapshot once when the modal opens so keyboard open/close does not
  // resize the sheet and cause flicker while editing fields.
  const sheetHeight = useMemo(
    () => Math.round(Dimensions.get('window').height * 0.92),
    [visible]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <KeyboardAvoidingView
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              maxHeight: sheetHeight,
              paddingBottom: Math.max(16, bottomInset),
              backgroundColor: ui.surface,
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.sheetInner}>
            <View style={[styles.sheetHeader, { borderBottomColor: ui.border }]}>
              <Text style={[styles.title, { color: previewTheme.textColor || ui.textPrimary }]}>
                {t('shopSettings')}
              </Text>
            </View>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
              bounces
            >
            <Text style={styles.label}>{t('shopName')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('shopNamePlaceholder')}
              placeholderTextColor={ui.textMuted}
            />

            <Text style={styles.label}>{t('fssaiNumber')}</Text>
            <TextInput
              style={styles.input}
              value={fssai}
              onChangeText={setFssai}
              placeholder={t('fssaiPlaceholder')}
              placeholderTextColor={ui.textMuted}
              autoCapitalize="characters"
            />
            <Text style={styles.hint}>{t('fssaiHint')}</Text>

            <Text style={styles.label}>{t('gstinNumber')}</Text>
            <TextInput
              style={styles.input}
              value={gstin}
              onChangeText={setGstin}
              placeholder={t('gstinPlaceholder')}
              placeholderTextColor={ui.textMuted}
              autoCapitalize="characters"
            />
            <Text style={styles.hint}>{t('gstinHint')}</Text>

            <Text style={styles.sectionTitle}>{t('websitesSection')}</Text>
            <Text style={styles.hint}>{t('websitesHint')}</Text>
            <Text style={styles.label}>{t('shopWebsite')}</Text>
            <TextInput
              style={styles.input}
              value={shopWebsite}
              onChangeText={setShopWebsite}
              placeholder={t('shopWebsitePlaceholder')}
              placeholderTextColor={ui.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.label}>{t('menuWebsite')}</Text>
            <TextInput
              style={styles.input}
              value={menuWebsite}
              onChangeText={setMenuWebsite}
              placeholder={t('menuWebsitePlaceholder')}
              placeholderTextColor={ui.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('includeWebsitesInWhatsApp')}</Text>
                <Text style={styles.hint}>{t('includeWebsitesInWhatsAppHint')}</Text>
              </View>
              <Switch
                value={includeWebsitesInWhatsApp}
                onValueChange={setIncludeWebsitesInWhatsApp}
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={includeWebsitesInWhatsApp ? previewTheme.buttonColor : ui.surfaceMuted}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: ui.textPrimary }]}>{t('upiQrSection')}</Text>
            <Text style={[styles.hint, { color: ui.textSecondary }]}>{t('upiQrHint')}</Text>
            {upiQrUri ? (
              <View style={[styles.upiPreviewWrap, { borderColor: ui.border }]}>
                <Image source={{ uri: upiQrUri }} style={styles.upiPreview} resizeMode="contain" />
              </View>
            ) : (
              <Text style={[styles.hint, { color: ui.textMuted }]}>{t('upiQrEmpty')}</Text>
            )}
            <View style={styles.upiActions}>
              <TouchableOpacity
                style={[styles.upiBtn, { backgroundColor: previewTheme.buttonColor }]}
                onPress={handlePickUpiQr}
                disabled={pickingUpiQr}
              >
                {pickingUpiQr ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.upiBtnText}>
                    {upiQrUri ? t('upiQrChange') : t('upiQrAdd')}
                  </Text>
                )}
              </TouchableOpacity>
              {upiQrUri ? (
                <TouchableOpacity
                  style={[styles.upiBtnSecondary, { borderColor: ui.border }]}
                  onPress={() => setUpiQrUri('')}
                >
                  <Text style={[styles.upiBtnSecondaryText, { color: ui.textPrimary }]}>
                    {t('upiQrRemove')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={[styles.hint, { color: ui.textSecondary }]}>{t('upiQrWhatsAppNote')}</Text>

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
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={showWhatsAppInvoiceButtons ? previewTheme.buttonColor : ui.surfaceMuted}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('enableDueOrders')}</Text>
                <Text style={styles.hint}>{t('enableDueOrdersHint')}</Text>
              </View>
              <Switch
                value={enableDueOrders}
                onValueChange={setEnableDueOrders}
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={enableDueOrders ? previewTheme.buttonColor : ui.surfaceMuted}
              />
            </View>

            <Text style={styles.sectionTitle}>{t('tables')}</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('enableTables')}</Text>
                <Text style={styles.hint}>{t('enableTablesHint')}</Text>
              </View>
              <Switch
                value={enableTables}
                onValueChange={(value) => {
                  setEnableTables(value);
                  // Apply immediately so hamburger shows/hides Table Booker, Tables, Sync.
                  updateShopSettings({ enableTables: value });
                }}
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={enableTables ? previewTheme.buttonColor : ui.surfaceMuted}
              />
            </View>

            <Text style={styles.sectionTitle}>{t('itemPricingFeatures')}</Text>
            <Text style={styles.hint}>{t('itemPricingFeaturesHint')}</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('enableWeightBasedPricing')}</Text>
                <Text style={styles.hint}>{t('enableWeightBasedPricingHint')}</Text>
              </View>
              <Switch
                value={enableWeightBasedPricing}
                onValueChange={setEnableWeightBasedPricing}
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={enableWeightBasedPricing ? previewTheme.buttonColor : ui.surfaceMuted}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('enableVariablePriceItems')}</Text>
                <Text style={styles.hint}>{t('enableVariablePriceItemsHint')}</Text>
              </View>
              <Switch
                value={enableVariablePriceItems}
                onValueChange={setEnableVariablePriceItems}
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={enableVariablePriceItems ? previewTheme.buttonColor : ui.surfaceMuted}
              />
            </View>

            <Text style={styles.sectionTitle}>{t('apiKeysSection')}</Text>
            <Text style={styles.hint}>{t('apiKeysHint')}</Text>
            <Text style={styles.label}>{t('apiUniqueKey')}</Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={[styles.input, styles.apiKeyInput]}
                value={apiUniqueKey}
                editable={false}
                placeholder={t('apiUniqueKeyPlaceholder')}
                placeholderTextColor={ui.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={APP_UNIQUE_KEY_LENGTH}
              />
              <TouchableOpacity
                style={[styles.apiKeyBtn, { backgroundColor: previewTheme.buttonColor }]}
                onPress={handleGenerateAppUniqueKey}
              >
                <Text style={[styles.apiKeyBtnText, { color: '#fff' }]}>{t('generate')}</Text>
              </TouchableOpacity>
            </View>

            {!apiUniqueKey ? (
              <Text style={styles.hint}>{t('apiKeysNotConfigured')}</Text>
            ) : (
              <>
                <View style={styles.apiKeyRow}>
                  <Text style={[styles.hint, { flex: 1, marginBottom: 0 }]}>
                    {t('apiUniqueKeySendHint')}
                  </Text>
                  <TouchableOpacity style={styles.apiCopyLink} onPress={handleCopyAppUniqueKey}>
                    <Text style={[styles.apiCopyLinkText, { color: previewTheme.buttonColor }]}>
                      {t('copy')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>{t('apiAppKey')}</Text>
                <TextInput
                  style={styles.input}
                  value={apiAppKey}
                  onChangeText={(v) => setApiAppKey(normalizeAppKey(v))}
                  placeholder={t('apiAppKeyPlaceholder')}
                  placeholderTextColor={ui.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={APP_KEY_LENGTH}
                />
                <Text style={styles.label}>{t('apiSecretToken')}</Text>
                <TextInput
                  style={styles.input}
                  value={apiSecretToken}
                  onChangeText={(v) => setApiSecretToken(normalizeSecretToken(v))}
                  placeholder={t('apiSecretTokenPlaceholder')}
                  placeholderTextColor={ui.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  secureTextEntry
                  maxLength={SECRET_TOKEN_LENGTH}
                />
                <Text style={styles.label}>{t('apiClientToken')}</Text>
                <TextInput
                  style={styles.input}
                  value={apiClientToken}
                  onChangeText={(v) => setApiClientToken(normalizeClientToken(v))}
                  placeholder={t('apiClientTokenPlaceholder')}
                  placeholderTextColor={ui.textMuted}
                  keyboardType="number-pad"
                  maxLength={CLIENT_TOKEN_LENGTH}
                />
                {(() => {
                  if (!apiAppKey && !apiSecretToken && !apiClientToken) {
                    return <Text style={styles.hint}>{t('apiTokensAwaitingSupport')}</Text>;
                  }
                  const check = validateApiCredentials({
                    appUniqueKey: apiUniqueKey,
                    appKey: apiAppKey,
                    secretToken: apiSecretToken,
                    clientToken: apiClientToken,
                  });
                  return (
                    <Text
                      style={[
                        styles.hint,
                        { color: check.valid ? '#198754' : '#c92a2a', fontWeight: '600' },
                      ]}
                    >
                      {check.valid ? t('apiKeysValid') : t('apiKeysInvalid')}
                    </Text>
                  );
                })()}
              </>
            )}

            <Text style={styles.sectionTitle}>{t('offersSection')}</Text>
            <Text style={styles.hint}>{t('offersHint')}</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>{t('offerEnabled')}</Text>
              </View>
              <Switch
                value={offerEnabled}
                onValueChange={setOfferEnabled}
                trackColor={{ false: ui.border, true: `${previewTheme.buttonColor}88` }}
                thumbColor={offerEnabled ? previewTheme.buttonColor : ui.surfaceMuted}
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
                  placeholderTextColor={ui.textMuted}
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
                  onChangeText={(value) => setOfferValue(sanitizePriceInput(value))}
                  placeholder={t('offerValuePlaceholder')}
                  placeholderTextColor={ui.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={9}
                />
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { color: ui.textPrimary }]}>{t('appearance')}</Text>
            <Text style={[styles.hint, { color: ui.textSecondary }]}>{t('appearanceHint')}</Text>
            <View
              style={[
                styles.appearanceToggle,
                { backgroundColor: ui.surfaceMuted, borderColor: ui.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.appearanceBtn,
                  !isDark && { backgroundColor: previewTheme.buttonColor || ui.textPrimary },
                ]}
                onPress={() => setAppearanceMode('light')}
              >
                <Text
                  style={[
                    styles.appearanceBtnText,
                    { color: !isDark ? '#fff' : ui.textSecondary },
                  ]}
                >
                  {t('themeLight')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.appearanceBtn,
                  isDark && { backgroundColor: previewTheme.buttonColor || ui.textPrimary },
                ]}
                onPress={() => setAppearanceMode('dark')}
              >
                <Text
                  style={[
                    styles.appearanceBtnText,
                    { color: isDark ? '#fff' : ui.textSecondary },
                  ]}
                >
                  {t('themeDark')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: ui.textPrimary }]}>{t('themeColors')}</Text>
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
                  placeholderTextColor={ui.textMuted}
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(ui) {
  return {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: ui.surface,
    borderTopLeftRadius: ui.radiusXl,
    borderTopRightRadius: ui.radiusXl,
    width: '100%',
    zIndex: 2,
    elevation: 12,
    overflow: 'hidden',
  },
  sheetInner: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHeader: {
    flexShrink: 0,
  },
  scrollBody: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: ui.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: ui.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ui.textPrimary,
    marginTop: 16,
    marginBottom: 10,
  },
  appearanceToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    gap: 2,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  upiPreviewWrap: {
    marginTop: 10,
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    backgroundColor: ui.surfaceMuted,
    overflow: 'hidden',
  },
  upiPreview: {
    width: '100%',
    height: '100%',
  },
  upiActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  upiBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 140,
    alignItems: 'center',
  },
  upiBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  upiBtnSecondary: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  upiBtnSecondaryText: {
    fontWeight: '700',
    fontSize: 14,
  },
  appearanceBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  appearanceBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
    borderColor: ui.border,
    backgroundColor: ui.surface,
  },
  presetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.textSecondary,
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
    borderColor: ui.borderLight,
    backgroundColor: ui.surfaceMuted,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ui.textPrimary,
    marginBottom: 4,
  },
  offerBlock: {
    marginTop: 8,
    gap: 4,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apiKeyInput: {
    flex: 1,
    marginBottom: 0,
  },
  apiKeyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ui.border,
  },
  apiKeyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#343a40',
  },
  apiCopyLink: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  apiCopyLinkText: {
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: ui.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: {
    color: ui.textSecondary,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1,
    borderRadius: ui.radiusMd,
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
    borderRadius: ui.radiusMd,
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
    borderRadius: ui.radiusMd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.surfaceMuted,
  },
  backupBtnSecondaryText: {
    color: ui.textSecondary,
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
    backgroundColor: ui.surfaceMuted,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: ui.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: ui.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
};
}

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import useStore from '../store/store';
import {
  APP_LICENSE_ID,
  LICENSE_KEY_LENGTH,
  generateRenewalCode,
  formatRenewalCodeDateTime,
  formatRenewalCodeExpiry,
} from '../utils/licenseKey';
import { inputStyle, shadow, useThemedStyles } from '../utils/uiTheme';
import { APP_DISPLAY_NAME, APP_LOGO } from '../utils/appBrand';
import { useAppTheme } from '../utils/theme';
import { useTranslation } from '../utils/i18n';
import AppButton from '../components/ui/AppButton';
import ConfirmModal from '../components/ConfirmModal';

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function LoginScreen() {
  const login = useStore((s) => s.login);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { ui, styles } = useThemedStyles(createStyles);
  const [shopName, setShopName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [updatePrompt, setUpdatePrompt] = useState(null);
  const [showRenewalPanel, setShowRenewalPanel] = useState(false);
  const [renewalCode, setRenewalCode] = useState('');
  const [renewalIssuedAt, setRenewalIssuedAt] = useState(null);
  const [renewalExpiresAt, setRenewalExpiresAt] = useState(null);
  const [countdownMs, setCountdownMs] = useState(0);
  const [renewalError, setRenewalError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [devicePrompt, setDevicePrompt] = useState(false);

  const renewalActive = Boolean(renewalCode && renewalExpiresAt && countdownMs > 0);

  useEffect(() => {
    if (!renewalExpiresAt) return undefined;
    const tick = () => {
      const remaining = renewalExpiresAt - Date.now();
      setCountdownMs(Math.max(0, remaining));
      if (remaining <= 0) {
        setRenewalCode('');
        setRenewalIssuedAt(null);
        setRenewalExpiresAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [renewalExpiresAt]);

  const openDownload = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open the download link.');
    }
  };

  const handleLogin = async (logoutOtherDevices = false) => {
    setError('');
    setUpdatePrompt(null);
    if (!logoutOtherDevices) setDevicePrompt(false);

    if (!shopName.trim()) {
      setError('Please enter your shop or POS name.');
      return;
    }

    if (licenseKey.trim().length !== LICENSE_KEY_LENGTH) {
      setError(`License key must be exactly ${LICENSE_KEY_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    try {
      const result = await login(shopName, licenseKey, { logoutOtherDevices });
      if (!result.success) {
        if (result.reason === 'already_logged_in') {
          setDevicePrompt(true);
          setError('');
          return;
        }
        setError(result.error);
        if (result.reason === 'expired') {
          setShowRenewalPanel(true);
        }
        if (result.reason === 'force_update') {
          setUpdatePrompt({
            required: true,
            message: result.error,
            downloadUrl: result.downloadUrl,
          });
        }
        return;
      }
      setDevicePrompt(false);

      if (result.updateAvailable) {
        setUpdatePrompt({
          required: false,
          message: result.updateMessage || 'A newer NAM bill app is available.',
          downloadUrl: result.downloadUrl,
        });
      }
    } catch {
      setError('Could not verify this license. Check your internet and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleKeyChange = (text) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, LICENSE_KEY_LENGTH);
    setLicenseKey(cleaned);
  };

  const handleGenerateRenewalCode = () => {
    setRenewalError('');
    setShowRenewalPanel(true);

    if (!shopName.trim()) {
      setRenewalError('Enter your shop name first — it must match when renewing.');
      return;
    }

    const result = generateRenewalCode(shopName);
    if (!result.success) {
      setRenewalError(result.error);
      return;
    }

    setRenewalCode(result.code);
    setRenewalIssuedAt(result.issuedAt);
    setRenewalExpiresAt(result.expiresAt);
    setCountdownMs(Math.max(0, result.expiresAt - Date.now()));
    setCodeCopied(false);
  };

  const handleCopyRenewalCode = async () => {
    if (!renewalCode) return;

    try {
      await Clipboard.setStringAsync(renewalCode);
      setCodeCopied(true);
      setRenewalError('');
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setRenewalError('Could not copy code.');
    }
  };

  const handleShareRenewalCode = async () => {
    if (!renewalCode) return;
    try {
      await Share.share({
        message: `${APP_DISPLAY_NAME} renewal code for "${shopName.trim()}": ${renewalCode}\nValid ~45 min. App: ${APP_LICENSE_ID}`,
      });
    } catch {
      // user cancelled
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <Image
              source={APP_LOGO}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel={APP_DISPLAY_NAME}
            />
          </View>
          <Text style={styles.brand}>{APP_DISPLAY_NAME}</Text>
          <Text style={styles.subtitle}>Enter your shop details and license key to continue</Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Shop / POS Name</Text>
            <TextInput
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
              placeholder="e.g. Riye Cafe"
              placeholderTextColor={ui.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>License Key (20 characters)</Text>
            <TextInput
              style={[styles.input, styles.keyInput]}
              value={licenseKey}
              onChangeText={handleKeyChange}
              placeholder="Enter your 20-digit key"
              placeholderTextColor={ui.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={LICENSE_KEY_LENGTH}
            />
            <Text style={styles.keyCounter}>
              {licenseKey.length}/{LICENSE_KEY_LENGTH}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {updatePrompt ? (
              <View style={styles.updateBox}>
                <Text style={styles.updateTitle}>
                  {updatePrompt.required ? 'App update required' : 'New app available'}
                </Text>
                <Text style={styles.updateText}>{updatePrompt.message}</Text>
                {updatePrompt.downloadUrl ? (
                  <AppButton
                    title="Download latest app"
                    onPress={() => openDownload(updatePrompt.downloadUrl)}
                    color={theme.buttonColor}
                    variant="secondary"
                    style={{ backgroundColor: ui.surfaceMuted, marginTop: 8 }}
                  />
                ) : null}
              </View>
            ) : null}

            <AppButton
              title="Login"
              onPress={() => handleLogin(false)}
              color={theme.buttonColor}
              disabled={busy}
              loading={busy}
            />
          </View>

          {(showRenewalPanel || renewalActive) && (
            <View style={styles.renewalPanel}>
              <Text style={styles.renewalTitle}>License expired — renewal code</Text>
              <Text style={styles.renewalHelp}>
                Generate a 10-digit code and send it to the app owner. It includes the date and
                time and stays valid for 45 minutes. Only works for {APP_DISPLAY_NAME}.
              </Text>

              {renewalError ? <Text style={styles.renewalError}>{renewalError}</Text> : null}

              {renewalActive ? (
                <View>
                  <Text style={styles.renewalCodeLabel}>Your code</Text>
                  <View style={styles.renewalCodeRow}>
                    <Text style={styles.renewalCode}>{renewalCode}</Text>
                    <TouchableOpacity style={styles.copyCodeBtn} onPress={handleCopyRenewalCode}>
                      <Ionicons
                        name={codeCopied ? 'checkmark-circle' : 'copy-outline'}
                        size={22}
                        color={theme.buttonColor}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.renewalMeta}>
                    Issued{' '}
                    {formatRenewalCodeDateTime(renewalCode, renewalIssuedAt || Date.now())} · Expires{' '}
                    {formatRenewalCodeExpiry(renewalExpiresAt)} · {formatCountdown(countdownMs)} left
                  </Text>
                  <TouchableOpacity style={styles.shareRenewalBtn} onPress={handleShareRenewalCode}>
                    <Text style={styles.shareRenewalText}>Share code</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <AppButton
                  title="Generate renewal code"
                  onPress={handleGenerateRenewalCode}
                  color={theme.buttonColor}
                  variant="secondary"
                  style={{ backgroundColor: ui.surfaceMuted }}
                />
              )}
            </View>
          )}

          {!showRenewalPanel && !renewalActive ? (
            <TouchableOpacity style={styles.expiredLinkBtn} onPress={() => setShowRenewalPanel(true)}>
              <Text style={[styles.expiredLinkText, { color: theme.buttonColor }]}>
                License expired? Get renewal code
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.footer}>
            License keys are issued by your provider. Renewal codes are app-locked to {APP_DISPLAY_NAME} only.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmModal
        visible={devicePrompt}
        title={t('logoutAllDevicesTitle')}
        message={t('logoutAllDevicesMessage')}
        confirmLabel={t('logoutAllDevicesConfirm')}
        cancelLabel={t('cancel')}
        onConfirm={() => handleLogin(true)}
        onCancel={() => setDevicePrompt(false)}
      />
    </SafeAreaView>
  );
}

function createStyles(ui) {
  return {
    safe: { flex: 1, backgroundColor: ui.bg },
    flex: { flex: 1 },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      paddingBottom: 40,
    },
    logoWrap: {
      alignSelf: 'center',
      marginBottom: 8,
    },
    logoImage: {
      width: 120,
      height: 120,
      borderRadius: ui.radiusLg,
    },
    brand: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: ui.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: ui.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 21,
    },
    formCard: {
      backgroundColor: ui.surface,
      borderRadius: ui.radiusLg,
      borderWidth: 1,
      borderColor: ui.border,
      padding: 20,
      ...shadow('xs'),
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: ui.textSecondary,
      marginBottom: 8,
    },
    input: {
      ...inputStyle(ui, {
        marginBottom: 14,
      }),
    },
    keyInput: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      letterSpacing: 2,
    },
    keyCounter: {
      fontSize: 12,
      color: ui.textMuted,
      textAlign: 'right',
      marginTop: -10,
      marginBottom: 16,
    },
    error: {
      color: ui.danger,
      fontSize: 14,
      marginBottom: 16,
      lineHeight: 20,
    },
    updateBox: {
      marginBottom: 16,
      padding: 12,
      borderRadius: ui.radiusMd,
      backgroundColor: ui.surfaceMuted,
      borderWidth: 1,
      borderColor: ui.border,
    },
    updateTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: ui.textPrimary,
      marginBottom: 6,
    },
    updateText: {
      fontSize: 13,
      color: ui.textSecondary,
      lineHeight: 19,
    },
    renewalPanel: {
      marginTop: 20,
      padding: 16,
      borderRadius: ui.radiusLg,
      backgroundColor: ui.surface,
      borderWidth: 1,
      borderColor: ui.border,
      ...shadow('xs'),
    },
    renewalTitle: {
      color: ui.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 8,
    },
    renewalHelp: {
      color: ui.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 14,
    },
    renewalError: {
      color: ui.danger,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 12,
    },
    renewalCodeLabel: {
      color: ui.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    renewalCodeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    renewalCode: {
      color: ui.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    copyCodeBtn: {
      marginLeft: 10,
      padding: 8,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    renewalMeta: {
      color: ui.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 4,
      textAlign: 'center',
    },
    shareRenewalBtn: {
      backgroundColor: ui.brandWhatsApp,
      borderRadius: ui.radiusMd,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 12,
      minHeight: 48,
      justifyContent: 'center',
    },
    shareRenewalText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    expiredLinkBtn: {
      marginTop: 14,
      paddingVertical: 10,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    expiredLinkText: {
      fontSize: 13,
      fontWeight: '600',
    },
    footer: {
      fontSize: 12,
      color: ui.textSecondary,
      textAlign: 'center',
      marginTop: 24,
      lineHeight: 18,
    },
  };
}

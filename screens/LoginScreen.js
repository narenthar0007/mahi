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
import { UI, inputStyle, shadow } from '../utils/uiTheme';
import { APP_DISPLAY_NAME, APP_LOGO } from '../utils/appBrand';

function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function LoginScreen() {
  const login = useStore((s) => s.login);
  const [shopName, setShopName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [showRenewalPanel, setShowRenewalPanel] = useState(false);
  const [renewalCode, setRenewalCode] = useState('');
  const [renewalIssuedAt, setRenewalIssuedAt] = useState(null);
  const [renewalExpiresAt, setRenewalExpiresAt] = useState(null);
  const [countdownMs, setCountdownMs] = useState(0);
  const [renewalError, setRenewalError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

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

  const handleLogin = () => {
    setError('');

    if (!shopName.trim()) {
      setError('Please enter your shop or POS name.');
      return;
    }

    if (licenseKey.trim().length !== LICENSE_KEY_LENGTH) {
      setError(`License key must be exactly ${LICENSE_KEY_LENGTH} characters.`);
      return;
    }

    const result = login(shopName, licenseKey);
    if (!result.success) {
      setError(result.error);
      if (result.reason === 'expired') {
        setShowRenewalPanel(true);
      }
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
      setRenewalError('Could not copy code. Please write it down manually.');
    }
  };

  const handleShareRenewalCode = async () => {
    if (!renewalCode) return;

    const message = [
      `${APP_DISPLAY_NAME} — License renewal request`,
      `Shop: ${shopName.trim()}`,
      `Renewal code: ${renewalCode}`,
      `Code time: ${formatRenewalCodeDateTime(renewalCode, renewalIssuedAt || Date.now())}`,
      `Valid until: ${formatRenewalCodeExpiry(renewalExpiresAt)}`,
      `App ID: ${APP_LICENSE_ID}`,
    ].join('\n');

    try {
      await Share.share({ message, title: 'License renewal code' });
    } catch (shareError) {
      if (shareError?.message !== 'User did not share') {
        setRenewalError('Could not open share sheet. Copy the code shown above and send it manually.');
      }
    }
  };

  const renewalExpired = Boolean(renewalExpiresAt && countdownMs <= 0);
  const renewalActive = Boolean(renewalCode && renewalExpiresAt && countdownMs > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <Image source={APP_LOGO} style={styles.logoImage} resizeMode="contain" accessibilityLabel={APP_DISPLAY_NAME} />
          </View>
          <Text style={styles.subtitle}>Enter your shop details and license key to continue</Text>

          <View style={styles.formCard}>
          <Text style={styles.label}>Shop / POS Name</Text>
          <TextInput
            style={styles.input}
            value={shopName}
            onChangeText={setShopName}
            placeholder="e.g. Riye Cafe"
            placeholderTextColor="#adb5bd"
            autoCapitalize="words"
          />

          <Text style={styles.label}>License Key (20 characters)</Text>
          <TextInput
            style={[styles.input, styles.keyInput]}
            value={licenseKey}
            onChangeText={handleKeyChange}
            placeholder="Enter your 20-digit key"
            placeholderTextColor="#adb5bd"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={LICENSE_KEY_LENGTH}
          />
          <Text style={styles.keyCounter}>
            {licenseKey.length}/{LICENSE_KEY_LENGTH}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
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
                <>
                  <Text style={styles.renewalCodeLabel}>Your 10-digit code</Text>
                  <View style={styles.renewalCodeRow}>
                    <Text style={styles.renewalCode}>{renewalCode}</Text>
                    <TouchableOpacity
                      style={styles.copyCodeBtn}
                      onPress={handleCopyRenewalCode}
                      accessibilityLabel="Copy renewal code"
                    >
                      <Ionicons
                        name={codeCopied ? 'checkmark' : 'copy-outline'}
                        size={24}
                        color={codeCopied ? '#25D366' : '#2DD4BF'}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.renewalMeta}>
                    Code time:{' '}
                    {formatRenewalCodeDateTime(renewalCode, renewalIssuedAt || Date.now())}
                  </Text>
                  <Text style={styles.renewalMeta}>
                    Expires: {formatRenewalCodeExpiry(renewalExpiresAt)} ({formatCountdown(countdownMs)}{' '}
                    left)
                  </Text>
                  <Text style={styles.renewalMeta}>
                    Format: MMDDHHMM + check digits · Shop: {shopName.trim()}
                  </Text>
                  <TouchableOpacity style={styles.shareRenewalBtn} onPress={handleShareRenewalCode}>
                    <Text style={styles.shareRenewalText}>Send code to owner</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.generateRenewalBtn} onPress={handleGenerateRenewalCode}>
                  <Text style={styles.generateRenewalText}>Generate 10-digit renewal code</Text>
                </TouchableOpacity>
              )}

              {renewalExpired && showRenewalPanel && !renewalActive ? (
                <TouchableOpacity style={styles.generateRenewalBtn} onPress={handleGenerateRenewalCode}>
                  <Text style={styles.generateRenewalText}>Generate new code</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {!showRenewalPanel && !renewalActive ? (
            <TouchableOpacity style={styles.expiredLinkBtn} onPress={() => setShowRenewalPanel(true)}>
              <Text style={styles.expiredLinkText}>License expired? Get renewal code</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.footer}>
            License keys are issued by your provider. Renewal codes are app-locked to {APP_DISPLAY_NAME} only.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 220,
    height: 220,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  input: {
    ...inputStyle({
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.1)',
      color: '#fff',
      paddingVertical: 14,
      marginBottom: 14,
    }),
  },
  keyInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  keyCounter: {
    fontSize: 12,
    color: '#8d99ae',
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 16,
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  loginBtn: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loginText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  renewalPanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#0f3460',
    ...shadow('lg'),
  },
  renewalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  renewalHelp: {
    color: '#8d99ae',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  renewalError: {
    color: '#ff6b6b',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  renewalCodeLabel: {
    color: '#ced4da',
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
    color: '#fbbf24',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyCodeBtn: {
    marginLeft: 10,
    padding: 8,
  },
  renewalMeta: {
    color: '#adb5bd',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  generateRenewalBtn: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  generateRenewalText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  shareRenewalBtn: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  shareRenewalText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  expiredLinkBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  expiredLinkText: {
    color: '#2DD4BF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});

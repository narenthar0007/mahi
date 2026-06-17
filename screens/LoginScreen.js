import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store/store';
import { LICENSE_KEY_LENGTH } from '../utils/licenseKey';

export default function LoginScreen() {
  const login = useStore((s) => s.login);
  const resetStorage = useStore((s) => s.resetStorage);
  const [shopName, setShopName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');

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
    }
  };

  const handleKeyChange = (text) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, LICENSE_KEY_LENGTH);
    setLicenseKey(cleaned);
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset app data?',
      'This clears saved orders, menu items, and login. Use this if the app keeps crashing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await useStore.persist.clearStorage();
            resetStorage();
            setShopName('');
            setLicenseKey('');
            setError('');
            Alert.alert('Done', 'App data cleared. Log in again with a new key.');
          },
        },
      ]
    );
  };

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
          <Text style={styles.logo}>G</Text>
          <Text style={styles.title}>GEET app</Text>
          <Text style={styles.subtitle}>Enter your shop details and license key to continue</Text>

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

          <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
            <Text style={styles.resetText}>Reset app data (fix crashes)</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            License keys are issued by your provider. Expired keys cannot access the app.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a2e' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: '#2DD4BF',
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8d99ae',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ced4da',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
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
    backgroundColor: '#e94560',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
